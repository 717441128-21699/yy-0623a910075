import { Router, type Request, type Response } from 'express'
import {
  orders,
  clinics,
  products,
  purchaseHistory,
  reminders,
  giftPolicies,
  followUps,
  shipments,
  genOrderId,
  randomUUID,
  type Order,
  type OrderItem,
  type Shipment,
  type ShipmentItem,
} from '../data/store.js'

const router = Router()

router.get('/', (req: Request, res: Response): void => {
  const { clinic_id } = req.query
  let result = [...orders]

  if (clinic_id && typeof clinic_id === 'string') {
    result = result.filter((o) => o.clinic_id === clinic_id)
  }

  // 给每个订单附带发货进度统计
  const enriched = result.map((o) => {
    const orderShipments = shipments.filter((s) => s.order_id === o.id)
    const shippedMap: Record<string, number> = {}
    for (const s of orderShipments) {
      for (const si of s.items) {
        shippedMap[si.product_id] = (shippedMap[si.product_id] || 0) + si.shipped_quantity
      }
    }
    let totalOrderedQty = 0
    let totalShippedQty = 0
    const backorderItems: { product_id: string; product_name: string; quantity: number; shipped: number; backorder: number; unit: string }[] = []
    for (const item of o.items) {
      if (item.gifted) continue
      totalOrderedQty += item.quantity
      const shipped = shippedMap[item.product_id] || 0
      totalShippedQty += shipped
      const back = item.quantity - shipped
      if (back > 0) {
        backorderItems.push({
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: item.quantity,
          shipped,
          backorder: back,
          unit: item.unit,
        })
      }
    }
    const latestShipment = orderShipments.length > 0
      ? orderShipments.reduce((a, b) => (new Date(a.created_at) > new Date(b.created_at) ? a : b))
      : null
    return {
      ...o,
      shipments: orderShipments,
      total_ordered_qty: totalOrderedQty,
      total_shipped_qty: totalShippedQty,
      shipment_progress_pct: totalOrderedQty > 0 ? Math.round((totalShippedQty / totalOrderedQty) * 100) : 0,
      backorder_items: backorderItems,
      latest_tracking_no: latestShipment?.tracking_no,
      latest_carrier: latestShipment?.carrier,
      latest_expected_arrival: latestShipment?.expected_arrival || o.expected_arrival,
    }
  })

  res.json({ success: true, data: enriched })
})

router.get('/:id', (req: Request, res: Response): void => {
  const order = orders.find((o) => o.id === req.params.id)
  if (!order) {
    res.status(404).json({ success: false, error: '订单不存在' })
    return
  }

  const orderShipments = shipments.filter((s) => s.order_id === order.id).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )
  const shippedMap: Record<string, number> = {}
  for (const s of orderShipments) {
    for (const si of s.items) {
      shippedMap[si.product_id] = (shippedMap[si.product_id] || 0) + si.shipped_quantity
    }
  }

  const itemsWithShip = order.items.map((item) => {
    const shipped = shippedMap[item.product_id] || 0
    return {
      ...item,
      shipped_quantity: shipped,
      backorder_quantity: item.gifted ? 0 : Math.max(0, item.quantity - shipped),
    }
  })

  res.json({
    success: true,
    data: {
      ...order,
      shipments: orderShipments,
      items: itemsWithShip,
      expected_arrival: order.expected_arrival,
    },
  })
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
    if (effectiveBackorder && effectiveBackorder.trim()) {
      text += `发货说明：\n`
      const backorderEntries = effectiveBackorder.trim().split(/[；;]/).filter(s => s.trim())
      for (const entry of backorderEntries) {
        const cleaned = entry.replace(/欠货/g, '').trim()
        if (cleaned) {
          text += `  · ${cleaned} 稍后补发\n`
        }
      }
      text += `  （有库存商品将优先发出）\n`
    }
    text += `付款期限：下单后${effectiveDueDays}天\n`
    text += `到期日期：${effectiveDueDate}\n\n`
    text += `${divider}\n`
    text += `  如有疑问请及时联系，祝工作顺利！\n`
    text += `${divider}\n`
  }

  // 自动生成报价类型的跟进记录
  const existingQuoteCount = followUps.filter(
    (f) => f.related_order_id === order.id && f.type === 'quote'
  ).length
  if (existingQuoteCount === 0) {
    const versionLabel = version === 'internal' ? '（内部版）' : ''
    followUps.push({
      id: randomUUID(),
      clinic_id: order.clinic_id,
      type: 'quote',
      title: `生成报价确认单${versionLabel}`,
      content: `配送：${deliveryLabel[effectiveDelivery || 'logistics'] || '物流配送'}；付款期限：下单后${effectiveDueDays}天；到期：${effectiveDueDate}${
        effectiveBackorder?.trim() ? `；欠货：${effectiveBackorder.trim()}` : ''
      }`,
      created_at: new Date().toISOString(),
      related_order_id: order.id,
      operator: '李明',
    })
  }

  res.json({ success: true, data: { confirmation_text: text } })
})

