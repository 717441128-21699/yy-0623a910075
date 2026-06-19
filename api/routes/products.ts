import { Router, type Request, type Response } from 'express'
import { products } from '../data/store.js'

const router = Router()

const sceneTagMap: Record<string, string[]> = {
  implant: ['implant'],
  ortho: ['ortho'],
  cleaning: ['cleaning'],
  endodontic: ['endodontic'],
  restorative: ['restorative'],
  disinfection: ['disinfection'],
  anesthetic: ['anesthetic'],
}

router.get('/', (req: Request, res: Response): void => {
  let result = [...products]
  const { search, category } = req.query

  if (search && typeof search === 'string') {
    const q = search.toLowerCase()
    result = result.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.spec.toLowerCase().includes(q),
    )
  }

  if (category && typeof category === 'string') {
    result = result.filter((p) => p.category === category)
  }

  res.json({ success: true, data: result })
})

router.post('/recommend', (req: Request, res: Response): void => {
  const { implantCount, orthoCount, cleaningCount } = req.body as {
    implantCount?: number
    orthoCount?: number
    cleaningCount?: number
  }

  const sceneQuantities: { scene: string; count: number }[] = []
  if (implantCount && implantCount > 0) sceneQuantities.push({ scene: 'implant', count: implantCount })
  if (orthoCount && orthoCount > 0) sceneQuantities.push({ scene: 'ortho', count: orthoCount })
  if (cleaningCount && cleaningCount > 0) sceneQuantities.push({ scene: 'cleaning', count: cleaningCount })

  if (sceneQuantities.length === 0) {
    res.json({ success: true, data: [] })
    return
  }

  const recommended: {
    product: (typeof products)[0]
    scene: string
    suggested_quantity: number
  }[] = []

  for (const sq of sceneQuantities) {
    const tags = sceneTagMap[sq.scene] || [sq.scene]
    const matched = products.filter((p) => p.scene_tags.some((t) => tags.includes(t)))
    for (const product of matched) {
      const suggestedQty = Math.max(1, Math.ceil(sq.count * 0.5))
      recommended.push({
        product,
        scene: sq.scene,
        suggested_quantity: suggestedQty,
      })
    }
  }

  res.json({ success: true, data: recommended })
})

export default router
