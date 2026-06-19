import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, Minus, X, ShoppingCart, Stethoscope, Sparkles, Gift, CheckCircle } from 'lucide-react'
import { useStore } from '@/store/useStore'

export default function OrderNew() {
  const navigate = useNavigate()
  const {
    clinics, fetchClinics, products, fetchProducts,
    recommendedProducts, fetchRecommendations,
    giftPolicies, fetchGiftPolicies,
    cart, addToCart, updateCartItemQuantity, removeFromCart, clearCart,
    applyGiftPoliciesToCart, selectedClinic, setSelectedClinic, createOrder,
  } = useStore()

  const [clinicSearch, setClinicSearch] = useState('')
  const [clinicOpen, setClinicOpen] = useState(false)
  const [implantCount, setImplantCount] = useState(0)
  const [orthoCount, setOrthoCount] = useState(0)
  const [cleaningCount, setCleaningCount] = useState(0)
  const [productSearch, setProductSearch] = useState('')
  const [addingId, setAddingId] = useState<string | null>(null)
  const [addQty, setAddQty] = useState(1)

  useEffect(() => { fetchClinics() }, [])
  useEffect(() => { fetchGiftPolicies() }, [])

  const filteredClinics = clinics.filter(c =>
    c.name.includes(clinicSearch) || c.address?.includes(clinicSearch)
  )

  const handleRecommend = () => {
    if (implantCount + orthoCount + cleaningCount === 0) return
    fetchRecommendations(implantCount, orthoCount, cleaningCount)
  }

  const handleProductSearch = () => {
    if (productSearch.trim()) fetchProducts(productSearch.trim())
  }

  const startAdd = (productId: string, defaultQty = 1) => {
    setAddingId(productId)
    setAddQty(defaultQty)
  }

  const confirmAdd = (product: typeof products[0]) => {
    addToCart(product, addQty)
    setAddingId(null)
    setAddQty(1)
  }

  const handleSubmit = async () => {
    if (!selectedClinic || cart.length === 0) return
    applyGiftPoliciesToCart()
    const items = cart.map(i => ({ product_id: i.product.id, quantity: i.quantity }))
    const order = await createOrder(selectedClinic.id, items)
    if (order) {
      clearCart()
      navigate(`/order/confirm/${order.id}`)
    }
  }

  const totalAmount = cart.reduce((sum, i) => sum + i.product.price * i.quantity * (1 + i.product.tax_rate), 0)
  const totalItems = cart.reduce((sum, i) => sum + i.quantity, 0)

  const applicablePolicies = giftPolicies.filter(gp =>
    cart.some(item => item.product.id === gp.product_id)
  )

  return (
    <div className="h-full p-6">
      <h1 className="section-title flex items-center gap-2">
        <ShoppingCart className="w-5 h-5 text-dental-500" /> 下单中心
      </h1>
      <div className="grid grid-cols-12 gap-5 h-[calc(100%-3rem)]">
        {/* Left: Scene Selection */}
        <div className="col-span-4 flex flex-col gap-4 overflow-y-auto pr-1">
          {/* Clinic Selector */}
          <div className="relative">
            <label className="text-sm font-medium text-surface-600 mb-1 block">选择诊所</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
              <input
                className="input-base pl-9 cursor-pointer"
                placeholder="搜索诊所..."
                value={selectedClinic ? selectedClinic.name : clinicSearch}
                onChange={e => { setClinicSearch(e.target.value); setSelectedClinic(null); setClinicOpen(true) }}
                onFocus={() => setClinicOpen(true)}
                onBlur={() => setTimeout(() => setClinicOpen(false), 150)}
              />
            </div>
            {clinicOpen && !selectedClinic && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-surface-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {filteredClinics.map(c => (
                  <button key={c.id} className="w-full text-left px-3 py-2 hover:bg-dental-50 text-sm"
                    onMouseDown={() => { setSelectedClinic(c); setClinicSearch(''); setClinicOpen(false) }}>
                    <span className="font-medium">{c.name}</span>
                    <span className="text-surface-400 text-xs ml-2">{c.area}</span>
                  </button>
                ))}
                {filteredClinics.length === 0 && <p className="px-3 py-2 text-sm text-surface-400">无匹配诊所</p>}
              </div>
            )}
          </div>

          {/* Scene Inputs */}
          <div className="bg-white rounded-xl border border-surface-200 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-surface-700 flex items-center gap-1.5">
              <Stethoscope className="w-4 h-4 text-dental-500" /> 场景用量
            </h3>
            {[
              { icon: '🦷', label: '近期种植病例数', value: implantCount, set: setImplantCount },
              { icon: '🔧', label: '正畸复诊人次', value: orthoCount, set: setOrthoCount },
              { icon: '✨', label: '洁牙预约人次', value: cleaningCount, set: setCleaningCount },
            ].map(f => (
              <div key={f.label} className="flex items-center gap-2">
                <span className="text-lg">{f.icon}</span>
                <label className="text-xs text-surface-500 w-24 flex-shrink-0">{f.label}</label>
                <input type="number" min={0} className="input-base text-sm" value={f.value || ''}
                  onChange={e => f.set(Math.max(0, Number(e.target.value)))} />
              </div>
            ))}
            <button className="btn-accent w-full flex items-center justify-center gap-1.5 text-sm"
              onClick={handleRecommend} disabled={implantCount + orthoCount + cleaningCount === 0}>
              <Sparkles className="w-4 h-4" /> 智能推荐
            </button>
          </div>

          {/* Recommendations */}
          {recommendedProducts.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-surface-700">推荐产品</h3>
              {recommendedProducts.map(rp => (
                <div key={rp.product.id} className="bg-white rounded-lg border border-surface-200 p-3 card-hover">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{rp.product.name}</p>
                      <p className="text-xs text-surface-400">{rp.product.brand} · <span className="text-dental-600">{rp.scene}</span></p>
                      <p className="text-xs text-surface-500 mt-0.5">建议 {rp.suggested_quantity}{rp.product.unit} · ¥{rp.product.price}/{rp.product.unit}</p>
                    </div>
                    {addingId === rp.product.id ? (
                      <div className="flex items-center gap-1">
                        <input type="number" min={1} className="input-base w-14 text-sm text-center py-1"
                          value={addQty} onChange={e => setAddQty(Math.max(1, Number(e.target.value)))} />
                        <button className="btn-primary px-2 py-1 text-xs" onClick={() => confirmAdd(rp.product)}>确认</button>
                      </div>
                    ) : (
                      <button className="btn-secondary px-2 py-1 text-xs flex items-center gap-0.5"
                        onClick={() => startAdd(rp.product.id, rp.suggested_quantity)}>
                        <Plus className="w-3 h-3" /> 加入
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Manual Search */}
          <div className="bg-white rounded-xl border border-surface-200 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-surface-700">手动搜索</h3>
            <div className="flex gap-2">
              <input className="input-base text-sm flex-1" placeholder="搜索产品名称..."
                value={productSearch} onChange={e => setProductSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleProductSearch()} />
              <button className="btn-secondary px-3 py-2 text-sm flex items-center gap-1"
                onClick={handleProductSearch}>
                <Search className="w-4 h-4" /> 搜索
              </button>
            </div>
            {products.length > 0 && (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {products.map(p => (
                  <div key={p.id} className="flex items-center justify-between py-1.5 border-b border-surface-100 last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{p.name}</p>
                      <p className="text-xs text-surface-400">{p.brand} · ¥{p.price}/{p.unit}</p>
                    </div>
                    {addingId === p.id ? (
                      <div className="flex items-center gap-1">
                        <input type="number" min={1} className="input-base w-14 text-sm text-center py-1"
                          value={addQty} onChange={e => setAddQty(Math.max(1, Number(e.target.value)))} />
                        <button className="btn-primary px-2 py-1 text-xs" onClick={() => confirmAdd(p)}>确认</button>
                      </div>
                    ) : (
                      <button className="btn-secondary px-2 py-1 text-xs" onClick={() => startAdd(p.id, 1)}>
                        <Plus className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Center: Cart */}
        <div className="col-span-5 flex flex-col bg-white rounded-xl border border-surface-200 overflow-hidden">
          <div className="p-4 border-b border-surface-100">
            <h2 className="text-sm font-semibold text-surface-700">已选品项</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-surface-400">
                <ShoppingCart className="w-10 h-10 mb-2" />
                <p className="text-sm">暂无品项，请从左侧添加</p>
              </div>
            ) : cart.map(item => (
              <div key={item.product.id} className="border border-surface-100 rounded-lg p-3 relative">
                <button className="absolute top-2 right-2 text-surface-400 hover:text-red-500"
                  onClick={() => removeFromCart(item.product.id)}>
                  <X className="w-4 h-4" />
                </button>
                <p className="text-sm font-medium pr-6">{item.product.name}</p>
                <p className="text-xs text-surface-400">{item.product.brand} · {item.product.spec}</p>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-2">
                    <button className="w-6 h-6 rounded border border-surface-200 flex items-center justify-center hover:bg-surface-50"
                      onClick={() => updateCartItemQuantity(item.product.id, item.quantity - 1)}>
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-sm w-8 text-center">{item.quantity}</span>
                    <button className="w-6 h-6 rounded border border-surface-200 flex items-center justify-center hover:bg-surface-50"
                      onClick={() => updateCartItemQuantity(item.product.id, item.quantity + 1)}>
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-surface-400">¥{item.product.price}/{item.product.unit}</p>
                    <p className="text-sm font-semibold text-dental-600">
                      ¥{(item.product.price * item.quantity * (1 + item.product.tax_rate)).toFixed(2)}
                    </p>
                  </div>
                </div>
                {item.appliedGiftPolicy && (
                  <div className="badge-gift mt-2 inline-flex">
                    <Gift className="w-3 h-3 mr-1" /> {item.appliedGiftPolicy.description}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="border-t border-surface-100 p-4 bg-surface-50 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-surface-500">共 {totalItems} 件</span>
              <span className="font-semibold">合计（含税）¥{totalAmount.toFixed(2)}</span>
            </div>
            <button className="btn-primary w-full text-sm"
              disabled={cart.length === 0 || !selectedClinic} onClick={handleSubmit}>
              提交订单
            </button>
          </div>
        </div>

        {/* Right: Gift Policies */}
        <div className="col-span-3 flex flex-col bg-white rounded-xl border border-surface-200 overflow-hidden">
          <div className="p-4 border-b border-surface-100">
            <h2 className="text-sm font-semibold text-surface-700 flex items-center gap-1.5">
              <Gift className="w-4 h-4 text-accent-500" /> 赠品政策
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {applicablePolicies.length === 0 ? (
              <p className="text-sm text-surface-400 text-center mt-8">购物车中暂无适用赠品政策</p>
            ) : applicablePolicies.map(gp => {
              const cartItem = cart.find(i => i.product.id === gp.product_id)
              const met = cartItem && cartItem.quantity >= gp.threshold
              const diff = cartItem ? gp.threshold - cartItem.quantity : gp.threshold
              return (
                <div key={gp.id} className="border border-surface-100 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    {met ? (
                      <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                    ) : (
                      <Gift className="w-4 h-4 text-surface-300 mt-0.5 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{gp.product_name}</p>
                      <p className="text-xs text-surface-500 mt-0.5">
                        满 {gp.threshold} 件 → 赠 <span className="text-accent-600">{gp.gift_product_name}</span> × {gp.gift_quantity}
                      </p>
                      <p className="text-xs text-surface-400 mt-0.5">{gp.description}</p>
                      {met ? (
                        <span className="text-xs text-emerald-600 font-medium mt-1 inline-block">✓ 已满足</span>
                      ) : (
                        <span className="text-xs text-amber-600 mt-1 inline-block">还差 {diff} 件</span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
