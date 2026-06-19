import { Router, type Request, type Response } from 'express'
import { clinics, followUps, randomUUID, type FollowUp } from '../data/store.js'

const router = Router()

router.get('/:clinicId', (req: Request, res: Response): void => {
  const clinic = clinics.find((c) => c.id === req.params.clinicId)
  if (!clinic) {
    res.status(404).json({ success: false, error: '诊所不存在' })
    return
  }

  const result = [...followUps]
    .filter((f) => f.clinic_id === req.params.clinicId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))

  res.json({ success: true, data: result })
})

router.post('/:clinicId', (req: Request, res: Response): void => {
  const clinic = clinics.find((c) => c.id === req.params.clinicId)
  if (!clinic) {
    res.status(404).json({ success: false, error: '诊所不存在' })
    return
  }

  const { type, title, content, operator, related_order_id } = req.body as {
    type?: FollowUp['type']
    title?: string
    content?: string
    operator?: string
    related_order_id?: string
  }

  if (!type || !['call', 'visit', 'quote', 'order', 'note', 'shipment'].includes(type)) {
    res.status(400).json({ success: false, error: '跟进类型无效' })
    return
  }
  if (!title || !title.trim()) {
    res.status(400).json({ success: false, error: '标题不能为空' })
    return
  }
  if (!content || !content.trim()) {
    res.status(400).json({ success: false, error: '内容不能为空' })
    return
  }

  const newFollowUp: FollowUp = {
    id: randomUUID(),
    clinic_id: clinic.id,
    type,
    title: title.trim(),
    content: content.trim(),
    created_at: new Date().toISOString(),
    operator: operator || '李明',
    related_order_id,
  }

  followUps.push(newFollowUp)
  res.status(201).json({ success: true, data: newFollowUp })
})

export default router
