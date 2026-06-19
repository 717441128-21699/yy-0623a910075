import { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  ShoppingCart,
  Package,
  Bell,
  Cross,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import ReminderPopup from './ReminderPopup'
import { useStore } from '@/store/useStore'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: '工作台' },
  { to: '/customers', icon: Users, label: '客户档案' },
  { to: '/orders', icon: Package, label: '订单管理' },
  { to: '/order/new', icon: ShoppingCart, label: '下单中心' },
  { to: '/reminders', icon: Bell, label: '回访提醒' },
]

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()
  const reminders = useStore((s) => s.reminders)
  const pendingReminderCount = reminders.filter(r => r.status === 'pending').length

  return (
    <div className="flex h-screen bg-surface-50 relative">
      <aside
        className={`${
          collapsed ? 'w-16' : 'w-56'
        } flex flex-col bg-dental-500 text-white transition-all duration-300 relative`}
      >
        <div className="flex items-center gap-3 px-4 py-5 border-b border-dental-400/30">
          <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
            <Cross className="w-5 h-5" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <h1 className="text-sm font-bold leading-tight whitespace-nowrap">牙科耗材</h1>
              <p className="text-[10px] text-dental-200 whitespace-nowrap">订货助手</p>
            </div>
          )}
        </div>

        <nav className="flex-1 py-4 space-y-1 px-2">
          {navItems.map((item) => {
            const isReminder = item.to === '/reminders'
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 ${
                    isActive
                      ? 'bg-white/20 text-white shadow-sm'
                      : 'text-dental-100 hover:bg-white/10 hover:text-white'
                  } ${collapsed ? 'justify-center' : ''}`
                }
              >
                <div className="relative">
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {isReminder && pendingReminderCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-accent-500 text-white text-[9px] font-bold flex items-center justify-center">
                      {pendingReminderCount > 9 ? '9+' : pendingReminderCount}
                    </span>
                  )}
                </div>
                {!collapsed && <span className="text-sm font-medium whitespace-nowrap">{item.label}</span>}
                {isReminder && !collapsed && pendingReminderCount > 0 && (
                  <span className="ml-auto w-5 h-5 rounded-full bg-accent-500 text-white text-[10px] font-bold flex items-center justify-center">
                    {pendingReminderCount > 9 ? '9+' : pendingReminderCount}
                  </span>
                )}
              </NavLink>
            )
          })}
        </nav>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-white shadow-md
                     flex items-center justify-center text-dental-500 hover:bg-dental-50
                     border border-surface-200 transition-colors"
        >
          {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>

        {!collapsed && (
          <div className="px-4 py-4 border-t border-dental-400/30">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-accent-400 flex items-center justify-center text-xs font-bold">
                李
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-medium truncate">李明</p>
                <p className="text-[10px] text-dental-200 truncate">业务员</p>
              </div>
            </div>
          </div>
        )}
      </aside>

      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>

      <ReminderPopup />
    </div>
  )
}