// 新增发货记录
router.post('/:id/ship', (req: Request, res: Response): void => {
  const order = orders.find((o) => o.id === req.params.id)
  if (!order) {
    res.status(404).json({ success: false, error: '订单不存在' })
    return
  }

  const {
    items,
    tracking_no,
    carrier,
    expected_arrival,
    note,
    shipped_by = '李明',
  } = req.body as {
    items: { order_item_id: string; product_id: string; product_name: string; shipped_quantity: number; unit: string }[]
    tracking_no?: string
    carrier?: string
    expected_arrival?: string
    note?: string
    shipped_by?: string
  }

  if (!items || items.length === 0) {
    res.status(400).json({ success: false, error: '请填写发货明细' })
    return
  }

  // 校验：不能超出未发货数量
  const shippedMap: Record<string, number> = {}
  const orderShipments = shipments.filter((s) => s.order_id === order.id)
  for (const s of orderShipments) {
    for (const si of s.items) {
      shippedMap[si.order_item_id] = (shippedMap[si.order_item_id] || 0) + si.shipped_quantity
    }
  }

  for (const si of items) {
    const orderItem = order.items.find((i) => i.id === si.order_item_id)
    if (!orderItem) {
      res.status(400).json({ success: false, error: `订单项 ${si.order_item_id} 不存在` })
      return
    }
    const alreadyShipped = shippedMap[si.order_item_id] || 0
    if (alreadyShipped + si.shipped_quantity > orderItem.quantity) {
      res.status(400).json({
        success: false,
        error: `${orderItem.product_name} 发货数量超出未发数量（未发 ${orderItem.quantity - alreadyShipped}${orderItem.unit}）`,
      })
      return
    }
  }

  // 创建发货记录
  const shipItems: ShipmentItem[] = items.map((si) => ({
    id: randomUUID(),
    order_item_id: si.order_item_id,
    product_id: si.product_id,
    product_name: si.product_name,
    shipped_quantity: si.shipped_quantity,
    unit: si.unit,
  }))
  const newShipment: Shipment = {
    id: `ship-${String(shipments.length + 1).padStart(3, '0')}`,
    order_id: order.id,
    created_at: new Date().toISOString(),
    shipped_by,
    tracking_no,
    carrier,
    expected_arrival,
    note,
    items: shipItems,
  }
  shipments.push(newShipment)

  // 计算是否全部发货，更新订单状态
  const newShippedMap: Record<string, number> = { ...shippedMap }
  for (const si of shipItems) {
    newShippedMap[si.order_item_id] = (newShippedMap[si.order_item_id] || 0) + si.shipped_quantity
  }
  let allShipped = true
  let anyShipped = false
  let hasBackorder = false
  for (const item of order.items) {
    if (item.gifted) continue
    const shipped = newShippedMap[item.id] || 0
    if (shipped > 0) anyShipped = true
    if (shipped < item.quantity) {
      allShipped = false
      if (shipped > 0 || item.quantity > 0) hasBackorder = true
    }
  }
  if (allShipped) {
    order.status = 'completed'
  } else if (anyShipped) {
    order.status = 'partial'
  }

  // 更新订单的预计到货日期
  if (expected_arrival) {
    order.expected_arrival = expected_arrival
  }

  // 自动生成 shipment 类型的跟进记录
  const summary = shipItems
    .filter((s) => order.items.find((i) => i.id === s.order_item_id && !i.gifted))
    .map((s) => `${s.product_name}${s.shipped_quantity}${s.unit}`)
    .join(' + ')
  const backorderInfo: string[] = []
  for (const item of order.items) {
    if (item.gifted) continue
    const shipped = newShippedMap[item.id] || 0
    const back = item.quantity - shipped
    if (back > 0) {
      backorderInfo.push(`${item.product_name}欠${back}${item.unit}`)
    }
  }
  followUps.push({
    id: randomUUID(),
    clinic_id: order.clinic_id,
    type: 'shipment',
    title: carrier && tracking_no ? `${carrier}已发货` : '部分发货',
    content: `${summary || '赠品发货'}${backorderInfo.length > 0 ? `；待补发：${backorderInfo.join('，')}` : ''}${note ? `；备注：${note}` : ''}${tracking_no ? `；单号：${tracking_no}` : ''}`,
    created_at: new Date().toISOString(),
    related_order_id: order.id,
    operator: shipped_by,
  })

  // 如果全部发货完成，追加一条完成记录
  if (allShipped && backorderInfo.length === 0) {
    followUps.push({
      id: randomUUID(),
      clinic_id: order.clinic_id,
      type: 'note',
      title: '订单完成发货',
      content: `订单 ${order.id} 全部商品已发出，合计¥${order.total_amount.toFixed(2)}，请跟进客户收货和付款。`,
      created_at: new Date().toISOString(),
      related_order_id: order.id,
      operator: shipped_by,
    })
  }

  res.status(201).json({ success: true, data: newShipment })
})

export default router
