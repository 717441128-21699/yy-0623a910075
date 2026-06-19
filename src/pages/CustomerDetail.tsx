import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { MapPin, Phone, User, ShoppingCart, Calendar, Package, MessageSquare, PhoneCall, Home, FileText, Plus, X, Clock, Truck, ExternalLink } from 'lucide-react'
import { useStore } from '@/store/useStore'
import type { Clinic, Product, BrandPreference, Order, FollowUp } from '@/store/useStore'

type Tab = 'overview' | 'consumables' | 'brands' | 'orders' | 'follow-ups'

const TABS: { key: Tab; label: string }[] = [
  { key: 'overview', label: '概览' },
  { key: 'consumables', label: '常用耗材' },
  { key: 'brands', label: '品牌偏好' },
  { key: 'orders', label: '未结订单' },
  { key: 'follow-ups', label: '跟进记录' },
]

const statusMap: Record<string, { label: string; cls: string }> = {
  pending: { label: '待处理', cls: 'badge-pending' },
  partial: { label: '部分发货', cls: 'badge-partial' },
  completed: { label: '已完成', cls: 'badge-completed' },
}

export default function CustomerDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const {
    fetchClinicDetail, fetchClinicConsumables, fetchClinicBrands, fetchClinicOutstandingOrders,
    followUps, fetchFollowUps, createFollowUp,
  } = useStore()

  const [clinic, setClinic] = useState<Clinic | null>(null)
  const [consumables, setConsumables] = useState<Product[]>([])
  const [brands, setBrands] = useState<BrandPreference[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [tab, setTab] = useState<Tab>('overview')
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newFollowUp, setNewFollowUp] = useState({
    type: 'note' as FollowUp['type'],
    title: '',
    content: '',
  })

  useEffect(() => {
    if (!id) return
    setLoading(true)
    Promise.all([
      fetchClinicDetail(id),
      fetchClinicConsumables(id),
      fetchClinicBrands(id),
      fetchClinicOutstandingOrders(id),
      fetchFollowUps(id),
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

  // 跟进记录类型配置映射，包含 shipment 运输类型
  const followUpTypeMap: Record<FollowUp['type'], { label: string; icon: typeof MessageSquare; color: string; bg: string }> = {
    call: { label: '电话', icon: PhoneCall, color: 'text-dental-600', bg: 'bg-dental-100' },
    visit: { label: '上门拜访', icon: Home, color: 'text-emerald-600', bg: 'bg-emerald-100' },
    quote: { label: '报价', icon: FileText, color: 'text-amber-600', bg: 'bg-amber-100' },
    order: { label: '下单', icon: ShoppingCart, color: 'text-accent-600', bg: 'bg-accent-100' },
    note: { label: '备注', icon: MessageSquare, color: 'text-surface-600', bg: 'bg-surface-100' },
    // 运输/发货类型，使用 Truck 图标，蓝色/青色系配色
    shipment: { label: '已发货', icon: Truck, color: 'text-cyan-600', bg: 'bg-cyan-100' },
  }

  const handleAddFollowUp = async () => {
    if (!id || !newFollowUp.title.trim()) return
    await createFollowUp(id, {
      ...newFollowUp,
      operator: '李明',
    })
    setNewFollowUp({ type: 'note', title: '', content: '' })
    setShowAddModal(false)
  }

  const formatDateTime = (isoStr: string) => {
    const d = new Date(isoStr)
    return d.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

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
          <button className="btn-primary flex items-center gap-2 self-start" onClick={() => navigate(`/order/new?clinic_id=${encodeURIComponent(clinic.id)}&clinic_name=${encodeURIComponent(clinic.name)}`)}>
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

      {tab === 'follow-ups' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-surface-500">共 {followUps.length} 条跟进记录</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="btn-primary text-sm flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> 添加记录
            </button>
          </div>

          {followUps.length === 0 ? (
            <div className="text-center py-16 text-surface-400 bg-white rounded-xl border border-dashed border-surface-200">
              <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">暂无跟进记录</p>
              <button
                onClick={() => setShowAddModal(true)}
                className="text-sm text-dental-500 hover:underline mt-2"
              >
                + 添加第一条记录
              </button>
            </div>
          ) : (
            <div className="relative pl-6">
              <div className="absolute left-[7px] top-2 bottom-2 w-px bg-surface-200" />
              <div className="space-y-4">
                {followUps.map((fu) => {
                  const typeInfo = followUpTypeMap[fu.type]
                  const TypeIcon = typeInfo.icon
                  // 判断当前类型是否支持点击跳转订单详情
                  const canClickTitle = (fu.type === 'order' || fu.type === 'quote' || fu.type === 'shipment') && fu.related_order_id
                  // 订单详情跳转链接，履约跟踪Tab
                  const orderFulfillmentUrl = fu.related_order_id ? `/order/confirm/${fu.related_order_id}?tab=fulfillment` : null
                  return (
                    <div key={fu.id} className="relative">
                      <div className={`absolute -left-6 top-1.5 w-4 h-4 rounded-full ${typeInfo.bg} border-2 border-white shadow flex items-center justify-center`}>
                        <TypeIcon className={`w-2.5 h-2.5 ${typeInfo.color}`} />
                      </div>
                      <div className="bg-white rounded-xl border border-surface-200 p-4 card-hover">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${typeInfo.bg} ${typeInfo.color}`}>
                              {typeInfo.label}
                            </span>
                            {canClickTitle ? (
                              // 订单/报价/发货类型的标题可点击跳转订单详情
                              <button
                                onClick={() => navigate(orderFulfillmentUrl!)}
                                className="text-sm font-medium text-dental-600 hover:text-dental-700 hover:underline inline-flex items-center gap-1"
                              >
                                {fu.title}
                                <ExternalLink className="w-3 h-3" />
                              </button>
                            ) : (
                              <span className="text-sm font-medium text-surface-800">{fu.title}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-surface-400 flex-shrink-0">
                            <Clock className="w-3 h-3" />
                            {formatDateTime(fu.created_at)}
                          </div>
                        </div>
                        <p className="text-sm text-surface-600 mt-2 leading-relaxed">{fu.content}</p>
                        {fu.related_order_id && (
                          <div className="mt-2 text-xs text-surface-400">
                            关联订单：
                            {/* 关联订单ID改为可点击链接，跳转到履约跟踪Tab */}
                            <button
                              onClick={() => navigate(orderFulfillmentUrl!)}
                              className="font-mono text-dental-600 hover:text-dental-700 hover:underline inline-flex items-center gap-0.5"
                            >
                              {fu.related_order_id}
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                        {fu.operator && (
                          <div className="mt-1 text-xs text-surface-400">
                            跟进人：{fu.operator}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md m-4 overflow-hidden">
            <div className="px-5 py-4 border-b border-surface-100 flex items-center justify-between">
              <h3 className="font-semibold text-surface-900">添加跟进记录</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-lg hover:bg-surface-100 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-sm font-medium text-surface-600 mb-2 block">跟进类型</label>
                {/* 跟进类型选择按钮，6列布局，支持 shipment 类型 */}
                <div className="grid grid-cols-6 gap-2">
                  {(Object.keys(followUpTypeMap) as FollowUp['type'][]).map((type) => {
                    const info = followUpTypeMap[type]
                    const Icon = info.icon
                    const active = newFollowUp.type === type
                    return (
                      <button
                        key={type}
                        onClick={() => setNewFollowUp({ ...newFollowUp, type })}
                        className={`flex flex-col items-center gap-1 py-2.5 rounded-lg border transition-all ${
                          active
                            ? 'border-dental-400 bg-dental-50 text-dental-700'
                            : 'border-surface-200 hover:border-surface-300 text-surface-500'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-xs">{info.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-surface-600 mb-1.5 block">标题</label>
                <input
                  className="input-base text-sm"
                  placeholder="请输入标题，如：报价沟通、电话确认等"
                  value={newFollowUp.title}
                  onChange={(e) => setNewFollowUp({ ...newFollowUp, title: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-surface-600 mb-1.5 block">内容</label>
                <textarea
                  className="input-base text-sm min-h-[100px] resize-y"
                  placeholder="记录跟进详情，方便下次接着聊..."
                  value={newFollowUp.content}
                  onChange={(e) => setNewFollowUp({ ...newFollowUp, content: e.target.value })}
                />
              </div>
            </div>
            <div className="px-5 py-4 bg-surface-50 border-t border-surface-100 flex justify-end gap-2">
              <button
                onClick={() => setShowAddModal(false)}
                className="btn-secondary text-sm"
              >
                取消
              </button>
              <button
                onClick={handleAddFollowUp}
                disabled={!newFollowUp.title.trim()}
                className="btn-primary text-sm disabled:opacity-50"
              >
                保存记录
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
