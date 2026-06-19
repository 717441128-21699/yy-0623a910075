import { Router, type Request, type Response } from 'express'
import {
  orders,
  clinics,
  products,
  purchaseHistory,
  reminders,
  giftPolicies,
  followUps,
  genOrderId,
  randomUUID,
  type Order,
  type OrderItem,
} from '../data/store.js'

const router = Router()

router.get('/', (req: Request, res: Response): void => {
  const { clinic_id } = req.query
  let result = [...orders]

  if (clinic_id && typeof clinic_id === 'string') {
    result = result.filter((o) => o.clinic_id === clinic_id)
  }

  res.json({ success: true, data: result })
})

router.get('/:id', (req: Request, res: Response): void => {
  const order = orders.find((o) => o.id === req.params.id)
  if (!order) {
    res.status(404).json({ success: false, error: '订单不存在' })
    return
  }
  res.json({ success: true, data: order })
})

router.post('/', (req: Request, res: Response): void => {
  const {
    clinic_id,
    items,
    delivery_method,
    backorder_note,
    payment_due_days = 30,
    from_reminder_id,
    operator = '李明',
  } = req.body as {
    clinic_id: string
    items: { product_id: string; quantity: number }[]
    delivery_method?: 'logistics' | 'local_delivery' | 'self_pickup'
    backorder_note?: string
    payment_due_days?: number
    from_reminder_id?: string
    operator?: string
  }

  const clinic = clinics.find((c) => c.id === clinic_id)
  if (!clinic) {
    res.status(400).json({ success: false, error: '诊所不存在' })
    return
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    res.status(400).json({ success: false, error: '订单必须包含至少一项商品' })
    return
  }

  for (const item of items) {
    if (!Number.isFinite(item.quantity) || item.quantity <= 0 || !Number.isInteger(item.quantity)) {
      res.status(400).json({
        success: false,
        error: `商品数量必须为正整数，产品 ${item.product_id} 的数量非法`,
      })
      return
    }
  }

  // 库存校验 + 计算欠货
  const backorderItems: { product_name: string; shortage: number; unit: string }[] = []
  for (const item of items) {
    const product = products.find((p) => p.id === item.product_id)
    if (!product) {
      res.status(400).json({ success: false, error: `产品 ${item.product_id} 不存在` })
      return
    }
    if (item.quantity > product.stock) {
      const shortage = item.quantity - product.stock
      backorderItems.push({ product_name: product.name, shortage, unit: product.unit })
    }
  }

  const orderItems: OrderItem[] = []
  let totalAmount = 0

  for (const item of items) {
    const product = products.find((p) => p.id === item.product_id)!

    const subtotal = +(product.price * item.quantity * (1 + product.tax_rate)).toFixed(2)
    totalAmount += subtotal

    orderItems.push({
      id: randomUUID(),
      order_id: '',
      product_id: product.id,
      product_name: product.name,
      brand: product.brand,
      spec: product.spec,
      unit: product.unit,
      quantity: item.quantity,
      price: product.price,
      tax_rate: product.tax_rate,
      subtotal,
      gifted: false,
    })

    const giftPolicy = giftPolicies.find((gp) => gp.product_id === product.id)
    if (giftPolicy && item.quantity >= giftPolicy.threshold) {
      const giftProduct = products.find((p) => p.id === giftPolicy.gift_product_id)
      if (giftProduct) {
        const giftQty = Math.floor(item.quantity / giftPolicy.threshold) * giftPolicy.gift_quantity
        orderItems.push({
          id: randomUUID(),
          order_id: '',
          product_id: giftProduct.id,
          product_name: giftProduct.name,
          brand: giftProduct.brand,
          spec: giftProduct.spec,
          unit: giftProduct.unit,
          quantity: giftQty,
          price: 0,
          tax_rate: giftProduct.tax_rate,
          subtotal: 0,
          gifted: true,
        })
      }
    }
  }

  const orderId = genOrderId()
  for (const oi of orderItems) {
    oi.order_id = orderId
  }

  const dueDate = new Date()
  dueDate.setDate(dueDate.getDate() + payment_due_days)

  // 合并欠货说明
  let finalBackorderNote = backorder_note || ''
  if (backorderItems.length > 0) {
    const autoNote = backorderItems
      .map((b) => `${b.product_name}欠货${b.shortage}${b.unit}`)
      .join('；')
    finalBackorderNote = finalBackorderNote
      ? `${finalBackorderNote}；${autoNote}`
      : autoNote
  }

  const order: Order = {
    id: orderId,
    clinic_id: clinic.id,
    clinic_name: clinic.name,
    status: backorderItems.length > 0 ? 'partial' : 'pending',
    total_amount: +totalAmount.toFixed(2),
    created_at: new Date().toISOString(),
    items: orderItems,
    delivery_method,
    backorder_note: finalBackorderNote,
    payment_due_days,
    payment_due_date: dueDate.toISOString().split('T')[0],
  }

  orders.push(order)

  // 扣减库存
  for (const item of items) {
    const product = products.find((p) => p.id === item.product_id)!
    product.stock = Math.max(0, product.stock - item.quantity)
  }

  // 写入采购历史
  for (const item of items) {
    purchaseHistory.push({
      id: randomUUID(),
      clinic_id: clinic.id,
      product_id: item.product_id,
      quantity: item.quantity,
      purchased_at: new Date().toISOString().split('T')[0],
    })
  }

  // 自动完成关联提醒
  const completedReminderIds: string[] = []
  if (from_reminder_id) {
    const reminder = reminders.find((r) => r.id === from_reminder_id)
    if (reminder && reminder.status === 'pending') {
      reminder.status = 'done'
      reminder.order_id = orderId
      completedReminderIds.push(reminder.id)
    }
  }
  // 同时匹配同诊所同产品的所有待处理提醒
  for (const item of items) {
    for (const r of reminders) {
      if (
        r.clinic_id === clinic.id &&
        r.product_id === item.product_id &&
        r.status === 'pending' &&
        !completedReminderIds.includes(r.id)
      ) {
        r.status = 'done'
        r.order_id = orderId
        completedReminderIds.push(r.id)
      }
    }
  }

  // 自动生成高频品项补货提醒（30天后）
  const highFreqProductIds = new Set([
    'prod-029',
    'prod-016',
    'prod-021',
    'prod-022',
    'prod-030',
    'prod-031',
  ])
  for (const item of items) {
    if (highFreqProductIds.has(item.product_id)) {
      const product = products.find((p) => p.id === item.product_id)!
      const remindDate = new Date()
      remindDate.setDate(remindDate.getDate() + 30)
      reminders.push({
        id: randomUUID(),
        clinic_id: clinic.id,
        clinic_name: clinic.name,
        product_id: product.id,
        product_name: product.name,
        remind_at: remindDate.toISOString().split('T')[0],
        status: 'pending',
        message: `${product.name}预计30天后需要补货，建议补货${Math.ceil(item.quantity * 0.8)}${product.unit}`,
        suggested_quantity: Math.ceil(item.quantity * 0.8),
      })
    }
  }

  // 自动生成跟进记录
  const paidItemsSummary = order.items
    .filter((i) => !i.gifted)
    .map((i) => `${i.product_name}${i.quantity}${i.unit}`)
    .join(' + ')
  followUps.push({
    id: randomUUID(),
    clinic_id: clinic.id,
    type: 'order',
    title: '订单创建',
    content: `${paidItemsSummary}，合计¥${order.total_amount.toFixed(2)}`,
    created_at: new Date().toISOString(),
    related_order_id: orderId,
    operator,
  })

  res.status(201).json({
    success: true,
    data: {
      ...order,
      backorder_items: backorderItems,
      completed_reminder_ids: completedReminderIds,
    },
  })
})

