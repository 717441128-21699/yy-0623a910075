import { useEffect, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ShoppingCart, Search, Bell, Phone, Clock, ChevronRight } from 'lucide-react'
import { useStore } from '@/store/useStore'

function getGreeting() {
  const h = new Date().getHours()
  if (h < 6) return '凌晨好'
  if (h < 12) return '早上好'
  if (h < 14) return '中午好'
  if (h < 18) return '下午好'
  return '晚上好'
}

function getUrgency(remindAt: string) {
  const now = new Date()
  const target = new Date(remindAt)
  const diff = (target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  if (diff <= 0) return { color: 'bg-red-500', label: '今日' }
  if (diff <= 3) return { color: 'bg-orange-400', label: '3天内' }
  return { color: 'bg-emerald-400', label: '稍后' }
}

const statusMap = {
  pending: { label: '待确认', cls: 'badge-pending' },
  partial: { label: '部分发货', cls: 'badge-partial' },
  completed: { label: '已完成', cls: 'badge-completed' },
} as const

export default function Dashboard() {
  const navigate = useNavigate()
  const { reminders, orders, fetchTodayReminders, fetchOrders, updateReminderStatus } = useStore()

  useEffect(() => {
    fetchTodayReminders()
    fetchOrders()
  }, [])

  const today = new Date()
  const dateStr = today.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })

  const recentOrders = useMemo(() => {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 7)
    return orders
      .filter((o) => new Date(o.created_at) >= cutoff)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }, [orders])

  const pendingReminders = reminders.filter((r) => r.status === 'pending')

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">工作台</h1>
          <p className="text-surface-500 mt-1">{getGreeting()}，李明</p>
        </div>
        <p className="text-sm text-surface-400">{dateStr}</p>
      </div>

      <section>
        <h2 className="section-title flex items-center gap-2">
          <Bell className="w-5 h-5 text-accent-500" />
          今日回访提醒
          {pendingReminders.length > 0 && (
            <span className="ml-1 px-2 py-0.5 rounded-full bg-accent-500 text-white text-xs">{pendingReminders.length}</span>
          )}
        </h2>
        {pendingReminders.length === 0 ? (
          <div className="text-center py-8 text-surface-400">今日暂无待处理提醒</div>
        ) : (
          <div className="space-y-3">
            {pendingReminders.map((r) => {
              const urgency = getUrgency(r.remind_at)
              return (
                <div
                  key={r.id}
                  className="card-hover flex bg-white rounded-xl shadow-sm overflow-hidden cursor-pointer"
                  onClick={() => navigate(`/customers/${r.clinic_id}`)}
                >
                  <div className={`w-1.5 flex-shrink-0 ${urgency.color}`} />
                  <div className="flex-1 p-4 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-surface-900 truncate">{r.clinic_name}</p>
                        <p className="text-sm text-surface-500 truncate">{r.product_name}</p>
                        <p className="text-sm text-surface-400 mt-1 truncate">{r.message}</p>
                      </div>
                      <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] text-white ${urgency.color}`}>
                        {urgency.label}
                      </span>
                    </div>
                    <div className="flex gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
                      <button
                        className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1"
                        onClick={() => updateReminderStatus(r.id, 'done')}
                      >
                        <Phone className="w-3.5 h-3.5" /> 已联系
                      </button>
                      <button
                        className="btn-accent text-xs px-3 py-1.5 flex items-center gap-1"
                        onClick={() => navigate('/order/new')}
                      >
                        <ShoppingCart className="w-3.5 h-3.5" /> 下单
                      </button>
                      <button
                        className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1"
                        onClick={() => updateReminderStatus(r.id, 'skipped')}
                      >
                        <Clock className="w-3.5 h-3.5" /> 延后
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <section>
        <h2 className="section-title">快捷操作</h2>
        <div className="flex gap-6">
          {[
            { label: '新建订单', icon: ShoppingCart, to: '/order/new', color: 'bg-dental-500 hover:bg-dental-600' },
            { label: '客户搜索', icon: Search, to: '/customers', color: 'bg-accent-500 hover:bg-accent-600' },
            { label: '全部提醒', icon: Bell, to: '/reminders', color: 'bg-surface-600 hover:bg-surface-700' },
          ].map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="flex flex-col items-center gap-2 group"
            >
              <div className={`w-14 h-14 rounded-full ${item.color} text-white flex items-center justify-center shadow-md transition-colors`}>
                <item.icon className="w-6 h-6" />
              </div>
              <span className="text-sm text-surface-600 group-hover:text-surface-900 font-medium">{item.label}</span>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title mb-0">近期订单</h2>
          <Link to="/customers" className="text-sm text-dental-500 hover:text-dental-600 flex items-center gap-1">
            查看全部 <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        {recentOrders.length === 0 ? (
          <div className="text-center py-8 text-surface-400">近7天暂无订单</div>
        ) : (
          <div className="relative pl-6">
            <div className="absolute left-[7px] top-2 bottom-2 w-px bg-surface-200" />
            <div className="space-y-4">
              {recentOrders.map((order) => {
                const st = statusMap[order.status]
                const date = new Date(order.created_at)
                return (
                  <div key={order.id} className="relative flex items-start gap-4">
                    <div className="absolute -left-6 top-1.5 w-3.5 h-3.5 rounded-full bg-dental-300 border-2 border-white shadow-sm" />
                    <div className="flex-1 bg-white rounded-lg p-4 shadow-sm card-hover">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0">
                          <p className="font-medium text-surface-900">{order.clinic_name}</p>
                          <p className="text-xs text-surface-400 mt-0.5">{order.id}</p>
                        </div>
                        <span className={st.cls}>{st.label}</span>
                      </div>
                      <div className="flex items-center justify-between mt-2 text-sm">
                        <span className="text-surface-500">
                          ¥{order.total_amount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                        </span>
                        <span className="text-surface-400 text-xs">
                          {date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
