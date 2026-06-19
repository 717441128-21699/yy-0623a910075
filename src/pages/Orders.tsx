import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Package, Truck, Calendar, AlertTriangle, Eye, ClipboardList } from 'lucide-react'
import { useStore } from '@/store/useStore'
import type { Order } from '@/store/useStore'

// 订单状态映射配置：显示文案和样式class
const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  pending: { label: '待确认', cls: 'badge-pending' },
  partial: { label: '部分发货', cls: 'badge-partial' },
  completed: { label: '已完成', cls: 'badge-completed' },
}

// 顶部筛选Tab配置
type FilterTab = 'all' | 'pending' | 'partial' | 'completed'
const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待确认' },
  { key: 'partial', label: '部分发货' },
  { key: 'completed', label: '已完成' },
]

export default function Orders() {
  const navigate = useNavigate()
  // 从store中获取订单数据和加载方法
  const { orders, fetchOrders, loading } = useStore()
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all')

  // 组件挂载时加载订单列表
  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  // 根据筛选Tab过滤订单列表
  const filteredOrders = useMemo(() => {
    if (activeFilter === 'all') return orders
    return orders.filter((o) => o.status === activeFilter)
  }, [orders, activeFilter])

  // 计算订单欠货总项数：将 backorder_items 中每个品项的 backorder 数量求和
  const calcBackorderCount = (order: Order): number => {
    if (!order.backorder_items || order.backorder_items.length === 0) return 0
    return order.backorder_items.reduce((sum, item) => sum + (item.backorder || 0), 0)
  }

  // 格式化日期显示
  const formatDate = (isoStr?: string) => {
    if (!isoStr) return '—'
    return isoStr.slice(0, 10)
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* 页面标题 */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-surface-900 flex items-center gap-2">
          <Package className="w-6 h-6 text-dental-500" />
          订单管理
        </h1>
        <button
          onClick={() => navigate('/order/new')}
          className="btn-primary text-sm flex items-center gap-1.5"
        >
          <Package className="w-4 h-4" /> 新建订单
        </button>
      </div>

      {/* 状态筛选Tab */}
      <div className="flex gap-1 border-b border-surface-200 mb-6">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveFilter(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeFilter === tab.key
                ? 'border-dental-500 text-dental-500'
                : 'border-transparent text-surface-500 hover:text-surface-700'
            }`}
          >
            {tab.label}
            {/* 显示各状态的订单数量 */}
            <span className="ml-1.5 text-xs text-surface-400">
              ({tab.key === 'all' ? orders.length : orders.filter((o) => o.status === tab.key).length})
            </span>
          </button>
        ))}
      </div>

      {/* 订单列表 */}
      {loading && filteredOrders.length === 0 ? (
        <div className="text-center py-20 text-surface-400">加载中...</div>
      ) : filteredOrders.length === 0 ? (
        <div className="text-center py-20 text-surface-400 bg-white rounded-xl border border-dashed border-surface-200">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">暂无订单数据</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredOrders.map((order) => {
            const statusInfo = STATUS_MAP[order.status] ?? STATUS_MAP.pending
            const backorderCount = calcBackorderCount(order)
            const progressPct = order.shipment_progress_pct ?? 0
            const totalOrdered = order.total_ordered_qty ?? 0
            const totalShipped = order.total_shipped_qty ?? 0

            return (
              <div
                key={order.id}
                className="bg-white rounded-xl border border-surface-200 p-5 card-hover"
              >
                {/* 顶部：订单编号 + 诊所名称 + 状态徽章 */}
                <div className="flex items-start justify-between mb-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-mono text-surface-700 truncate">{order.id}</span>
                      {backorderCount > 0 && (
                        // 欠货数量徽章：橙色显示
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-50 text-orange-700 border border-orange-200">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          {backorderCount}项欠货
                        </span>
                      )}
                    </div>
                    <p className="text-base font-semibold text-surface-900 truncate">
                      {order.clinic_name}
                    </p>
                  </div>
                  <span className={statusInfo.cls + ' flex-shrink-0 ml-3'}>
                    {statusInfo.label}
                  </span>
                </div>

                {/* 发货进度条 */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-xs text-surface-500 mb-1.5">
                    <span className="flex items-center gap-1">
                      <Truck className="w-3.5 h-3.5" />
                      发货进度
                    </span>
                    <span>
                      {totalShipped} / {totalOrdered} 件
                      <span className="ml-1 font-medium text-dental-600">
                        ({progressPct.toFixed(0)}%)
                      </span>
                    </span>
                  </div>
                  <div className="h-2 bg-surface-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        progressPct >= 100
                          ? 'bg-emerald-500'
                          : progressPct > 0
                            ? 'bg-dental-500'
                            : 'bg-surface-300'
                      }`}
                      style={{ width: `${Math.min(progressPct, 100)}%` }}
                    />
                  </div>
                </div>

                {/* 物流信息 + 预计到货 */}
                {(order.latest_carrier || order.latest_tracking_no || order.latest_expected_arrival) && (
                  <div className="bg-surface-50 rounded-lg p-3 mb-4 text-sm">
                    {order.latest_carrier && order.latest_tracking_no && (
                      <div className="flex items-center gap-2 mb-1.5">
                        <Truck className="w-3.5 h-3.5 text-surface-400 flex-shrink-0" />
                        <span className="text-surface-500">物流：</span>
                        <span className="font-medium text-surface-700">
                          {order.latest_carrier} {order.latest_tracking_no}
                        </span>
                      </div>
                    )}
                    {order.latest_expected_arrival && (
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-surface-400 flex-shrink-0" />
                        <span className="text-surface-500">预计到货：</span>
                        <span className="font-medium text-accent-600">
                          {formatDate(order.latest_expected_arrival)}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* 底部信息栏：总金额 + 创建时间 + 操作按钮 */}
                <div className="flex items-end justify-between pt-3 border-t border-surface-100">
                  <div>
                    <div className="text-lg font-bold text-dental-500">
                      ¥{order.total_amount.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-xs text-surface-400 mt-1 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(order.created_at)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => navigate(`/order/confirm/${order.id}`)}
                      className="btn-secondary text-sm flex items-center gap-1 px-3 py-1.5"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      查看详情
                    </button>
                    <button
                      onClick={() => navigate(`/order/confirm/${order.id}?tab=fulfillment`)}
                      className="btn-primary text-sm flex items-center gap-1 px-3 py-1.5"
                    >
                      <ClipboardList className="w-3.5 h-3.5" />
                      履约跟踪
                    </button>
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