router.post('/:id/confirm', (req: Request, res: Response): void => {
  const order = orders.find((o) => o.id === req.params.id)
  if (!order) {
    res.status(404).json({ success: false, error: '订单不存在' })
    return
  }

  const {
    delivery_method,
    backorder_note,
    payment_due_days,
    version = 'customer',
  } = req.body as {
    delivery_method?: 'logistics' | 'local_delivery' | 'self_pickup'
    backorder_note?: string
    payment_due_days?: number
    version?: 'customer' | 'internal'
  }

  const effectiveDelivery = delivery_method || order.delivery_method
  const effectiveBackorder = backorder_note ?? order.backorder_note
  const effectiveDueDays = payment_due_days || order.payment_due_days || 30

  let effectiveDueDate = order.payment_due_date
  if (payment_due_days && payment_due_days !== order.payment_due_days) {
    const d = new Date(order.created_at)
    d.setDate(d.getDate() + payment_due_days)
    effectiveDueDate = d.toISOString().split('T')[0]
  }

  const deliveryLabel: Record<string, string> = {
    logistics: '物流配送',
    local_delivery: '同城送货',
    self_pickup: '自提',
  }

  const clinic = clinics.find((c) => c.id === order.clinic_id)
  const divider = '═'.repeat(50)
  const thinDivider = '─'.repeat(50)

  let text = ''

  if (version === 'internal') {
    // ========== 内部版 ==========
    text += `${divider}\n`
    text += `       订 货 确 认 单（内部版）\n`
    text += `${divider}\n\n`
    text += `订单编号：${order.id}\n`
    text += `诊所名称：${order.clinic_name}\n`
    if (clinic) {
      text += `联系地址：${clinic.address}\n`
      text += `联 系 人：${clinic.contact}\n`
      text += `联系电话：${clinic.phone}\n`
    }
    text += `下单时间：${new Date(order.created_at).toLocaleString('zh-CN')}\n`
    text += `订单状态：${order.status === 'pending' ? '待确认' : order.status === 'partial' ? '部分发货' : '已完成'}\n\n`

    text += `${thinDivider}\n`
    text += `商品明细：\n`
    text += `${thinDivider}\n`

    let idx = 1
    let subtotalSum = 0
    let taxSum = 0
    for (const item of order.items) {
      const giftTag = item.gifted ? '【赠品】' : ''
      const profitTag = !item.gifted
        ? `（毛利约¥${(item.price * item.quantity * 0.2).toFixed(2)}）`
        : ''
      text += `\n${idx}. ${item.product_name} ${giftTag}\n`
      text += `   品牌：${item.brand}  规格：${item.spec}\n`
      text += `   数量：${item.quantity}${item.unit}  单价：¥${item.price.toFixed(2)}  税率：${(item.tax_rate * 100).toFixed(0)}%\n`
      text += `   小计：¥${item.subtotal.toFixed(2)} ${profitTag}\n`
      if (!item.gifted) {
        subtotalSum += item.price * item.quantity
        taxSum += item.subtotal - item.price * item.quantity
      }
      idx++
    }

    const estimatedProfit = +(subtotalSum * 0.2).toFixed(2)

    text += `\n${thinDivider}\n`
    text += `商品小计：¥${subtotalSum.toFixed(2)}\n`
    text += `税额：¥${taxSum.toFixed(2)}\n`
    text += `合计金额：¥${order.total_amount.toFixed(2)}\n`
    text += `预估毛利：¥${estimatedProfit}（约20%）\n\n`
    text += `配送方式：${deliveryLabel[effectiveDelivery || 'logistics'] || '物流配送'}\n`

    if (effectiveBackorder && effectiveBackorder.trim()) {
      text += `欠货说明：${effectiveBackorder.trim()}\n`
    }
    text += `付款期限：下单后${effectiveDueDays}天\n`
    text += `到期日期：${effectiveDueDate}\n`
    text += `${divider}\n`
    text += ` 内部文档 请勿外传 | 请及时跟进订单状态\n`
    text += `${divider}\n`
  } else {
    // ========== 客户版（简洁） ==========
    text += `${divider}\n`
    text += `          订 货 确 认 单\n`
    text += `${divider}\n\n`
    text += `尊敬的${order.clinic_name}：\n`
    text += `感谢您的订购，以下是您的订货明细：\n\n`

    text += `订单编号：${order.id}\n`
    text += `下单时间：${new Date(order.created_at).toLocaleDateString('zh-CN')}\n\n`

    text += `${thinDivider}\n`
    text += `商品清单\n`
    text += `${thinDivider}\n`

    const regularItems = order.items.filter((i) => !i.gifted)
    const giftItems = order.items.filter((i) => i.gifted)

    for (let i = 0; i < regularItems.length; i++) {
      const item = regularItems[i]
      text += `\n${i + 1}. ${item.product_name}\n`
      text += `   规格：${item.spec}  数量：${item.quantity}${item.unit}\n`
      text += `   单价：¥${item.price.toFixed(2)}  小计：¥${item.subtotal.toFixed(2)}\n`
    }

    if (giftItems.length > 0) {
      text += `\n★ 赠品：\n`
      for (const g of giftItems) {
        text += `   · ${g.product_name} × ${g.quantity}${g.unit}\n`
      }
    }

    text += `\n${thinDivider}\n`
    text += `合计金额：¥${order.total_amount.toFixed(2)}（含税）\n\n`
    text += `配送方式：${deliveryLabel[effectiveDelivery || 'logistics'] || '物流配送'}\n`
    text += `付款期限：下单后${effectiveDueDays}天\n`
    text += `到期日期：${effectiveDueDate}\n\n`
    text += `${divider}\n`
    text += `  如有疑问请及时联系，祝工作顺利！\n`
    text += `${divider}\n`
  }

  res.json({ success: true, data: { confirmation_text: text } })
})

export default router
