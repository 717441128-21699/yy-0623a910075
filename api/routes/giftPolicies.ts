import { Router, type Request, type Response } from 'express'
import { giftPolicies } from '../data/store.js'

const router = Router()

router.get('/', (req: Request, res: Response): void => {
  const { product_id } = req.query
  let result = [...giftPolicies]

  if (product_id && typeof product_id === 'string') {
    result = result.filter((gp) => gp.product_id === product_id)
  }

  res.json({ success: true, data: result })
})

export default router
