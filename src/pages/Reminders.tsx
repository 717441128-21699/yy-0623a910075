import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Phone, ShoppingCart, Clock, Check, SkipForward } from 'lucide-react'
import { useStore } from '@/store/useStore'
import type { Reminder } from '@/store/useStore'

const TABS = [
  { key: '', label: '全部' },
  { key: 'pending', label: '待处理' },
  { key: 'done', label: '已联系' },
  { key: 'skipped', label: '已延后' },
] as const

function getCountdownColor(remindAt: string) {
  const diff = Math.ceil((new Date(remindAt).getTime() - Date.now()) / 86400000)
  if (diff <= 0) return 'bg-red-500'
  if (diff <= 3) return 'bg-orange-400'
  if (diff <= 7) return 'bg-emerald-500'
  return 'bg-surface-300'
}

function getDaysRemaining(remindAt: string) {
  return Math.ceil((new Date(remindAt).getTime() - Date.now()) / 86400000)
}

export default function Reminders() {
  const { reminders, fetchReminders, updateReminderStatus } = useStore()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('')
  const pendingCount = reminders.filter((r) => r.status === 'pending').length

  useEffect(() => { fetchReminders(activeTab || undefined) }, [activeTab])

  const handleStatus = async (id: string, status: string) => {
    await updateReminderStatus(id, status)
    fetchReminders(activeTab || undefined)
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Bell className="w-6 h-6 text-dental-500" />
        <h2 className="section-title mb-0">回访提醒</h2>
        {pendingCount > 0 && (
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-accent-500 text-white text-xs font-bold">{pendingCount}</span>
        )}
      </div>

      <div className="flex gap-2 mb-5">
        {TABS.map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tab.key ? 'bg-dental-500 text-white' : 'bg-white text-surface-600 border border-surface-200 hover:border-dental-300'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {reminders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-surface-400">
          <Clock className="w-12 h-12 mb-3 stroke-1" />
          <p className="text-sm">暂无提醒</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reminders.map((r: Reminder) => {
            const days = getDaysRemaining(r.remind_at)
            return (
              <div key={r.id} className="bg-white rounded-xl shadow-sm card-hover flex overflow-hidden">
                <div className={`w-2 flex-shrink-0 ${getCountdownColor(r.remind_at)}`} />
                <div className="flex-1 p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-surface-900">{r.clinic_name}</p>
                      <p className="text-sm text-surface-500">{r.product_name}</p>
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${days <= 0 ? 'bg-red-50 text-red-600' : days <= 3 ? 'bg-orange-50 text-orange-600' : days <= 7 ? 'bg-emerald-50 text-emerald-600' : 'bg-surface-100 text-surface-500'}`}>
                      {days <= 0 ? '已到期' : `${days}天后`}
                    </span>
                  </div>
                  <p className="text-sm text-surface-600 mt-2">{r.message}</p>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-xs text-surface-400">预计用完: {r.remind_at.slice(0, 10)}</span>
                    {r.status === 'pending' ? (
                      <div className="flex gap-2">
                        <button onClick={() => handleStatus(r.id, 'done')} className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1">
                          <Phone className="w-3 h-3" />已联系
                        </button>
                        <button onClick={() => navigate(`/order/new?clinic_id=${encodeURIComponent(r.clinic_id)}&clinic_name=${encodeURIComponent(r.clinic_name)}&reminder_id=${encodeURIComponent(r.id)}`)} className="btn-accent text-xs px-3 py-1.5 flex items-center gap-1">
                          <ShoppingCart className="w-3 h-3" />去下单
                        </button>
                        <button onClick={() => handleStatus(r.id, 'skipped')} className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1">
                          <SkipForward className="w-3 h-3" />延后
                        </button>
                      </div>
                    ) : (
                      <span className={`text-xs font-medium ${r.status === 'done' ? 'text-emerald-600' : 'text-surface-400'}`}>
                        {r.status === 'done' ? <><Check className="w-3 h-3 inline mr-1" />已联系</> : <><SkipForward className="w-3 h-3 inline mr-1" />已延后</>}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
