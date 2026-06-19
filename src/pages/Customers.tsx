import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, MapPin, Phone, User, ShoppingCart, Calendar } from 'lucide-react'
import { useStore } from '@/store/useStore'

const AREAS = ['全部', '北京', '上海', '广州', '深圳', '成都', '杭州']

export default function Customers() {
  const navigate = useNavigate()
  const { clinics, fetchClinics, loading } = useStore()
  const [search, setSearch] = useState('')
  const [area, setArea] = useState('全部')

  useEffect(() => {
    fetchClinics(search || undefined, area === '全部' ? undefined : area)
  }, [search, area])

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="section-title">客户档案</h1>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
          <input
            type="text"
            placeholder="搜索客户名称/联系人/地址..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-base pl-10"
          />
        </div>
        <select
          value={area}
          onChange={(e) => setArea(e.target.value)}
          className="input-base w-auto min-w-[120px]"
        >
          {AREAS.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-20 text-surface-400">加载中...</div>
      ) : clinics.length === 0 ? (
        <div className="text-center py-20 text-surface-400">暂无客户数据</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clinics.map((clinic) => (
            <div
              key={clinic.id}
              onClick={() => navigate(`/customers/${clinic.id}`)}
              className="bg-white rounded-xl border border-surface-200 p-5 cursor-pointer card-hover"
            >
              <div className="mb-3">
                <h3 className="text-base font-semibold text-surface-900">{clinic.name}</h3>
                <p className="text-sm text-surface-500 flex items-center gap-1 mt-1">
                  <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">{clinic.address}</span>
                </p>
              </div>

              <div className="flex items-center gap-4 text-sm text-surface-600 mb-3">
                <span className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5" />
                  {clinic.contact}
                </span>
                <span className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5" />
                  {clinic.phone}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm pt-3 border-t border-surface-100">
                <span className="flex items-center gap-1 text-surface-500">
                  <Calendar className="w-3.5 h-3.5" />
                  上次采购: {clinic.last_purchase_date || '暂无'}
                </span>
                <span className={`flex items-center gap-1 font-medium ${clinic.outstanding_order_count ? 'text-accent-500' : 'text-surface-400'}`}>
                  <ShoppingCart className="w-3.5 h-3.5" />
                  未结订单: {clinic.outstanding_order_count ?? 0}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
