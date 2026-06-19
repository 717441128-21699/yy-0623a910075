import { create } from 'zustand'

interface Clinic {
  id: string
  name: string
  address: string
  area: string
  contact: string
  phone: string
  last_purchase_date?: string | null
  outstanding_order_count?: number
}

interface Product {
  id: string
  name: string
  category: string
  brand: string
  spec: string
  unit: string
  price: number
  tax_rate: number
  stock: number
  scene_tags: string[]
  purchase_count?: number
  last_purchased_at?: string
}

interface OrderItem {
  id: string
  order_id: string
  product_id: string
  product_name: string
  brand: string
  spec: string
  unit: string
  quantity: number
  price: number
  tax_rate: number
  subtotal: number
  gifted: boolean
  shipped_quantity?: number
  backorder_quantity?: number
}

interface ShipmentItem {
  id: string
  order_item_id: string
  product_id: string
  product_name: string
  shipped_quantity: number
  unit: string
}

interface Shipment {
  id: string
  order_id: string
  created_at: string
  shipped_by: string
  tracking_no?: string
  carrier?: string
  expected_arrival?: string
  items: ShipmentItem[]
  note?: string
}

interface BackorderInfo {
  product_id: string
  product_name: string
  quantity: number
  shipped: number
  backorder: number
  unit: string
}

interface Order {
  id: string
  clinic_id: string
  clinic_name: string
  status: 'pending' | 'partial' | 'completed'
  total_amount: number
  created_at: string
  items: OrderItem[]
  delivery_method?: 'logistics' | 'local_delivery' | 'self_pickup'
  backorder_note?: string
  payment_due_days?: number
  payment_due_date?: string
  expected_arrival?: string
  shipments?: Shipment[]
  total_ordered_qty?: number
  total_shipped_qty?: number
  shipment_progress_pct?: number
  backorder_items?: BackorderInfo[]
  latest_tracking_no?: string
  latest_carrier?: string
  latest_expected_arrival?: string
}

interface DraftOrder {
  id: string
  clinic_id: string
  clinic_name?: string
  items: { product_id: string; product_name?: string; quantity: number }[]
  note?: string
  created_at: string
  updated_at: string
  created_by?: string
}

interface Reminder {
  id: string
  clinic_id: string
  clinic_name: string
  product_id: string
  product_name: string
  remind_at: string
  status: 'pending' | 'done' | 'skipped'
  message: string
  order_id?: string
  suggested_quantity?: number
}

interface FollowUp {
  id: string
  clinic_id: string
  type: 'call' | 'visit' | 'quote' | 'order' | 'note' | 'shipment'
  title: string
  content: string
  created_at: string
  related_order_id?: string
  operator?: string
}

interface GiftPolicy {
  id: string
  product_id: string
  product_name: string
  threshold: number
  gift_product_id: string
  gift_product_name: string
  gift_quantity: number
  description: string
}

interface BrandPreference {
  brand: string
  purchase_count: number
  categories: string[]
}

interface RecommendedProduct {
  product: Product
  scene: string
  suggested_quantity: number
}

interface CartItem {
  product: Product
  quantity: number
  appliedGiftPolicy?: GiftPolicy
}

interface AppState {
  clinics: Clinic[]
  products: Product[]
  orders: Order[]
  reminders: Reminder[]
  giftPolicies: GiftPolicy[]
  brandPreferences: BrandPreference[]
  recommendedProducts: RecommendedProduct[]
  followUps: FollowUp[]
  drafts: DraftOrder[]
  cart: CartItem[]
  selectedClinic: Clinic | null
  loading: boolean

