import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Phone, ShoppingCart, SkipForward, X, AlertTriangle, CheckCircle, Clock } from 'lucide-react'
import { useStore, type Reminder } from '@/store/useStore'

const KEYWORDS = ['麻药', '手套', '根管锉', '麻', '根管']

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr + 'T00:00:00')
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - now.getTime()) / 86400000)
}

function urgencyColor(dateStr: string): { cls: string; label: string } {
  const d = daysUntil(dateStr)
  if (d <= 0) return { cls: 'bg-red-500', label: '今日到期' }
  if (d <= 3) return { cls: 'bg-amber-500', label: `${d}天后` }
  if (d <= 7) return { cls: 'bg-dental-400', label: `${d}天后` }
  return { cls: 'bg-surface-300', label: `${d}天后` }
}

export default function ReminderPopup() {
  const navigate = useNavigate()
  const reminders = useStore((s) => s.reminders)
  const fetchTodayReminders = useStore((s) => s.fetchTodayReminders)
  const updateReminderStatus = useStore((s) => s.updateReminderStatus)
  const setSelectedClinic = useStore((s) => s.setSelectedClinic)
  const clearCart = useStore((s) => s.clearCart)
  const [show, setShow] = useState(false)
  const [hasFetched, setHasFetched] = useState(false)

  useEffect(() => {
    fetchTodayReminders().finally(() => setHasFetched(true))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (hasFetched && reminders.length > 0 && !sessionStorage.getItem('reminder_shown')) {
      setShow(true)
      sessionStorage.setItem('reminder_shown', '1')
    }
  }, [hasFetched, reminders])

  const goOrder = (r: Reminder) => {
    navigate(`/order/new?clinic_id=${encodeURIComponent(r.clinic_id)}&clinic_name=${encodeURIComponent(r.clinic_name)}&reminder_id=${encodeURIComponent(r.id)}`)
    setShow(false)
  }

  const markContacted = (r: Reminder) => updateReminderStatus(r.id, 'done')
  const markPostponed = (r: Reminder) => updateReminderStatus(r.id, 'skipped')

  if (!show) return null

  const pending = reminders.filter(r => r.status === 'pending')
  const highlightList = pending.filter(r =>
    KEYWORDS.some(k => r.product_name.includes(k) || r.message.includes(k))
  )
  const others = pending.filter(r => !highlightList.includes(r))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[80vh] flex flex-col m-4 overflow-hidden">
        <div className="bg-gradient-to-r from-dental-500 to-dental-600 px-6 py-5 text-white relative">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center">
              <Bell className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold flex items-center gap-2">
                补货提醒
                {highlightList.length > 0 && (
                  <span className="text-xs font-normal bg-accent-500 px-2 py-0.5 rounded-full">
                    {highlightList.length} 项高频耗材
                  </span>
                )}
              </h2>
              <p className="text-sm text-dental-100 mt-0.5">
                您有 {pending.length} 条待处理的补货提醒，建议优先处理麻药、手套、根管锉等高频品项
              </p>
            </div>
            <button
              onClick={() => setShow(false)}
              className="w-9 h-9 rounded-lg hover:bg-white/15 flex items-center justify-center transition-colors"
              aria-label="关闭"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {[...highlightList, ...others].length === 0 ? (
            <div className="py-12 text-center text-surface-400">
              <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-40" />
              <p className="text-sm">暂无待处理的提醒</p>
            </div>
          ) : (
            [...highlightList, ...others].map((r, idx) => {
              const ur = urgencyColor(r.remind_at)
              const isHighlight = idx < highlightList.length
              return (
                <div
                  key={r.id}
                  className={`rounded-xl border p-4 transition-all ${
                    isHighlight
                      ? 'border-accent-200 bg-gradient-to-br from-accent-50/80 to-white shadow-sm'
                      : 'border-surface-200 bg-white'
                  }`}
                >
                  <div className="flex gap-3">
                    <div className={`${ur.cls} w-1 rounded-full flex-shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-surface-900 truncate">{r.clinic_name}</p>
                            {isHighlight && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-accent-700 bg-accent-100/80 px-1.5 py-0.5 rounded">
                                <AlertTriangle className="w-3 h-3" /> 高频
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-dental-600 font-medium mt-0.5">{r.product_name}</p>
                          <p className="text-xs text-surface-500 mt-1 leading-relaxed">{r.message}</p>
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-white ${ur.cls}`}>
                            <Clock className="w-3 h-3" /> {ur.label}
                          </span>
                          <p className="text-[10px] text-surface-400 mt-1">{r.remind_at}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-surface-100">
                        <button
                          onClick={() => { markContacted(r) }}
                          className="btn-primary !py-1.5 !px-3 text-xs flex items-center gap-1 flex-1 justify-center"
                        >
                          <Phone className="w-3.5 h-3.5" /> 已联系
                        </button>
                        <button
                          onClick={() => goOrder(r)}
                          className="btn-accent !py-1.5 !px-3 text-xs flex items-center gap-1 flex-1 justify-center"
                        >
                          <ShoppingCart className="w-3.5 h-3.5" /> 去下单
                        </button>
                        <button
                          onClick={() => markPostponed(r)}
                          className="btn-secondary !py-1.5 !px-3 text-xs flex items-center gap-1"
                          title="延后提醒"
                        >
                          <SkipForward className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        <div className="px-6 py-4 bg-surface-50 border-t border-surface-200 flex items-center justify-between">
          <button
            onClick={() => navigate('/reminders')}
            className="text-sm text-dental-600 hover:underline font-medium"
          >
            查看全部提醒 →
          </button>
          <button
            onClick={() => setShow(false)}
            className="btn-primary"
          >
            我知道了
          </button>
        </div>
      </div>
    </div>
  )
}
