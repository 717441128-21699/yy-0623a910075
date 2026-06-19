import { Router, type Request, type Response } from 'express'
import { reminders } from '../data/store.js'

const router = Router()

router.get('/', (req: Request, res: Response): void => {
  const { status } = req.query
  let result = [...reminders]

  if (status && typeof status === 'string') {
    result = result.filter((r) => r.status === status)
  }

  res.json({ success: true, data: result })
})

router.get('/today', (_req: Request, res: Response): void => {
  const now = new Date()
  const cutoff = new Date(now.getTime() + 3 * 86400000).toISOString().split('T')[0]
  const result = reminders.filter((r) => r.remind_at <= cutoff && r.status === 'pending')

  res.json({ success: true, data: result })
})

router.put('/:id', (req: Request, res: Response): void => {
  const reminder = reminders.find((r) => r.id === req.params.id)
  if (!reminder) {
    res.status(404).json({ success: false, error: '提醒不存在' })
    return
  }

  const { status } = req.body as { status: 'pending' | 'done' | 'skipped' }
  if (!status || !['pending', 'done', 'skipped'].includes(status)) {
    res.status(400).json({ success: false, error: '无效的状态值，应为 pending/done/skipped' })
    return
  }

  reminder.status = status
  res.json({ success: true, data: reminder })
})

export default router
