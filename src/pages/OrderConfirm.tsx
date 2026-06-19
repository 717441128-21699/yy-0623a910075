import { useState, useEffect, useMemo } from 'react'
import { useParams, Link, useSearchParams, useNavigate } from 'react-router-dom'
import {
  Copy, CheckCircle, Truck, Bike, PackageOpen, Package,
  Calendar, Clock, Plus, X, FileText, AlertTriangle,
} from 'lucide-react'
import { useStore } from '@/store/useStore'
import type { Order, ShipmentItem, OrderItem } from '@/store/useStore'

// 订单状态映射
const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  pending: { label: '待处理', cls: 'badge-pending' },
  partial: { label: '部分发货', cls: 'badge-partial' },
  completed: { label: '已完成', cls: 'badge-completed' },
}

// 配送方式选项
const DELIVERY_OPTIONS: Array<{ value: 'logistics' | 'local_delivery' | 'self_pickup'; label: string; icon: typeof Truck }> = [
  { value: 'logistics', label: '物流配送', icon: Truck },
  { value: 'local_delivery', label: '同城送货', icon: Bike },
  { value: 'self_pickup', label: '自提', icon: PackageOpen },
]

// 付款期限选项
const PAYMENT_TERMS = [
  { value: 7, label: '7天' },
  { value: 15, label: '15天' },
  { value: 30, label: '30天' },
  { value: 60, label: '60天' },
]

// Tab配置
type PageTab = 'confirm' | 'fulfillment'
const PAGE_TABS: { key: PageTab; label: string }[] = [
  { key: 'confirm', label: '报价确认' },
  { key: 'fulfillment', label: '履约跟踪' },
]

