import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Copy, CheckCircle, Truck, Bike, PackageOpen } from 'lucide-react'
import { useStore } from '@/store/useStore'
import type { Order } from '@/store/useStore'

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  pending: { label: '待处理', cls: 'badge-pending' },
  partial: { label: '部分发货', cls: 'badge-partial' },
  completed: { label: '已完成', cls: 'badge-completed' },
}

const DELIVERY_OPTIONS: Array<{ value: 'logistics' | 'local_delivery' | 'self_pickup'; label: string; icon: typeof Truck }> = [
  { value: 'logistics', label: '物流配送', icon: Truck },
  { value: 'local_delivery', label: '同城送货', icon: Bike },
  { value: 'self_pickup', label: '自提', icon: PackageOpen },
]

const PAYMENT_TERMS = [
  { value: 7, label: '7天' },
  { value: 15, label: '15天' },
  { value: 30, label: '30天' },
  { value: 60, label: '60天' },
]

export default function OrderConfirm() {
  const { id } = useParams<{ id: string }>()
  const { fetchOrder, generateConfirmation, loading } = useStore()
  const [order, setOrder] = useState<Order | null>(null)
  const [delivery, setDelivery] = useState<'logistics' | 'local_delivery' | 'self_pickup'>('logistics')
  const [backorderNote, setBackorderNote] = useState('')
  const [paymentDueDays, setPaymentDueDays] = useState(30)
  const [modalOpen, setModalOpen] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [copied, setCopied] = useState(false)

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

  if (!order) {
    return <div className="flex items-center justify-center h-full text-surface-400">{loading ? '加载中...' : '订单不存在'}</div>
  }

  const giftCount = order.items.filter((i) => i.gifted).length
  const taxTotal = order.items.reduce((sum, i) => sum + i.subtotal * i.tax_rate / (1 + i.tax_rate), 0)
  const dueDate = new Date(order.created_at)
  dueDate.setDate(dueDate.getDate() + paymentDueDays)
  const statusInfo = STATUS_MAP[order.status] ?? STATUS_MAP.pending

  const handleGenerate = async () => {
    const text = await generateConfirmation(order.id, {
      delivery_method: delivery,
      backorder_note: backorderNote,
      payment_due_days: paymentDueDays,
    })
    if (text) { setConfirmText(text); setModalOpen(true) }
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(confirmText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="p-6 pb-28 max-w-5xl mx-auto relative min-h-full">
      <div className="flex items-center justify-between mb-6">
        <h2 className="section-title mb-0">报价确认</h2>
        <Link to="/" className="text-sm text-dental-500 hover:underline">返回工作台</Link>
      </div>

      <div className="bg-white rounded-xl p-5 shadow-sm mb-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div><span className="text-surface-400">订单编号</span><p className="font-medium">{order.id}</p></div>
          <div><span className="text-surface-400">诊所名称</span><p className="font-medium">{order.clinic_name}</p></div>
          <div><span className="text-surface-400">下单日期</span><p className="font-medium">{order.created_at.slice(0, 10)}</p></div>
          <div><span className="text-surface-400">状态</span><p><span className={statusInfo.cls}>{statusInfo.label}</span></p></div>
        </div>
      </div>

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

      <div className="bg-white rounded-xl p-5 shadow-sm mb-5">
        <p className="text-sm font-medium text-surface-700 mb-2">欠货说明</p>
        <textarea value={backorderNote} onChange={(e) => setBackorderNote(e.target.value)} placeholder="如有欠货或延迟发货的情况，请在此说明..." className="input-base min-h-[80px] resize-y" />
      </div>

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

      <div className="sticky bottom-0 bg-white border-t border-surface-200 shadow-lg z-10 -mx-6 px-6 py-4">
        <div className="max-w-5xl flex items-center justify-between">
          <div className="text-sm text-surface-500">品项数 {order.items.length} 项，含赠品 {giftCount} 项</div>
          <div className="text-sm text-surface-500">税额 <span className="font-medium text-surface-700">¥{taxTotal.toFixed(2)}</span></div>
          <div className="flex items-center gap-4">
            <span className="text-xl font-bold text-dental-500">含税总价 ¥{order.total_amount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}</span>
            <button onClick={handleGenerate} disabled={loading} className="btn-primary">生成确认单</button>
          </div>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40" onClick={() => setModalOpen(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col m-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100">
              <h3 className="font-semibold text-surface-900">报价确认单</h3>
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
    </div>
  )
}
