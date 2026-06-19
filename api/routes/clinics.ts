import { Router, type Request, type Response } from 'express'
import { clinics, purchaseHistory, orders, products } from '../data/store.js'

const router = Router()

router.get('/', (req: Request, res: Response): void => {
  let result = [...clinics]
  const { search, area } = req.query

  if (search && typeof search === 'string') {
    const q = search.toLowerCase()
    result = result.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.contact.toLowerCase().includes(q) ||
        c.address.toLowerCase().includes(q),
    )
  }

  if (area && typeof area === 'string') {
    result = result.filter((c) => c.area === area)
  }

  res.json({ success: true, data: result })
})

router.get('/:id', (req: Request, res: Response): void => {
  const clinic = clinics.find((c) => c.id === req.params.id)
  if (!clinic) {
    res.status(404).json({ success: false, error: '诊所不存在' })
    return
  }

  const clinicPurchases = purchaseHistory.filter((p) => p.clinic_id === clinic.id)
  const lastPurchaseDate =
    clinicPurchases.length > 0
      ? clinicPurchases.sort((a, b) => b.purchased_at.localeCompare(a.purchased_at))[0]
          .purchased_at
      : null

  const outstandingOrderCount = orders.filter(
    (o) => o.clinic_id === clinic.id && (o.status === 'pending' || o.status === 'partial'),
  ).length

  res.json({
    success: true,
    data: {
      ...clinic,
      last_purchase_date: lastPurchaseDate,
      outstanding_order_count: outstandingOrderCount,
    },
  })
})

router.get('/:id/consumables', (req: Request, res: Response): void => {
  const clinic = clinics.find((c) => c.id === req.params.id)
  if (!clinic) {
    res.status(404).json({ success: false, error: '诊所不存在' })
    return
  }

  const clinicPurchases = purchaseHistory.filter((p) => p.clinic_id === clinic.id)
  const productPurchaseMap = new Map<string, { product: (typeof products)[0]; totalQty: number; lastDate: string }>()

  for (const p of clinicPurchases) {
    const product = products.find((pr) => pr.id === p.product_id)
    if (!product) continue
    const existing = productPurchaseMap.get(p.product_id)
    if (existing) {
      existing.totalQty += p.quantity
      if (p.purchased_at > existing.lastDate) existing.lastDate = p.purchased_at
    } else {
      productPurchaseMap.set(p.product_id, {
        product,
        totalQty: p.quantity,
        lastDate: p.purchased_at,
      })
    }
  }

  const result = Array.from(productPurchaseMap.values())
    .sort((a, b) => b.totalQty - a.totalQty)
    .map((item) => ({
      ...item.product,
      purchase_count: item.totalQty,
      last_purchased_at: item.lastDate,
    }))

  res.json({ success: true, data: result })
})

router.get('/:id/brands', (req: Request, res: Response): void => {
  const clinic = clinics.find((c) => c.id === req.params.id)
  if (!clinic) {
    res.status(404).json({ success: false, error: '诊所不存在' })
    return
  }

  const clinicPurchases = purchaseHistory.filter((p) => p.clinic_id === clinic.id)
  const brandMap = new Map<string, { brand: string; count: number; categories: Set<string> }>()

  for (const p of clinicPurchases) {
    const product = products.find((pr) => pr.id === p.product_id)
    if (!product) continue
    const existing = brandMap.get(product.brand)
    if (existing) {
      existing.count += p.quantity
      existing.categories.add(product.category)
    } else {
      brandMap.set(product.brand, {
        brand: product.brand,
        count: p.quantity,
        categories: new Set([product.category]),
      })
    }
  }

  const result = Array.from(brandMap.values())
    .sort((a, b) => b.count - a.count)
    .map((item) => ({
      brand: item.brand,
      purchase_count: item.count,
      categories: Array.from(item.categories),
    }))

  res.json({ success: true, data: result })
})

router.get('/:id/orders/outstanding', (req: Request, res: Response): void => {
  const clinic = clinics.find((c) => c.id === req.params.id)
  if (!clinic) {
    res.status(404).json({ success: false, error: '诊所不存在' })
    return
  }

  const result = orders.filter(
    (o) => o.clinic_id === clinic.id && (o.status === 'pending' || o.status === 'partial'),
  )

  res.json({ success: true, data: result })
})

export default router
