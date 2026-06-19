import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { MapPin, Phone, User, ShoppingCart, Calendar, Package } from 'lucide-react'
import { useStore } from '@/store/useStore'
import type { Clinic, Product, BrandPreference, Order } from '@/store/useStore'

type Tab = 'overview' | 'consumables' | 'brands' | 'orders'

const TABS: { key: Tab; label: string }[] = [
  { key: 'overview', label: '概览' },
  { key: 'consumables', label: '常用耗材' },
  { key: 'brands', label: '品牌偏好' },
  { key: 'orders', label: '未结订单' },
]

const statusMap: Record<string, { label: string; cls: string }> = {
  pending: { label: '待处理', cls: 'badge-pending' },
  partial: { label: '部分发货', cls: 'badge-partial' },
  completed: { label: '已完成', cls: 'badge-completed' },
}

export default function CustomerDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { fetchClinicDetail, fetchClinicConsumables, fetchClinicBrands, fetchClinicOutstandingOrders } = useStore()

  const [clinic, setClinic] = useState<Clinic | null>(null)
  const [consumables, setConsumables] = useState<Product[]>([])
  const [brands, setBrands] = useState<BrandPreference[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [tab, setTab] = useState<Tab>('overview')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    Promise.all([
      fetchClinicDetail(id),
      fetchClinicConsumables(id),
      fetchClinicBrands(id),
      fetchClinicOutstandingOrders(id),
    ]).then(([c, p, b, o]) => {
      setClinic(c)
      setConsumables(p)
      setBrands(b)
      setOrders(o)
      setLoading(false)
    })
  }, [id])

  if (loading) return <div className="text-center py-20 text-surface-400">加载中...</div>
  if (!clinic) return <div className="text-center py-20 text-surface-400">未找到客户信息</div>

  const maxBrandCount = Math.max(...brands.map((b) => b.purchase_count), 1)

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="bg-white rounded-xl border border-surface-200 p-5 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-surface-900">{clinic.name}</h1>
            <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-surface-600">
              <span className="flex items-center gap-1"><MapPin className="w-4 h-4" />{clinic.address}</span>
              <span className="flex items-center gap-1"><User className="w-4 h-4" />{clinic.contact}</span>
              <span className="flex items-center gap-1"><Phone className="w-4 h-4" />{clinic.phone}</span>
            </div>
          </div>
          <button className="btn-primary flex items-center gap-2 self-start" onClick={() => navigate('/order/new')}>
            <ShoppingCart className="w-4 h-4" />快捷下单
          </button>
        </div>
      </div>

      <div className="flex gap-1 border-b border-surface-200 mb-6">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key ? 'border-dental-500 text-dental-500' : 'border-transparent text-surface-500 hover:text-surface-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-surface-200 p-5">
            <h3 className="text-sm font-semibold text-surface-700 mb-3">基本信息</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div><span className="text-surface-400">名称</span><p className="font-medium text-surface-900 mt-1">{clinic.name}</p></div>
              <div><span className="text-surface-400">地址</span><p className="font-medium text-surface-900 mt-1">{clinic.address}</p></div>
              <div><span className="text-surface-400">联系人</span><p className="font-medium text-surface-900 mt-1">{clinic.contact}</p></div>
              <div><span className="text-surface-400">电话</span><p className="font-medium text-surface-900 mt-1">{clinic.phone}</p></div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[
              { icon: Calendar, label: '上次采购日期', value: clinic.last_purchase_date || '暂无' },
              { icon: ShoppingCart, label: '未结订单数', value: clinic.outstanding_order_count ?? 0 },
              { icon: Package, label: '常用品项数', value: consumables.length },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-xl border border-surface-200 p-5 text-center">
                <s.icon className="w-5 h-5 mx-auto text-dental-500 mb-2" />
                <p className="text-2xl font-bold text-surface-900">{s.value}</p>
                <p className="text-xs text-surface-400 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'consumables' && (
        <div className="bg-white rounded-xl border border-surface-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-50 text-surface-500">
                <th className="text-left px-4 py-3 font-medium">品名</th>
                <th className="text-left px-4 py-3 font-medium">品牌</th>
                <th className="text-left px-4 py-3 font-medium">规格</th>
                <th className="text-right px-4 py-3 font-medium">采购次数</th>
                <th className="text-right px-4 py-3 font-medium">上次采购</th>
              </tr>
            </thead>
            <tbody>
              {consumables.map((p) => (
                <tr key={p.id} className="border-t border-surface-100 hover:bg-surface-50">
                  <td className="px-4 py-3 font-medium text-surface-900">{p.name}</td>
                  <td className="px-4 py-3 text-surface-600">{p.brand}</td>
                  <td className="px-4 py-3 text-surface-600">{p.spec}</td>
                  <td className="px-4 py-3 text-right text-dental-600 font-medium">{p.purchase_count ?? 0}</td>
                  <td className="px-4 py-3 text-right text-surface-500">{p.last_purchased_at || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {consumables.length === 0 && <div className="text-center py-10 text-surface-400">暂无耗材记录</div>}
        </div>
      )}

      {tab === 'brands' && (
        <div className="bg-white rounded-xl border border-surface-200 p-5 space-y-4">
          {brands.length === 0 && <div className="text-center py-10 text-surface-400">暂无品牌偏好数据</div>}
          {brands.map((b) => (
            <div key={b.brand}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-surface-900">{b.brand}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-surface-400">{b.purchase_count} 次</span>
                  {b.categories.map((c) => (
                    <span key={c} className="text-[10px] px-1.5 py-0.5 rounded bg-dental-50 text-dental-600 border border-dental-200">{c}</span>
                  ))}
                </div>
              </div>
              <div className="h-4 bg-surface-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-dental-400 rounded-full transition-all"
                  style={{ width: `${(b.purchase_count / maxBrandCount) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'orders' && (
        <div className="space-y-3">
          {orders.length === 0 && <div className="text-center py-10 text-surface-400">暂无未结订单</div>}
          {orders.map((o) => (
            <div key={o.id} className="bg-white rounded-xl border border-surface-200 p-4 card-hover">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-mono text-surface-700">{o.id}</span>
                <span className={statusMap[o.status]?.cls || 'badge-pending'}>{statusMap[o.status]?.label || o.status}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-surface-500">{o.created_at}</span>
                <div className="flex items-center gap-4">
                  <span className="text-surface-500">{o.items.length} 项</span>
                  <span className="font-semibold text-surface-900">¥{o.total_amount.toFixed(2)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
