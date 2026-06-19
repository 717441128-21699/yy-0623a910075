import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Search, Plus, Minus, X, ShoppingCart, Stethoscope, Sparkles, Gift, CheckCircle, AlertTriangle, Lightbulb, Package, Save, FolderOpen, Trash2 } from 'lucide-react'
import { useStore, type Reminder, type DraftOrder } from '@/store/useStore'

export default function OrderNew() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const {
    clinics, fetchClinics, products, fetchProducts,
    recommendedProducts, fetchRecommendations,
    giftPolicies, fetchGiftPolicies,
    reminders, fetchTodayReminders,
    cart, addToCart, updateCartItemQuantity, removeFromCart, clearCart,
    applyGiftPoliciesToCart, selectedClinic, setSelectedClinic, createOrder,
    // 草稿相关状态和方法
    drafts, fetchDrafts, createDraft, deleteDraft,
  } = useStore()

  const [clinicSearch, setClinicSearch] = useState('')
  const [clinicOpen, setClinicOpen] = useState(false)
  const [implantCount, setImplantCount] = useState(0)
  const [orthoCount, setOrthoCount] = useState(0)
  const [cleaningCount, setCleaningCount] = useState(0)
  const [productSearch, setProductSearch] = useState('')
  const [addingId, setAddingId] = useState<string | null>(null)
  const [addQty, setAddQty] = useState(1)
  // 草稿功能相关状态
  const [showSaveDraftModal, setShowSaveDraftModal] = useState(false) // 保存草稿弹窗
  const [showOpenDraftModal, setShowOpenDraftModal] = useState(false) // 打开草稿弹窗
  const [draftNote, setDraftNote] = useState('') // 草稿备注
  const [deletingDraftId, setDeletingDraftId] = useState<string | null>(null) // 删除中草稿ID

  const urlClinicId = searchParams.get('clinic_id')
  const urlClinicName = searchParams.get('clinic_name')
  const urlReminderId = searchParams.get('reminder_id')

  useEffect(() => { fetchClinics() }, [])
  useEffect(() => { fetchGiftPolicies() }, [])
  useEffect(() => { fetchProducts() }, [])
  // 初始加载草稿列表
  useEffect(() => { fetchDrafts() }, [])
  useEffect(() => {
    if (urlReminderId) fetchTodayReminders()
  }, [urlReminderId])

  // 根据 URL 参数自动选中诊所
  useEffect(() => {
    if (urlClinicId && !selectedClinic && clinics.length > 0) {
      const clinic = clinics.find((c) => c.id === urlClinicId)
      if (clinic) {
        setSelectedClinic(clinic)
      } else if (urlClinicName) {
        // 如果诊所列表里找不到（可能还没加载完或数据不全），先构造一个最小化对象
        setSelectedClinic({
          id: urlClinicId,
          name: urlClinicName,
          address: '',
          area: '',
          contact: '',
          phone: '',
        })
      }
    }
  }, [urlClinicId, urlClinicName, clinics, selectedClinic, setSelectedClinic])

  // 从 URL 提醒中找到对应提醒
  const sourceReminder: Reminder | null = useMemo(() => {
    if (!urlReminderId) return null
    return reminders.find((r) => r.id === urlReminderId) || null
  }, [urlReminderId, reminders])

  // 计算购物车中库存不足的品项
  const cartBackorderInfo = useMemo(() => {
    const items: { product_id: string; product_name: string; stock: number; shortage: number; unit: string }[] = []
    for (const item of cart) {
      if (item.quantity > item.product.stock) {
        items.push({
          product_id: item.product.id,
          product_name: item.product.name,
          stock: item.product.stock,
          shortage: item.quantity - item.product.stock,
          unit: item.product.unit,
        })
      }
    }
    return items
  }, [cart])

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

  const addReminderProduct = () => {
    if (!sourceReminder) return
    const product = products.find((p) => p.id === sourceReminder.product_id)
    if (product) {
      const qty = sourceReminder.suggested_quantity || 1
      addToCart(product, qty)
    }
  }

  const handleSubmit = async () => {
    if (!selectedClinic || cart.length === 0) return
    const hasInvalid = cart.some(i => !Number.isInteger(i.quantity) || i.quantity <= 0)
    if (hasInvalid) {
      alert('购物车中存在异常数量，请修正后再提交')
      return
    }
    applyGiftPoliciesToCart()
    const items = cart.map(i => ({ product_id: i.product.id, quantity: i.quantity }))
    const order = await createOrder(selectedClinic.id, items, {
      from_reminder_id: urlReminderId || undefined,
      operator: '李明',
    })
    if (order) {
      clearCart()
      navigate(`/order/confirm/${order.id}`)
    }
  }

  // ========== 草稿功能处理函数 ==========

  // 打开保存草稿弹窗时重置备注
  const openSaveDraftModal = () => {
    setDraftNote('')
    setShowSaveDraftModal(true)
  }

  // 保存草稿处理
  const handleSaveDraft = async () => {
    if (!selectedClinic || cart.length === 0) return
    // 构造草稿 items 数据
    const draftItems = cart.map(i => ({
      product_id: i.product.id,
      product_name: i.product.name,
      quantity: i.quantity,
    }))
    // 调用 createDraft 创建草稿
    const result = await createDraft({
      clinic_id: selectedClinic.id,
      clinic_name: selectedClinic.name,
      items: draftItems,
      note: draftNote.trim() || undefined,
      created_by: '李明',
    })
    if (result) {
      alert('草稿保存成功！')
      setShowSaveDraftModal(false)
      // 保存成功后清空购物车和选中诊所
      clearCart()
    } else {
      alert('草稿保存失败，请重试')
    }
  }

  // 继续编辑草稿
  const handleLoadDraft = async (draft: DraftOrder) => {
    // 确保产品数据已加载
    if (products.length === 0) {
      await fetchProducts()
    }
    // 设置选中诊所
    const clinic = clinics.find(c => c.id === draft.clinic_id)
    if (clinic) {
      setSelectedClinic(clinic)
    } else {
      // 找不到诊所时用草稿数据构造
      setSelectedClinic({
        id: draft.clinic_id,
        name: draft.clinic_name || '',
        address: '',
        area: '',
        contact: '',
        phone: '',
      })
    }
    // 清空当前购物车
    clearCart()
    // 将草稿 items 逐个加入购物车
    for (const item of draft.items) {
      const product = products.find(p => p.id === item.product_id)
      if (product) {
        addToCart(product, item.quantity)
      }
    }
    // 关闭弹窗
    setShowOpenDraftModal(false)
  }

  // 删除草稿
  const handleDeleteDraft = async (id: string) => {
    if (!confirm('确定要删除此草稿吗？删除后无法恢复。')) return
    setDeletingDraftId(id)
    const success = await deleteDraft(id)
    setDeletingDraftId(null)
    if (!success) {
      alert('删除失败，请重试')
    }
  }

  // 格式化日期时间显示
  const formatDraftDateTime = (isoStr: string) => {
    const d = new Date(isoStr)
    return d.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // 计算草稿品项总数
  const getDraftTotalItems = (draft: DraftOrder) => {
    return draft.items.reduce((sum, i) => sum + i.quantity, 0)
  }

  const decQty = (pid: string, cur: number) => {
    if (cur <= 1) return
    updateCartItemQuantity(pid, cur - 1)
  }

  const incQty = (pid: string, cur: number) => {
    updateCartItemQuantity(pid, cur + 1)
  }

  const setQtyDirect = (pid: string, raw: number | string) => {
    let v = Number(raw)
    if (!Number.isFinite(v) || v < 1) v = 1
    v = Math.floor(v)
    updateCartItemQuantity(pid, v)
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
          {/* 草稿操作按钮区 */}
          <div className="flex gap-2">
            {/* 保存为草稿按钮：诊所已选且购物车有商品时才可点击 */}
            <button
              onClick={openSaveDraftModal}
              disabled={!selectedClinic || cart.length === 0}
              className="btn-secondary flex-1 text-sm flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" /> 保存为草稿
            </button>
            {/* 打开草稿按钮：始终可点击 */}
            <button
              onClick={() => setShowOpenDraftModal(true)}
              className="btn-secondary flex-1 text-sm flex items-center justify-center gap-1.5"
            >
              <FolderOpen className="w-4 h-4" /> 打开草稿
            </button>
          </div>

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

          {/* Reminder Suggestion */}
          {sourceReminder && (
            <div className="bg-gradient-to-br from-accent-50 to-white border border-accent-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-accent-500/10 flex items-center justify-center flex-shrink-0">
                  <Lightbulb className="w-5 h-5 text-accent-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-bold text-accent-700">补货提醒建议</h3>
                    <span className="text-[10px] font-medium text-white bg-accent-500 px-1.5 py-0.5 rounded">来自回访提醒</span>
                  </div>
                  <p className="text-sm font-medium text-surface-800 mt-1">{sourceReminder.product_name}</p>
                  <p className="text-xs text-surface-500 mt-0.5">{sourceReminder.message}</p>
                  {sourceReminder.suggested_quantity && (
                    <p className="text-xs text-dental-600 font-medium mt-1">
                      建议数量：{sourceReminder.suggested_quantity}
                      {products.find(p => p.id === sourceReminder.product_id)?.unit || ''}
                    </p>
                  )}
                  <button
                    onClick={addReminderProduct}
                    className="btn-accent w-full mt-3 text-sm flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" /> 一键加入购物车
                  </button>
                </div>
              </div>
            </div>
          )}

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
                      <p className={`text-xs mt-0.5 ${rp.product.stock <= 5 ? 'text-amber-600 font-medium' : 'text-emerald-600'}`}>
                        <Package className="w-3 h-3 inline mr-0.5" />
                        库存 {rp.product.stock}{rp.product.unit}
                        {rp.product.stock <= 5 && ' · 库存紧张'}
                      </p>
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
                      <p className={`text-[11px] ${p.stock <= 5 ? 'text-amber-600' : 'text-emerald-600'}`}>
                        库存 {p.stock}{p.unit}
                      </p>
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
                    <button
                      className={`w-6 h-6 rounded border flex items-center justify-center ${item.quantity <= 1 ? 'border-surface-100 text-surface-200 cursor-not-allowed' : 'border-surface-200 hover:bg-surface-50 text-surface-700'}`}
                      onClick={() => decQty(item.product.id, item.quantity)}
                      disabled={item.quantity <= 1}
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <input
                      type="number"
                      min={1}
                      className="w-14 text-center text-sm border border-surface-200 rounded py-1 focus:outline-none focus:border-dental-400"
                      value={item.quantity}
                      onChange={(e) => setQtyDirect(item.product.id, e.target.value)}
                      onBlur={(e) => setQtyDirect(item.product.id, e.target.value)}
                    />
                    <button
                      className="w-6 h-6 rounded border border-surface-200 flex items-center justify-center hover:bg-surface-50 text-surface-700"
                      onClick={() => incQty(item.product.id, item.quantity)}
                    >
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
                {item.quantity > item.product.stock && (
                  <div className="mt-2 flex items-start gap-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                    <span>库存不足，现仅 {item.product.stock}{item.product.unit}，欠货 {item.quantity - item.product.stock}{item.product.unit}</span>
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
            {cartBackorderInfo.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-xs text-amber-700">
                <div className="font-medium flex items-center gap-1 mb-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> 库存预警：{cartBackorderInfo.length} 项欠货
                </div>
                <div className="space-y-0.5">
                  {cartBackorderInfo.map(b => (
                    <div key={b.product_id} className="flex justify-between">
                      <span>{b.product_name}</span>
                      <span>缺 {b.shortage}{b.unit}</span>
                    </div>
                  ))}
                </div>
                <div className="text-[11px] text-amber-600 mt-1">提交后将自动生成欠货说明</div>
              </div>
            )}
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

      {/* ========== 保存草稿 Modal ========== */}
      {showSaveDraftModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md m-4 overflow-hidden">
            <div className="px-5 py-4 border-b border-surface-100 flex items-center justify-between">
              <h3 className="font-semibold text-surface-900 flex items-center gap-2">
                <Save className="w-4 h-4 text-dental-500" /> 保存为草稿
              </h3>
              <button
                onClick={() => setShowSaveDraftModal(false)}
                className="w-8 h-8 rounded-lg hover:bg-surface-100 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {/* 草稿摘要信息 */}
              <div className="bg-surface-50 rounded-lg p-3 space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-surface-400">诊所</span>
                  <span className="font-medium text-surface-800">{selectedClinic?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-surface-400">品项数</span>
                  <span className="font-medium text-surface-800">{cart.length} 种 / 共 {totalItems} 件</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-surface-400">合计金额</span>
                  <span className="font-semibold text-dental-600">¥{totalAmount.toFixed(2)}</span>
                </div>
              </div>
              {/* 备注输入 */}
              <div>
                <label className="text-sm font-medium text-surface-600 mb-1.5 block">备注（可选）</label>
                <textarea
                  className="input-base text-sm min-h-[80px] resize-y"
                  placeholder="输入草稿备注，方便后续识别..."
                  value={draftNote}
                  onChange={(e) => setDraftNote(e.target.value)}
                />
              </div>
            </div>
            <div className="px-5 py-4 bg-surface-50 border-t border-surface-100 flex justify-end gap-2">
              <button
                onClick={() => setShowSaveDraftModal(false)}
                className="btn-secondary text-sm"
              >
                取消
              </button>
              <button
                onClick={handleSaveDraft}
                className="btn-primary text-sm flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" /> 确认保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== 打开草稿 Modal ========== */}
      {showOpenDraftModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl m-4 overflow-hidden flex flex-col max-h-[80vh]">
            <div className="px-5 py-4 border-b border-surface-100 flex items-center justify-between flex-shrink-0">
              <h3 className="font-semibold text-surface-900 flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-dental-500" /> 草稿列表
                <span className="text-xs font-normal text-surface-400">共 {drafts.length} 条</span>
              </h3>
              <button
                onClick={() => setShowOpenDraftModal(false)}
                className="w-8 h-8 rounded-lg hover:bg-surface-100 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {drafts.length === 0 ? (
                <div className="text-center py-16 text-surface-400">
                  <FolderOpen className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">暂无草稿</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {drafts.map((draft) => (
                    <div
                      key={draft.id}
                      className="bg-white border border-surface-200 rounded-lg p-4 card-hover"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          {/* 诊所名和品项数 */}
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-sm font-semibold text-surface-900">
                              {draft.clinic_name || draft.clinic_id}
                            </span>
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-dental-50 text-dental-600 border border-dental-200">
                              {draft.items.length} 种 / {getDraftTotalItems(draft)} 件
                            </span>
                          </div>
                          {/* 时间 */}
                          <div className="text-xs text-surface-400 flex items-center gap-3">
                            <span>创建：{formatDraftDateTime(draft.created_at)}</span>
                            {draft.updated_at !== draft.created_at && (
                              <span>更新：{formatDraftDateTime(draft.updated_at)}</span>
                            )}
                            {draft.created_by && (
                              <span>创建人：{draft.created_by}</span>
                            )}
                          </div>
                          {/* 备注 */}
                          {draft.note && (
                            <p className="text-xs text-surface-500 mt-2 bg-surface-50 rounded px-2 py-1.5 border border-surface-100">
                              📝 {draft.note}
                            </p>
                          )}
                        </div>
                        {/* 操作按钮 */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={() => handleLoadDraft(draft)}
                            className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" /> 继续编辑
                          </button>
                          <button
                            onClick={() => handleDeleteDraft(draft.id)}
                            disabled={deletingDraftId === draft.id}
                            className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1 text-red-600 hover:bg-red-50 disabled:opacity-50"
                          >
                            <Trash2 className="w-3 h-3" />
                            {deletingDraftId === draft.id ? '删除中' : '删除'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="px-5 py-3 bg-surface-50 border-t border-surface-100 flex justify-end flex-shrink-0">
              <button
                onClick={() => setShowOpenDraftModal(false)}
                className="btn-secondary text-sm"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