  fetchClinics: (search?: string, area?: string) => Promise<void>
  fetchClinicDetail: (id: string) => Promise<Clinic | null>
  fetchClinicConsumables: (id: string) => Promise<Product[]>
  fetchClinicBrands: (id: string) => Promise<BrandPreference[]>
  fetchClinicOutstandingOrders: (id: string) => Promise<Order[]>
  fetchProducts: (search?: string, category?: string) => Promise<void>
  fetchRecommendations: (implantCount: number, orthoCount: number, cleaningCount: number) => Promise<void>
  fetchOrders: (clinicId?: string) => Promise<void>
  fetchOrder: (id: string) => Promise<Order | null>
  createOrder: (
    clinicId: string,
    items: { product_id: string; quantity: number }[],
    extras?: {
      delivery_method?: 'logistics' | 'local_delivery' | 'self_pickup'
      backorder_note?: string
      payment_due_days?: number
      from_reminder_id?: string
      operator?: string
    },
  ) => Promise<Order | null>
  generateConfirmation: (
    orderId: string,
    extras?: {
      delivery_method?: 'logistics' | 'local_delivery' | 'self_pickup'
      backorder_note?: string
      payment_due_days?: number
      version?: 'customer' | 'internal'
    },
  ) => Promise<string>
  shipOrder: (
    orderId: string,
    data: {
      items: ShipmentItem[]
      tracking_no?: string
      carrier?: string
      expected_arrival?: string
      note?: string
      shipped_by?: string
    },
  ) => Promise<Shipment | null>
  fetchReminders: (status?: string) => Promise<void>
  fetchTodayReminders: () => Promise<void>
  updateReminderStatus: (id: string, status: string) => Promise<void>
  fetchFollowUps: (clinicId: string) => Promise<void>
  createFollowUp: (
    clinicId: string,
    data: {
      type: FollowUp['type']
      title: string
      content: string
      operator?: string
    },
  ) => Promise<FollowUp | null>
  fetchDrafts: (clinicId?: string) => Promise<void>
  createDraft: (data: {
    clinic_id: string
    clinic_name?: string
    items: { product_id: string; product_name?: string; quantity: number }[]
    note?: string
    created_by?: string
  }) => Promise<DraftOrder | null>
  updateDraft: (
    id: string,
    data: Partial<Pick<DraftOrder, 'items' | 'note' | 'clinic_id' | 'clinic_name'>>,
  ) => Promise<DraftOrder | null>
  deleteDraft: (id: string) => Promise<boolean>
  submitDraft: (
    id: string,
    extras?: {
      delivery_method?: 'logistics' | 'local_delivery' | 'self_pickup'
      backorder_note?: string
      payment_due_days?: number
      from_reminder_id?: string
      operator?: string
    },
  ) => Promise<Order | null>
  fetchGiftPolicies: (productId?: string) => Promise<void>
  setSelectedClinic: (clinic: Clinic | null) => void
  addToCart: (product: Product, quantity: number) => void
  updateCartItemQuantity: (productId: string, quantity: number) => void
  removeFromCart: (productId: string) => void
  clearCart: () => void
  applyGiftPoliciesToCart: () => void
}

const API_BASE = '/api'

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  const json = await res.json()
  if (!json.success) throw new Error(json.error || '请求失败')
  return json.data
}