export default function OrderConfirm() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  // 读取URL中的tab参数，默认为confirm
  const [searchParams, setSearchParams] = useSearchParams()
  const urlTab = searchParams.get('tab') as PageTab | null
  const activeTab: PageTab = (urlTab === 'fulfillment' || urlTab === 'confirm') ? urlTab : 'confirm'

  // store相关方法和数据
  const { fetchOrder, generateConfirmation, shipOrder, loading } = useStore()
  const [order, setOrder] = useState<Order | null>(null)

  // 报价确认相关状态
  const [delivery, setDelivery] = useState<'logistics' | 'local_delivery' | 'self_pickup'>('logistics')
  const [backorderNote, setBackorderNote] = useState('')
  const [paymentDueDays, setPaymentDueDays] = useState(30)
  const [modalOpen, setModalOpen] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [copied, setCopied] = useState(false)
  const [confirmVersion, setConfirmVersion] = useState<'customer' | 'internal'>('customer')

  // 新增发货Modal相关状态
  const [shipModalOpen, setShipModalOpen] = useState(false)
  const [shipItems, setShipItems] = useState<{ order_item_id: string; product_id: string; product_name: string; shipped_quantity: number; unit: string }[]>([])
  const [shipTrackingNo, setShipTrackingNo] = useState('')
  const [shipCarrier, setShipCarrier] = useState('')
  const [shipExpectedArrival, setShipExpectedArrival] = useState('')
  const [shipNote, setShipNote] = useState('')
  const [shipSubmitting, setShipSubmitting] = useState(false)

  // 加载订单详情
  useEffect(() => {
    if (id) fetchOrder(id).then((o) => {
      if (o) {
        setOrder(o)
        if (o.delivery_method) setDelivery(o.delivery_method)
        if (o.backorder_note) setBackorderNote(o.backorder_note)
        if (o.payment_due_days) setPaymentDueDays(o.payment_due_days)
      }
    })
  }, [id])

  // 切换Tab时更新URL参数
  const handleTabChange = (tab: PageTab) => {
    const params = new URLSearchParams(searchParams)
    params.set('tab', tab)
    setSearchParams(params)
  }

  if (!order) {
    return <div className="flex items-center justify-center h-full text-surface-400">{loading ? '加载中...' : '订单不存在'}</div>
  }

  // ===== 报价确认Tab相关计算 =====
  const giftCount = order.items.filter((i) => i.gifted).length
  const taxTotal = order.items.reduce((sum, i) => sum + i.subtotal * i.tax_rate / (1 + i.tax_rate), 0)
  const dueDate = new Date(order.created_at)
  dueDate.setDate(dueDate.getDate() + paymentDueDays)
  const statusInfo = STATUS_MAP[order.status] ?? STATUS_MAP.pending

  // 生成报价确认单
  const handleGenerate = async (version: 'customer' | 'internal' = confirmVersion) => {
    const text = await generateConfirmation(order.id, {
      delivery_method: delivery,
      backorder_note: backorderNote,
      payment_due_days: paymentDueDays,
      version,
    })
    if (text) { setConfirmText(text); setModalOpen(true) }
  }

  // 复制确认单到剪贴板
  const handleCopy = async () => {
    await navigator.clipboard.writeText(confirmText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // 切换确认单版本
  const handleVersionChange = (v: 'customer' | 'internal') => {
    setConfirmVersion(v)
    if (modalOpen && order) {
      generateConfirmation(order.id, {
        delivery_method: delivery,
        backorder_note: backorderNote,
        payment_due_days: paymentDueDays,
        version: v,
      }).then((text) => { if (text) setConfirmText(text) })
    }
  }

  // ===== 履约跟踪Tab相关计算 =====

  // 计算总订货数、已发货数、欠货数（排除赠品）
  const fulfillmentStats = useMemo(() => {
    let totalOrdered = 0
    let totalShipped = 0
    let totalBackorder = 0

    order.items.forEach((item) => {
      if (item.gifted) return // 赠品忽略发货统计
      totalOrdered += item.quantity
      totalShipped += item.shipped_quantity ?? 0
      totalBackorder += item.backorder_quantity ?? 0
    })

    // 如果store中已有计算好的总数则优先使用
    return {
      totalOrdered: order.total_ordered_qty ?? totalOrdered,
      totalShipped: order.total_shipped_qty ?? totalShipped,
      totalBackorder,
    }
  }, [order])

  // 发货进度百分比
  const shipProgressPct = fulfillmentStats.totalOrdered > 0
    ? (fulfillmentStats.totalShipped / fulfillmentStats.totalOrdered) * 100
    : 0

  // 预计到货日期（优先用最新的，其次用订单级别的）
  const expectedArrival = order.latest_expected_arrival || order.expected_arrival

  // 欠货品项列表（排除赠品）
  const backorderItemsList = useMemo(() => {
    return order.items.filter((i) => !i.gifted && (i.backorder_quantity ?? 0) > 0)
  }, [order])

  // 格式化日期显示
  const formatDate = (isoStr?: string) => {
    if (!isoStr) return '—'
    return isoStr.slice(0, 10)
  }

  // 格式化日期时间
  const formatDateTime = (isoStr: string) => {
    const d = new Date(isoStr)
    return d.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // 打开新增发货Modal，初始化每个品项的发货数量为剩余未发数量
  const openShipModal = () => {
    const initialItems = order.items
      .filter((item) => !item.gifted) // 赠品不参与发货
      .map((item) => {
        const remaining = item.quantity - (item.shipped_quantity ?? 0)
        return {
          order_item_id: item.id,
          product_id: item.product_id,
          product_name: item.product_name,
          shipped_quantity: Math.max(0, remaining), // 默认填剩余未发数量
          unit: item.unit,
        }
      })
      .filter((i) => i.shipped_quantity > 0) // 只保留还有待发的品项

    setShipItems(initialItems)
    setShipTrackingNo('')
    setShipCarrier('')
    setShipExpectedArrival('')
    setShipNote('')
    setShipModalOpen(true)
  }

  // 修改某个品项的发货数量
  const handleShipItemQtyChange = (orderItemId: string, qty: number) => {
    setShipItems((prev) =>
      prev.map((it) =>
        it.order_item_id === orderItemId
          ? { ...it, shipped_quantity: Math.max(0, qty) }
          : it
      )
    )
  }

  // 提交发货请求
  const handleSubmitShipment = async () => {
    if (!order || shipSubmitting) return

    // 过滤出发货数量>0的品项
    const validItems: ShipmentItem[] = shipItems
      .filter((i) => i.shipped_quantity > 0)
      .map((i) => ({
        id: '', // 后端生成
        order_item_id: i.order_item_id,
        product_id: i.product_id,
        product_name: i.product_name,
        shipped_quantity: i.shipped_quantity,
        unit: i.unit,
      }))

    if (validItems.length === 0) {
      alert('请至少填写一个品项的发货数量')
      return
    }

    setShipSubmitting(true)
    try {
      const result = await shipOrder(order.id, {
        items: validItems,
        tracking_no: shipTrackingNo || undefined,
        carrier: shipCarrier || undefined,
        expected_arrival: shipExpectedArrival || undefined,
        note: shipNote || undefined,
        shipped_by: '李明',
      })

      if (result) {
        // 发货成功后刷新订单详情
        const refreshed = await fetchOrder(order.id)
        if (refreshed) setOrder(refreshed)
        setShipModalOpen(false)
      } else {
        alert('发货失败，请重试')
      }
    } finally {
      setShipSubmitting(false)
    }
  }

  return (
    <div className="p-6 pb-28 max-w-5xl mx-auto relative min-h-full">
      {/* 页面头部 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h2 className="section-title mb-0">订单详情</h2>
            <span className={statusInfo.cls}>{statusInfo.label}</span>
          </div>
          <p className="text-sm text-surface-500">
            订单号：<span className="font-mono">{order.id}</span>
            <span className="mx-2">·</span>
            诊所：{order.clinic_name}
          </p>
        </div>
        <Link to="/orders" className="text-sm text-dental-500 hover:underline">返回订单列表</Link>
      </div>

      {/* Tab切换栏 */}
      <div className="flex gap-1 border-b border-surface-200 mb-6">
        {PAGE_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleTabChange(tab.key)}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-dental-500 text-dental-500'
                : 'border-transparent text-surface-500 hover:text-surface-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ================= 报价确认Tab ================= */}
      {activeTab === 'confirm' && (
        <>
          {/* 订单基础信息卡片 */}
          <div className="bg-white rounded-xl p-5 shadow-sm mb-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div><span className="text-surface-400">订单编号</span><p className="font-medium">{order.id}</p></div>
              <div><span className="text-surface-400">诊所名称</span><p className="font-medium">{order.clinic_name}</p></div>
              <div><span className="text-surface-400">下单日期</span><p className="font-medium">{order.created_at.slice(0, 10)}</p></div>
              <div><span className="text-surface-400">状态</span><p><span className={statusInfo.cls}>{statusInfo.label}</span></p></div>
            </div>
          </div>

          {/* 配送方式选择 */}
          <div className="bg-white rounded-xl p-5 shadow-sm mb-5">
            <p className="text-sm font-medium text-surface-700 mb-3">配送方式</p>
            <div className="flex gap-4">
              {DELIVERY_OPTIONS.map((opt) => (
                <label key={opt.value} className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-colors ${delivery === opt.value ? 'border-dental-500 bg-dental-50 text-dental-700' : 'border-surface-200 text-surface-500 hover:border-surface-300'}`}>
                  <input type="radio" name="delivery" value={opt.value} checked={delivery === opt.value} onChange={() => setDelivery(opt.value)} className="sr-only" />
                  <opt.icon className="w-4 h-4" /><span className="text-sm">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* 订单明细表格 */}
          <div className="bg-white rounded-xl shadow-sm mb-5 overflow-hidden">
            <table className="w-full text-sm">
              <thead><tr className="bg-surface-50 text-surface-500">
                <th className="px-4 py-3 text-left">序号</th><th className="px-4 py-3 text-left">品名+规格</th>
                <th className="px-4 py-3 text-left">品牌</th><th className="px-4 py-3 text-right">单价</th>
                <th className="px-4 py-3 text-center">数量</th><th className="px-4 py-3 text-center">税率</th>
                <th className="px-4 py-3 text-right">小计</th>
              </tr></thead>
              <tbody>
                {order.items.map((item, idx) => (
                  <tr key={item.id} className={`border-t border-surface-100 ${item.gifted ? 'bg-rose-50/50' : ''}`}>
                    <td className="px-4 py-3">{idx + 1}</td>
                    <td className="px-4 py-3 font-medium">{item.product_name}{item.gifted && <span className="badge-gift ml-2">赠品</span>}<span className="text-surface-400 ml-1">{item.spec}</span></td>
                    <td className="px-4 py-3 text-surface-500">{item.brand}</td>
                    <td className="px-4 py-3 text-right">¥{item.price.toFixed(2)}</td>
                    <td className="px-4 py-3 text-center">{item.quantity}{item.unit}</td>
                    <td className="px-4 py-3 text-center">{(item.tax_rate * 100).toFixed(0)}%</td>
                    <td className="px-4 py-3 text-right font-medium">¥{item.subtotal.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 欠货说明 */}
          <div className="bg-white rounded-xl p-5 shadow-sm mb-5">
            <p className="text-sm font-medium text-surface-700 mb-2">欠货说明</p>
            <textarea value={backorderNote} onChange={(e) => setBackorderNote(e.target.value)} placeholder="如有欠货或延迟发货的情况，请在此说明..." className="input-base min-h-[80px] resize-y" />
          </div>

          {/* 付款期限 */}
          <div className="bg-white rounded-xl p-5 shadow-sm mb-5">
            <p className="text-sm font-medium text-surface-700 mb-3">付款期限</p>
            <div className="flex gap-3">
              {PAYMENT_TERMS.map((term) => (
                <button
                  key={term.value}
                  onClick={() => setPaymentDueDays(term.value)}
                  className={`px-4 py-2 rounded-lg text-sm transition-colors border ${
                    paymentDueDays === term.value
                      ? 'bg-dental-500 border-dental-500 text-white'
                      : 'bg-white border-surface-200 text-surface-500 hover:border-dental-300'
                  }`}
                >
                  {term.label}
                </button>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-3 text-sm">
              <span className="text-surface-500">到期日：</span>
              <span className="font-medium text-accent-600">{dueDate.toISOString().slice(0, 10)}</span>
            </div>
          </div>

          {/* 底部固定操作栏 */}
          <div className="sticky bottom-0 bg-white border-t border-surface-200 shadow-lg z-10 -mx-6 px-6 py-4">
            <div className="max-w-5xl flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="text-sm text-surface-500">品项数 {order.items.length} 项，含赠品 {giftCount} 项</div>
                <div className="text-sm text-surface-500">税额 <span className="font-medium text-surface-700">¥{taxTotal.toFixed(2)}</span></div>
                <div className="flex items-center gap-1 bg-surface-100 rounded-lg p-1">
                  <button
                    onClick={() => setConfirmVersion('customer')}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                      confirmVersion === 'customer'
                        ? 'bg-white text-dental-600 shadow-sm'
                        : 'text-surface-500 hover:text-surface-700'
                    }`}
                  >
                    客户版
                  </button>
                  <button
                    onClick={() => setConfirmVersion('internal')}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                      confirmVersion === 'internal'
                        ? 'bg-white text-dental-600 shadow-sm'
                        : 'text-surface-500 hover:text-surface-700'
                    }`}
                  >
                    内部版
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xl font-bold text-dental-500">含税总价 ¥{order.total_amount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}</span>
                <button onClick={() => handleGenerate()} disabled={loading} className="btn-primary">生成确认单</button>
              </div>
            </div>
          </div>

          {/* 确认单预览Modal */}
          {modalOpen && (
            <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40" onClick={() => setModalOpen(false)}>
              <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col m-4" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-surface-900">报价确认单</h3>
                    <div className="flex items-center gap-0.5 bg-surface-100 rounded-lg p-0.5">
                      <button
                        onClick={() => handleVersionChange('customer')}
                        className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                          confirmVersion === 'customer'
                            ? 'bg-white text-dental-600 shadow-sm'
                            : 'text-surface-500 hover:text-surface-700'
                        }`}
                      >
                        客户版
                      </button>
                      <button
                        onClick={() => handleVersionChange('internal')}
                        className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                          confirmVersion === 'internal'
                            ? 'bg-white text-dental-600 shadow-sm'
                            : 'text-surface-500 hover:text-surface-700'
                        }`}
                      >
                        内部版
                      </button>
                    </div>
                  </div>
                  <button onClick={() => setModalOpen(false)} className="text-surface-400 hover:text-surface-600 text-lg">✕</button>
                </div>
                <pre className="flex-1 overflow-auto p-5 text-sm text-surface-700 whitespace-pre-wrap font-body">{confirmText}</pre>
                <div className="flex justify-end gap-3 px-5 py-4 border-t border-surface-100">
                  <button onClick={handleCopy} className="btn-secondary flex items-center gap-2">
                    {copied ? <><CheckCircle className="w-4 h-4" />已复制</> : <><Copy className="w-4 h-4" />一键复制</>}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ================= 履约跟踪Tab ================= */}
      {activeTab === 'fulfillment' && (
        <>
          {/* a. 发货状态总览：大数字展示 */}
          <div className="grid grid-cols-3 gap-4 mb-5">
            <div className="bg-white rounded-xl border border-surface-200 p-5 text-center">
              <Package className="w-6 h-6 mx-auto text-dental-500 mb-2" />
              <p className="text-3xl font-bold text-surface-900">{fulfillmentStats.totalOrdered}</p>
              <p className="text-xs text-surface-400 mt-1">总订货数</p>
            </div>
            <div className="bg-white rounded-xl border border-surface-200 p-5 text-center">
              <Truck className="w-6 h-6 mx-auto text-emerald-500 mb-2" />
              <p className="text-3xl font-bold text-emerald-600">{fulfillmentStats.totalShipped}</p>
              <p className="text-xs text-surface-400 mt-1">已发货数</p>
            </div>
            <div className="bg-white rounded-xl border border-surface-200 p-5 text-center">
              <AlertTriangle className="w-6 h-6 mx-auto text-rose-500 mb-2" />
              <p className="text-3xl font-bold text-rose-600">{fulfillmentStats.totalBackorder}</p>
              <p className="text-xs text-surface-400 mt-1">欠货数</p>
            </div>
          </div>

          {/* b. 发货进度条 */}
          <div className="bg-white rounded-xl border border-surface-200 p-5 mb-5">
            <div className="flex items-center justify-between text-sm mb-3">
              <span className="font-medium text-surface-700 flex items-center gap-1.5">
                <Truck className="w-4 h-4" /> 发货进度
              </span>
              <span className="text-surface-500">
                <span className="font-medium text-dental-600">{shipProgressPct.toFixed(1)}%</span>
                <span className="mx-2">·</span>
                {fulfillmentStats.totalShipped} / {fulfillmentStats.totalOrdered} 件
              </span>
            </div>
            <div className="h-3 bg-surface-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  shipProgressPct >= 100
                    ? 'bg-emerald-500'
                    : shipProgressPct > 0
                      ? 'bg-gradient-to-r from-dental-400 to-dental-600'
                      : 'bg-surface-300'
                }`}
                style={{ width: `${Math.min(shipProgressPct, 100)}%` }}
              />
            </div>
          </div>

          {/* c. 预计到货日期展示 */}
          {expectedArrival && (
            <div className="bg-white rounded-xl border border-surface-200 p-5 mb-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-accent-50 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-accent-500" />
                  </div>
                  <div>
                    <p className="text-xs text-surface-400">预计到货日期</p>
                    <p className="text-lg font-semibold text-accent-600">{formatDate(expectedArrival)}</p>
                  </div>
                </div>
                {order.latest_carrier && order.latest_tracking_no && (
                  <div className="text-right text-sm">
                    <p className="text-xs text-surface-400">最新物流</p>
                    <p className="font-medium text-surface-700">{order.latest_carrier} {order.latest_tracking_no}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* g. 欠货说明栏 */}
          {(order.backorder_note || backorderItemsList.length > 0) && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-5 mb-5">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-orange-800 mb-2">欠货说明</h4>
                  {backorderItemsList.length > 0 && (
                    <ul className="text-sm text-orange-700 space-y-1 mb-2">
                      {backorderItemsList.map((item) => (
                        <li key={item.id}>
                          · {item.product_name}：欠货 <span className="font-semibold">{item.backorder_quantity}</span>{item.unit}
                        </li>
                      ))}
                    </ul>
                  )}
                  {order.backorder_note && (
                    <p className="text-sm text-orange-700 whitespace-pre-wrap">{order.backorder_note}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* d. 订单项发货明细列表 */}
          <div className="bg-white rounded-xl border border-surface-200 shadow-sm mb-5 overflow-hidden">
            <div className="px-5 py-3 border-b border-surface-100 flex items-center justify-between">
              <h3 className="font-medium text-surface-700 flex items-center gap-1.5">
                <FileText className="w-4 h-4" /> 订单项发货明细
              </h3>
              <span className="text-xs text-surface-400">赠品不参与发货统计</span>
            </div>
            <table className="w-full text-sm">
              <thead><tr className="bg-surface-50 text-surface-500">
                <th className="px-4 py-3 text-left">品名</th>
                <th className="px-4 py-3 text-center">订货数</th>
                <th className="px-4 py-3 text-center">已发数</th>
                <th className="px-4 py-3 text-center">欠货数</th>
                <th className="px-4 py-3 text-center">待发数</th>
              </tr></thead>
              <tbody>
                {order.items.map((item) => {
                  // 赠品单独标识，跳过发货统计
                  if (item.gifted) {
                    return (
                      <tr key={item.id} className="border-t border-surface-100 bg-rose-50/50">
                        <td className="px-4 py-3 font-medium text-surface-500">
                          {item.product_name}
                          <span className="badge-gift ml-2">赠品</span>
                        </td>
                        <td colSpan={4} className="px-4 py-3 text-center text-xs text-surface-400">
                          赠品，忽略发货
                        </td>
                      </tr>
                    )
                  }
                  const ordered = item.quantity
                  const shipped = item.shipped_quantity ?? 0
                  const backorder = item.backorder_quantity ?? 0
                  const remaining = Math.max(0, ordered - shipped)
                  return (
                    <tr key={item.id} className="border-t border-surface-100">
                      <td className="px-4 py-3 font-medium text-surface-800">{item.product_name}</td>
                      <td className="px-4 py-3 text-center text-surface-600">{ordered}{item.unit}</td>
                      <td className="px-4 py-3 text-center text-emerald-600 font-medium">{shipped}{item.unit}</td>
                      <td className="px-4 py-3 text-center">
                        {backorder > 0 ? (
                          <span className="text-rose-600 font-semibold">{backorder}{item.unit}</span>
                        ) : (
                          <span className="text-surface-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {remaining > 0 ? (
                          <span className="text-dental-600 font-medium">{remaining}{item.unit}</span>
                        ) : (
                          <span className="text-surface-400">0{item.unit}</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* f. 新增发货按钮 */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-surface-700 flex items-center gap-1.5">
              <Truck className="w-4 h-4" /> 发货记录
              <span className="text-xs text-surface-400 font-normal">
                ({order.shipments?.length ?? 0} 笔)
              </span>
            </h3>
            <button
              onClick={openShipModal}
              disabled={fulfillmentStats.totalOrdered - fulfillmentStats.totalShipped <= 0}
              className="btn-primary text-sm flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" /> 新增发货
            </button>
          </div>

          {/* e. 发货记录时间线 */}
          {(!order.shipments || order.shipments.length === 0) ? (
            <div className="text-center py-16 text-surface-400 bg-white rounded-xl border border-dashed border-surface-200">
              <Truck className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">暂无发货记录</p>
            </div>
          ) : (
            <div className="relative pl-6">
              {/* 时间线竖线 */}
              <div className="absolute left-[7px] top-2 bottom-2 w-px bg-surface-200" />
              <div className="space-y-4">
                {[...order.shipments].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map((shipment, idx) => (
                  <div key={shipment.id} className="relative">
                    {/* 时间线节点 */}
                    <div className={`absolute -left-6 top-4 w-4 h-4 rounded-full border-2 border-white shadow flex items-center justify-center ${
                      idx === 0 ? 'bg-dental-500' : 'bg-surface-300'
                    }`} />
                    <div className="bg-white rounded-xl border border-surface-200 p-5 card-hover">
                      {/* 发货记录头部 */}
                      <div className="flex items-start justify-between gap-3 mb-3 pb-3 border-b border-surface-100">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-semibold text-surface-800">
                              第 {order.shipments!.length - idx} 次发货
                            </span>
                            {idx === 0 && (
                              <span className="badge-pending">最新</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-surface-400">
                            <Clock className="w-3 h-3" />
                            {formatDateTime(shipment.created_at)}
                            {shipment.shipped_by && (
                              <span className="ml-2">· 操作人：{shipment.shipped_by}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* 物流信息 */}
                      <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
                        {(shipment.carrier || shipment.tracking_no) && (
                          <div>
                            <span className="text-xs text-surface-400 block mb-0.5">物流信息</span>
                            <p className="font-medium text-surface-700">
                              {shipment.carrier || '—'}
                              {shipment.tracking_no && ` ${shipment.tracking_no}`}
                            </p>
                          </div>
                        )}
                        {shipment.expected_arrival && (
                          <div>
                            <span className="text-xs text-surface-400 block mb-0.5">预计到货</span>
                            <p className="font-medium text-accent-600 flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              {formatDate(shipment.expected_arrival)}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* 发货明细品项 */}
                      <div className="bg-surface-50 rounded-lg p-3 mb-3">
                        <p className="text-xs text-surface-400 mb-2">发货明细</p>
                        <ul className="space-y-1.5">
                          {shipment.items.map((si, siIdx) => (
                            <li key={siIdx} className="flex items-center justify-between text-sm">
                              <span className="text-surface-700">{si.product_name}</span>
                              <span className="font-medium text-dental-600">{si.shipped_quantity}{si.unit}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* 备注 */}
                      {shipment.note && (
                        <div className="text-sm">
                          <span className="text-xs text-surface-400 block mb-0.5">备注</span>
                          <p className="text-surface-600 whitespace-pre-wrap">{shipment.note}</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 新增发货Modal */}
          {shipModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShipModalOpen(false)}>
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col m-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <div className="px-5 py-4 border-b border-surface-100 flex items-center justify-between flex-shrink-0">
                  <h3 className="font-semibold text-surface-900 flex items-center gap-2">
                    <Plus className="w-5 h-5 text-dental-500" />
                    新增发货记录
                  </h3>
                  <button
                    onClick={() => setShipModalOpen(false)}
                    className="w-8 h-8 rounded-lg hover:bg-surface-100 flex items-center justify-center text-surface-400 hover:text-surface-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex-1 overflow-auto p-5 space-y-5">
                  {/* 发货品项列表 */}
                  <div>
                    <label className="text-sm font-medium text-surface-600 mb-2 block">发货品项（填写本次发货数量）</label>
                    <div className="border border-surface-200 rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead><tr className="bg-surface-50 text-surface-500">
                          <th className="px-3 py-2.5 text-left text-xs font-medium">品名</th>
                          <th className="px-3 py-2.5 text-center text-xs font-medium w-24">待发数</th>
                          <th className="px-3 py-2.5 text-center text-xs font-medium w-28">本次发</th>
                        </tr></thead>
                        <tbody>
                          {shipItems.length === 0 ? (
                            <tr>
                              <td colSpan={3} className="px-3 py-6 text-center text-surface-400 text-sm">
                                所有品项已发货完成
                              </td>
                            </tr>
                          ) : shipItems.map((item) => {
                            // 查找原始订单项获取待发数量
                            const origItem: OrderItem | undefined = order.items.find((oi) => oi.id === item.order_item_id)
                            const remainingQty = origItem
                              ? origItem.quantity - (origItem.shipped_quantity ?? 0)
                              : item.shipped_quantity
                            return (
                              <tr key={item.order_item_id} className="border-t border-surface-100">
                                <td className="px-3 py-2.5 text-surface-800 font-medium">{item.product_name}</td>
                                <td className="px-3 py-2.5 text-center text-dental-600">{remainingQty}{item.unit}</td>
                                <td className="px-3 py-2.5">
                                  <input
                                    type="number"
                                    min={0}
                                    max={remainingQty}
                                    value={item.shipped_quantity}
                                    onChange={(e) => handleShipItemQtyChange(item.order_item_id, parseInt(e.target.value) || 0)}
                                    className="input-base text-sm py-1.5 text-center"
                                  />
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* 物流信息 */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-surface-600 mb-1.5 block">承运人 / 快递公司</label>
                      <input
                        type="text"
                        placeholder="如：顺丰、京东物流等"
                        value={shipCarrier}
                        onChange={(e) => setShipCarrier(e.target.value)}
                        className="input-base text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-surface-600 mb-1.5 block">运单号</label>
                      <input
                        type="text"
                        placeholder="请输入物流单号"
                        value={shipTrackingNo}
                        onChange={(e) => setShipTrackingNo(e.target.value)}
                        className="input-base text-sm"
                      />
                    </div>
                  </div>

                  {/* 预计到货日期 */}
                  <div>
                    <label className="text-sm font-medium text-surface-600 mb-1.5 block">预计到货日期</label>
                    <input
                      type="date"
                      value={shipExpectedArrival}
                      onChange={(e) => setShipExpectedArrival(e.target.value)}
                      className="input-base text-sm"
                    />
                  </div>

                  {/* 备注 */}
                  <div>
                    <label className="text-sm font-medium text-surface-600 mb-1.5 block">备注</label>
                    <textarea
                      value={shipNote}
                      onChange={(e) => setShipNote(e.target.value)}
                      placeholder="发货相关备注信息..."
                      className="input-base text-sm min-h-[80px] resize-y"
                    />
                  </div>
                </div>

                <div className="px-5 py-4 bg-surface-50 border-t border-surface-100 flex justify-end gap-3 flex-shrink-0">
                  <button
                    onClick={() => setShipModalOpen(false)}
                    className="btn-secondary text-sm"
                    disabled={shipSubmitting}
                  >
                    取消
                  </button>
                  <button
                    onClick={handleSubmitShipment}
                    disabled={shipSubmitting || shipItems.every((i) => i.shipped_quantity <= 0)}
                    className="btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {shipSubmitting ? '提交中...' : '确认发货'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
