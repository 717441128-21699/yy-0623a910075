import { Router, type Request, type Response } from 'express'
import {
  draftOrders,
  products,
  orders,
  clinics,
  purchaseHistory,
  reminders,
  giftPolicies,
  followUps,
  genOrderId,
  randomUUID,
  type Order,
  type OrderItem,
  type DraftOrder,
} from '../data/store.js'

const router = Router()

// 列表
router.get('/', (req: Request, res: Response): void => {
  const { clinic_id } = req.query
  let result = [...draftOrders]
  if (clinic_id && typeof clinic_id === 'string') {
    result = result.filter((d) => d.clinic_id === clinic_id)
  }
  result.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
  res.json({ success: true, data: result })
})

// 详情
router.get('/:id', (req: Request, res: Response): void => {
  const draft = draftOrders.find((d) => d.id === req.params.id)
  if (!draft) {
    res.status(404).json({ success: false, error: '草稿不存在' })
    return
  }
  res.json({ success: true, data: draft })
})

// 创建
router.post('/', (req: Request, res: Response): void => {
  const { clinic_id, clinic_name, items, note, created_by = '李明' } = req.body as {
    clinic_id: string
    clinic_name?: string
    items: { product_id: string; product_name?: string; quantity: number }[]
    note?: string
    created_by?: string
  }

  if (!clinic_id) {
    res.status(400).json({ success: false, error: '请选择诊所' })
    return
  }
  if (!items || !Array.isArray(items) || items.length === 0) {
    res.status(400).json({ success: false, error: '草稿至少需要一个品项' })
    return
  }
  for (const it of items) {
    if (!Number.isFinite(it.quantity) || it.quantity <= 0) {
      res.status(400).json({ success: false, error: '品项数量必须为正数' })
      return
    }
  }

  const now = new Date().toISOString()
  const draft: DraftOrder = {
    id: `draft-${String(draftOrders.length + 1).padStart(3, '0')}`,
    clinic_id,
    clinic_name,
    items,
    note,
    created_at: now,
    updated_at: now,
    created_by,
  }
  draftOrders.push(draft)
  res.status(201).json({ success: true, data: draft })
})

// 更新
router.put('/:id', (req: Request, res: Response): void => {
  const draft = draftOrders.find((d) => d.id === req.params.id)
  if (!draft) {
    res.status(404).json({ success: false, error: '草稿不存在' })
    return
  }
  const { items, note, clinic_id, clinic_name } = req.body as Partial<DraftOrder>
  if (items !== undefined) draft.items = items
  if (note !== undefined) draft.note = note
  if (clinic_id !== undefined) draft.clinic_id = clinic_id
  if (clinic_name !== undefined) draft.clinic_name = clinic_name
  draft.updated_at = new Date().toISOString()
  res.json({ success: true, data: draft })
})

// 删除
router.delete('/:id', (req: Request, res: Response): void => {
  const idx = draftOrders.findIndex((d) => d.id === req.params.id)
  if (idx === -1) {
    res.status(404).json({ success: false, error: '草稿不存在' })
    return
  }
  const [removed] = draftOrders.splice(idx, 1)
  res.json({ success: true, data: removed })
})

// 提交草稿为正式订单（复用创建订单的核心逻辑，包含库存扣减、欠货、赠品、提醒等）
router.post('/:id/submit', async (req: Request, res: Promise<void> | any): Promise<void> => {
  const draft = draftOrders.find((d) => d.id === req.params.id)
  if (!draft) {
    res.status(404).json({ success: false, error: '草稿不存在' })
    return
  }

  const {
    delivery_method,
    backorder_note,
    payment_due_days = 30,
    from_reminder_id,
    operator = '李明',
  } = req.body as {
    delivery_method?: 'logistics' | 'local_delivery' | 'self_pickup'
    backorder_note?: string
    payment_due_days?: number
    from_reminder_id?: string
    operator?: string
  }

  const clinic = clinics.find((c) => c.id === draft.clinic_id)
  if (!clinic) {
    res.status(400).json({ success: false, error: '诊所不存在' })
    return
  }

  const items = draft.items

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

  // 自动生成高频品项补货提醒
  const highFreqProductIds = new Set(['prod-029', 'prod-016', 'prod-021', 'prod-022', 'prod-030', 'prod-031'])
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

  // 自动生成订单跟进记录
  const paidItemsSummary = order.items
    .filter((i) => !i.gifted)
    .map((i) => `${i.product_name}${i.quantity}${i.unit}`)
    .join(' + ')
  followUps.push({
    id: randomUUID(),
    clinic_id: clinic.id,
    type: 'order',
    title: '订单创建（来自草稿）',
    content: `${paidItemsSummary}，合计¥${order.total_amount.toFixed(2)}`,
    created_at: new Date().toISOString(),
    related_order_id: orderId,
    operator,
  })

  // 删除已提交的草稿
  const dIdx = draftOrders.findIndex((d) => d.id === draft.id)
  if (dIdx !== -1) draftOrders.splice(dIdx, 1)

  res.status(201).json({
    success: true,
    data: {
      order,
      backorder_items: backorderItems,
      completed_reminder_ids: completedReminderIds,
    },
  })
})

export default router