export const useStore = create<AppState>((set, get) => ({
  clinics: [],
  products: [],
  orders: [],
  reminders: [],
  giftPolicies: [],
  brandPreferences: [],
  recommendedProducts: [],
  followUps: [],
  drafts: [],
  cart: [],
  selectedClinic: null,
  loading: false,

  fetchClinics: async (search?, area?) => {
    set({ loading: true })
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (area) params.set('area', area)
      const data = await apiFetch<Clinic[]>(`/clinics?${params.toString()}`)
      set({ clinics: data })
    } finally {
      set({ loading: false })
    }
  },

  fetchClinicDetail: async (id) => {
    try {
      const data = await apiFetch<Clinic>(`/clinics/${id}`)
      return data
    } catch {
      return null
    }
  },

  fetchClinicConsumables: async (id) => {
    try {
      const data = await apiFetch<Product[]>(`/clinics/${id}/consumables`)
      return data
    } catch {
      return []
    }
  },

  fetchClinicBrands: async (id) => {
    try {
      const data = await apiFetch<BrandPreference[]>(`/clinics/${id}/brands`)
      set({ brandPreferences: data })
      return data
    } catch {
      return []
    }
  },

  fetchClinicOutstandingOrders: async (id) => {
    try {
      const data = await apiFetch<Order[]>(`/clinics/${id}/orders/outstanding`)
      return data
    } catch {
      return []
    }
  },

  fetchProducts: async (search?, category?) => {
    set({ loading: true })
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (category) params.set('category', category)
      const data = await apiFetch<Product[]>(`/products?${params.toString()}`)
      set({ products: data })
    } finally {
      set({ loading: false })
    }
  },

  fetchRecommendations: async (implantCount, orthoCount, cleaningCount) => {
    set({ loading: true })
    try {
      const data = await apiFetch<RecommendedProduct[]>('/products/recommend', {
        method: 'POST',
        body: JSON.stringify({ implantCount, orthoCount, cleaningCount }),
      })
      set({ recommendedProducts: data })
    } finally {
      set({ loading: false })
    }
  },

  fetchOrders: async (clinicId?) => {
    set({ loading: true })
    try {
      const params = new URLSearchParams()
      if (clinicId) params.set('clinic_id', clinicId)
      const data = await apiFetch<Order[]>(`/orders?${params.toString()}`)
      set({ orders: data })
    } finally {
      set({ loading: false })
    }
  },

  fetchOrder: async (id) => {
    try {
      const data = await apiFetch<Order>(`/orders/${id}`)
      return data
    } catch {
      return null
    }
  },

  createOrder: async (clinicId, items, extras?) => {
    try {
      const data = await apiFetch<Order & { backorder_items?: unknown[]; completed_reminder_ids?: string[] }>('/orders', {
        method: 'POST',
        body: JSON.stringify({ clinic_id: clinicId, items, ...extras }),
      })
      set((state) => ({ orders: [...state.orders, data] }))
      // 订单创建后刷新提醒状态（关联提醒已自动完成）
      const { fetchTodayReminders, fetchFollowUps } = get()
      fetchTodayReminders()
      fetchFollowUps(clinicId)
      // 刷新产品库存
      const { fetchProducts } = get()
      fetchProducts()
      return data
    } catch {
      return null
    }
  },

  generateConfirmation: async (orderId, extras?) => {
    try {
      const data = await apiFetch<{ confirmation_text: string }>(`/orders/${orderId}/confirm`, {
        method: 'POST',
        body: JSON.stringify(extras || {}),
      })
      // 生成确认单后刷新跟进记录（后端会自动生成 quote 类型记录）
      const order = get().orders.find((o) => o.id === orderId)
      if (order) {
        const { fetchFollowUps } = get()
        fetchFollowUps(order.clinic_id)
      }
      return data.confirmation_text
    } catch {
      return ''
    }
  },

  shipOrder: async (orderId, data) => {
    try {
      const result = await apiFetch<Shipment>(`/orders/${orderId}/ship`, {
        method: 'POST',
        body: JSON.stringify(data),
      })
      // 刷新订单和跟进记录
      const { fetchOrders, fetchFollowUps, fetchOrder } = get()
      fetchOrders()
      const order = await fetchOrder(orderId)
      if (order) fetchFollowUps(order.clinic_id)
      return result
    } catch (e) {
      console.error(e)
      return null
    }
  },

  addToCart: (product, quantity) => {
    if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isInteger(quantity)) return
    set((state) => {
      const existing = state.cart.find((item) => item.product.id === product.id)
      if (existing) {
        return {
          cart: state.cart.map((item) =>
            item.product.id === product.id ? { ...item, quantity: item.quantity + quantity } : item,
          ),
        }
      }
      return { cart: [...state.cart, { product, quantity }] }
    })
  },

  updateCartItemQuantity: (productId, quantity) => {
    const safeQty = Number.isFinite(quantity) && quantity > 0 && Number.isInteger(quantity) ? quantity : 1
    set((state) => ({
      cart: state.cart.map((item) => (item.product.id === productId ? { ...item, quantity: safeQty } : item)),
    }))
  },

  fetchReminders: async (status?) => {
    set({ loading: true })
    try {
      const params = new URLSearchParams()
      if (status) params.set('status', status)
      const data = await apiFetch<Reminder[]>(`/reminders?${params.toString()}`)
      set({ reminders: data })
    } finally {
      set({ loading: false })
    }
  },

  fetchTodayReminders: async () => {
    try {
      const data = await apiFetch<Reminder[]>('/reminders/today')
      set({ reminders: data })
    } catch {
      // fallback to all reminders
      const data = await apiFetch<Reminder[]>('/reminders?status=pending')
      set({ reminders: data })
    }
  },

  updateReminderStatus: async (id, status) => {
    try {
      await apiFetch<Reminder>(`/reminders/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      })
      set((state) => ({
        reminders: state.reminders.map((r) => (r.id === id ? { ...r, status: status as Reminder['status'] } : r)),
      }))
    } catch {
      // silent
    }
  },

  fetchFollowUps: async (clinicId) => {
    try {
      const data = await apiFetch<FollowUp[]>(`/follow-ups/${clinicId}`)
      set({ followUps: data })
    } catch {
      set({ followUps: [] })
    }
  },

  createFollowUp: async (clinicId, data) => {
    try {
      const result = await apiFetch<FollowUp>(`/follow-ups/${clinicId}`, {
        method: 'POST',
        body: JSON.stringify(data),
      })
      set((state) => ({
        followUps: [result, ...state.followUps].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        ),
      }))
      return result
    } catch {
      return null
    }
  },

  fetchDrafts: async (clinicId?) => {
    try {
      const params = new URLSearchParams()
      if (clinicId) params.set('clinic_id', clinicId)
      const data = await apiFetch<DraftOrder[]>(`/drafts?${params.toString()}`)
      set({ drafts: data })
    } catch {
      set({ drafts: [] })
    }
  },

  createDraft: async (data) => {
    try {
      const result = await apiFetch<DraftOrder>('/drafts', {
        method: 'POST',
        body: JSON.stringify(data),
      })
      set((state) => ({ drafts: [result, ...state.drafts] }))
      return result
    } catch {
      return null
    }
  },

  updateDraft: async (id, data) => {
    try {
      const result = await apiFetch<DraftOrder>(`/drafts/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      })
      set((state) => ({
        drafts: state.drafts.map((d) => (d.id === id ? result : d)),
      }))
      return result
    } catch {
      return null
    }
  },

  deleteDraft: async (id) => {
    try {
      await apiFetch<DraftOrder>(`/drafts/${id}`, { method: 'DELETE' })
      set((state) => ({ drafts: state.drafts.filter((d) => d.id !== id) }))
      return true
    } catch {
      return false
    }
  },

  submitDraft: async (id, extras?) => {
    try {
      const result = await apiFetch<{ order: Order; backorder_items?: unknown[] }>(`/drafts/${id}/submit`, {
        method: 'POST',
        body: JSON.stringify(extras || {}),
      })
      set((state) => ({
        orders: [...state.orders, result.order],
        drafts: state.drafts.filter((d) => d.id !== id),
      }))
      // 刷新提醒、跟进、产品库存
      const { fetchTodayReminders, fetchFollowUps, fetchProducts } = get()
      fetchTodayReminders()
      if (result.order.clinic_id) fetchFollowUps(result.order.clinic_id)
      fetchProducts()
      return result.order
    } catch {
      return null
    }
  },

  fetchGiftPolicies: async (productId?) => {
    try {
      const params = new URLSearchParams()
      if (productId) params.set('product_id', productId)
      const data = await apiFetch<GiftPolicy[]>(`/gift-policies?${params.toString()}`)
      set({ giftPolicies: data })
    } catch {
      // silent
    }
  },

  setSelectedClinic: (clinic) => set({ selectedClinic: clinic }),

  removeFromCart: (productId) => {
    set((state) => ({ cart: state.cart.filter((item) => item.product.id !== productId) }))
  },

  clearCart: () => set({ cart: [], selectedClinic: null }),

  applyGiftPoliciesToCart: () => {
    const { cart, giftPolicies } = get()
    const updatedCart = cart.map((item) => {
      const policy = giftPolicies.find((gp) => gp.product_id === item.product.id)
      if (policy && item.quantity >= policy.threshold) {
        return { ...item, appliedGiftPolicy: policy }
      }
      return { ...item, appliedGiftPolicy: undefined }
    })
    set({ cart: updatedCart })
  },
}))

export type { Clinic, Product, OrderItem, Order, Shipment, ShipmentItem, Reminder, FollowUp, GiftPolicy, BrandPreference, RecommendedProduct, CartItem, DraftOrder, BackorderInfo }
