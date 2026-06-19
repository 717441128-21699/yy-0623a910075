import { Router, type Request, type Response } from 'express'
import {
  orders,
  clinics,
  products,
  purchaseHistory,
  reminders,
  giftPolicies,
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
  const { clinic_id, items } = req.body as {
    clinic_id: string
    items: { product_id: string; quantity: number }[]
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

  const orderItems: OrderItem[] = []
  let totalAmount = 0

  for (const item of items) {
    const product = products.find((p) => p.id === item.product_id)
    if (!product) {
      res.status(400).json({ success: false, error: `产品 ${item.product_id} 不存在` })
      return
    }

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

  const order: Order = {
    id: orderId,
    clinic_id: clinic.id,
    clinic_name: clinic.name,
    status: 'pending',
    total_amount: +totalAmount.toFixed(2),
    created_at: new Date().toISOString(),
    items: orderItems,
  }

  orders.push(order)

  for (const item of items) {
    purchaseHistory.push({
      id: randomUUID(),
      clinic_id: clinic.id,
      product_id: item.product_id,
      quantity: item.quantity,
      purchased_at: new Date().toISOString().split('T')[0],
    })
  }

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
      })
    }
  }

  res.status(201).json({ success: true, data: order })
})

router.post('/:id/confirm', (req: Request, res: Response): void => {
  const order = orders.find((o) => o.id === req.params.id)
  if (!order) {
    res.status(404).json({ success: false, error: '订单不存在' })
    return
  }

  const clinic = clinics.find((c) => c.id === order.clinic_id)
  const divider = '═'.repeat(50)
  const thinDivider = '─'.repeat(50)

  let text = `${divider}\n`
  text += `          订 货 确 认 单\n`
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
  for (const item of order.items) {
    const giftTag = item.gifted ? '【赠品】' : ''
    text += `\n${idx}. ${item.product_name} ${giftTag}\n`
    text += `   品牌：${item.brand}  规格：${item.spec}\n`
    text += `   数量：${item.quantity}${item.unit}  单价：¥${item.price.toFixed(2)}  税率：${(item.tax_rate * 100).toFixed(0)}%\n`
    text += `   小计：¥${item.subtotal.toFixed(2)}\n`
    idx++
  }

  text += `\n${thinDivider}\n`
  text += `合计金额：¥${order.total_amount.toFixed(2)}\n`
  text += `${divider}\n`
  text += `    请确认以上订货信息，如有问题请及时联系\n`
  text += `${divider}\n`

  res.json({ success: true, data: { confirmation_text: text } })
})

export default router
