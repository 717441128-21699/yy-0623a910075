import { randomUUID } from 'crypto'

export interface Clinic {
  id: string
  name: string
  address: string
  area: string
  contact: string
  phone: string
}

export interface Product {
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
}

export interface PurchaseHistory {
  id: string
  clinic_id: string
  product_id: string
  quantity: number
  purchased_at: string
}

export interface OrderItem {
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
}

export interface Order {
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
}

export interface Reminder {
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

export interface FollowUp {
  id: string
  clinic_id: string
  type: 'call' | 'visit' | 'quote' | 'order' | 'note' | 'shipment'
  title: string
  content: string
  created_at: string
  related_order_id?: string
  operator?: string
}

export interface ShipmentItem {
  id: string
  order_item_id: string
  product_id: string
  product_name: string
  shipped_quantity: number
  unit: string
}

export interface Shipment {
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

export interface DraftOrder {
  id: string
  clinic_id: string
  clinic_name?: string
  items: { product_id: string; product_name?: string; quantity: number }[]
  note?: string
  created_at: string
  updated_at: string
  created_by?: string
}

export interface GiftPolicy {
  id: string
  product_id: string
  product_name: string
  threshold: number
  gift_product_id: string
  gift_product_name: string
  gift_quantity: number
  description: string
}

let clinicCounter = 0
function genClinicId(): string {
  clinicCounter++
  return `clinic-${String(clinicCounter).padStart(3, '0')}`
}

let productCounter = 0
function genProductId(): string {
  productCounter++
  return `prod-${String(productCounter).padStart(3, '0')}`
}

let orderCounter = 0
function genOrderId(): string {
  orderCounter++
  return `ord-${String(orderCounter).padStart(3, '0')}`
}

let reminderCounter = 0
function genReminderId(): string {
  reminderCounter++
  return `rem-${String(reminderCounter).padStart(3, '0')}`
}

let giftPolicyCounter = 0
function genGiftPolicyId(): string {
  giftPolicyCounter++
  return `gp-${String(giftPolicyCounter).padStart(3, '0')}`
}

export { genClinicId, genProductId, genOrderId, genReminderId, genGiftPolicyId, randomUUID }

export const clinics: Clinic[] = [
  { id: 'clinic-001', name: '瑞尔齿科朝阳门诊', address: '北京市朝阳区建国路88号SOHO现代城A座2层', area: '北京', contact: '张明华', phone: '010-65051234' },
  { id: 'clinic-002', name: '拜博口腔海淀分院', address: '北京市海淀区中关村大街19号新中关购物中心B1', area: '北京', contact: '李思远', phone: '010-82567890' },
  { id: 'clinic-003', name: '欢乐口腔浦东旗舰店', address: '上海市浦东新区陆家嘴环路1000号恒生银行大厦3层', area: '上海', contact: '王晓燕', phone: '021-58881234' },
  { id: 'clinic-004', name: '马泷齿科静安门诊', address: '上海市静安区南京西路1266号恒隆广场5层', area: '上海', contact: '陈建国', phone: '021-62885678' },
  { id: 'clinic-005', name: '瑞泰口腔天河分院', address: '广州市天河区天河路228号正佳广场西塔12层', area: '广州', contact: '黄伟强', phone: '020-38881234' },
  { id: 'clinic-006', name: '好牙医口腔南山店', address: '深圳市南山区科苑路15号科兴科学园B3单元2层', area: '深圳', contact: '林小芳', phone: '0755-26885678' },
  { id: 'clinic-007', name: '牙博士口腔锦江门诊', address: '成都市锦江区红星路三段1号IFS国际金融中心2号办公楼22层', area: '成都', contact: '赵敏', phone: '028-86551234' },
  { id: 'clinic-008', name: '美维口腔江干门诊', address: '杭州市江干区钱江新城市民街200号圣奥大厦1层', area: '杭州', contact: '吴海燕', phone: '0571-87885678' },
]

export const products: Product[] = [
  { id: 'prod-001', name: '瑞士ITI种植体', category: '种植耗材', brand: 'Straumann', spec: 'SLA 4.1×10mm', unit: '颗', price: 2800, tax_rate: 0.13, stock: 120, scene_tags: ['implant'] },
  { id: 'prod-002', name: '韩国奥齿泰种植体', category: '种植耗材', brand: 'Osstem', spec: 'GS 4.5×10mm', unit: '颗', price: 980, tax_rate: 0.13, stock: 200, scene_tags: ['implant'] },
  { id: 'prod-003', name: '登腾种植体系统', category: '种植耗材', brand: 'Dentium', spec: 'SuperLine 4.0×10mm', unit: '颗', price: 720, tax_rate: 0.13, stock: 180, scene_tags: ['implant'] },
  { id: 'prod-004', name: 'ITI骨粉', category: '种植耗材', brand: 'Straumann', spec: '0.5g/瓶', unit: '瓶', price: 1200, tax_rate: 0.13, stock: 60, scene_tags: ['implant'] },
  { id: 'prod-005', name: '海奥生物膜', category: '种植耗材', brand: '烟台正海', spec: '20×30mm', unit: '片', price: 680, tax_rate: 0.13, stock: 90, scene_tags: ['implant'] },
  { id: 'prod-006', name: '自酸蚀粘接剂', category: '种植耗材', brand: '3M', spec: 'Adper Single Bond 2 5ml', unit: '瓶', price: 320, tax_rate: 0.13, stock: 150, scene_tags: ['implant', 'restorative'] },
  { id: 'prod-007', name: '自锁托槽系统', category: '正畸耗材', brand: '3M', spec: 'Clarity SL 上颌', unit: '副', price: 1800, tax_rate: 0.13, stock: 50, scene_tags: ['ortho'] },
  { id: 'prod-008', name: '陶瓷自锁托槽', category: '正畸耗材', brand: 'Ormco', spec: 'Damon Clear 上下颌套装', unit: '套', price: 3200, tax_rate: 0.13, stock: 30, scene_tags: ['ortho'] },
  { id: 'prod-009', name: '镍钛弓丝', category: '正畸耗材', brand: 'Ormco', spec: '0.014寸热激活', unit: '根', price: 45, tax_rate: 0.13, stock: 500, scene_tags: ['ortho'] },
  { id: 'prod-010', name: '正畸橡皮圈', category: '正畸耗材', brand: '3M', spec: '1/4 4.5oz 混合装', unit: '袋', price: 28, tax_rate: 0.13, stock: 300, scene_tags: ['ortho'] },
  { id: 'prod-011', name: '隐形矫治器', category: '正畸耗材', brand: '时代天使', spec: '标准版全周期', unit: '套', price: 18000, tax_rate: 0.13, stock: 10, scene_tags: ['ortho'] },
  { id: 'prod-012', name: '洁牙喷砂粉', category: '洁牙耗材', brand: 'EMS', spec: '50μm 280g', unit: '罐', price: 168, tax_rate: 0.13, stock: 80, scene_tags: ['cleaning'] },
  { id: 'prod-013', name: '超声洁牙机工作尖', category: '洁牙耗材', brand: '赛特力', spec: 'P9 通用型', unit: '支', price: 120, tax_rate: 0.13, stock: 100, scene_tags: ['cleaning'] },
  { id: 'prod-014', name: '抛光膏', category: '洁牙耗材', brand: 'Kerr', spec: '薄荷味 12oz', unit: '罐', price: 85, tax_rate: 0.13, stock: 120, scene_tags: ['cleaning'] },
  { id: 'prod-015', name: '一次性口腔检查盘', category: '洁牙耗材', brand: '江苏恒康', spec: '标准配置含口镜探针镊子', unit: '套', price: 3.5, tax_rate: 0.13, stock: 2000, scene_tags: ['cleaning', 'disinfection'] },
  { id: 'prod-016', name: '医用丁腈手套', category: '消毒防护', brand: '麦迪斯', spec: 'M号 100只/盒', unit: '盒', price: 38, tax_rate: 0.13, stock: 500, scene_tags: ['disinfection'] },
  { id: 'prod-017', name: '无菌手术衣', category: '消毒防护', brand: '稳健医疗', spec: '加强型 L码', unit: '件', price: 12, tax_rate: 0.13, stock: 800, scene_tags: ['disinfection'] },
  { id: 'prod-018', name: '口腔速消灭菌袋', category: '消毒防护', brand: '3M', spec: '75×200mm 200只/包', unit: '包', price: 55, tax_rate: 0.13, stock: 300, scene_tags: ['disinfection'] },
  { id: 'prod-019', name: '碘伏消毒液', category: '消毒防护', brand: '利尔康', spec: '500ml/瓶', unit: '瓶', price: 22, tax_rate: 0.13, stock: 200, scene_tags: ['disinfection'] },
  { id: 'prod-020', name: '医用防护口罩', category: '消毒防护', brand: '3M', spec: '1860型 N95 20只/盒', unit: '盒', price: 68, tax_rate: 0.13, stock: 150, scene_tags: ['disinfection'] },
  { id: 'prod-021', name: '根管锉ProTaper Gold', category: '根管耗材', brand: 'Dentsply', spec: '全套6支/盒', unit: '盒', price: 580, tax_rate: 0.13, stock: 60, scene_tags: ['endodontic'] },
  { id: 'prod-022', name: '机用镍钛根管锉', category: '根管耗材', brand: 'Mani', spec: '25mm 6支/盒', unit: '盒', price: 220, tax_rate: 0.13, stock: 80, scene_tags: ['endodontic'] },
  { id: 'prod-023', name: '根管封闭剂', category: '根管耗材', brand: 'Dentsply', spec: 'AH Plus 双组份', unit: '套', price: 298, tax_rate: 0.13, stock: 70, scene_tags: ['endodontic'] },
  { id: 'prod-024', name: '牙胶尖', category: '根管耗材', brand: 'Dentsply', spec: '0.04锥度 25# 60支/盒', unit: '盒', price: 68, tax_rate: 0.13, stock: 150, scene_tags: ['endodontic'] },
  { id: 'prod-025', name: '光固化复合树脂', category: '修复耗材', brand: '3M', spec: 'Z350XT A2 4g', unit: '支', price: 268, tax_rate: 0.13, stock: 100, scene_tags: ['restorative'] },
  { id: 'prod-026', name: '玻璃离子水门汀', category: '修复耗材', brand: 'GC', spec: 'Fuji IX GP 普通装', unit: '套', price: 128, tax_rate: 0.13, stock: 90, scene_tags: ['restorative'] },
  { id: 'prod-027', name: '硅橡胶印模材', category: '修复耗材', brand: '3M', spec: 'Express XT Putty 340g', unit: '罐', price: 388, tax_rate: 0.13, stock: 50, scene_tags: ['restorative'] },
  { id: 'prod-028', name: '氧化锌暂封材', category: '修复耗材', brand: 'GC', spec: 'Caviton 40g', unit: '支', price: 58, tax_rate: 0.13, stock: 120, scene_tags: ['restorative', 'endodontic'] },
  { id: 'prod-029', name: '碧兰麻注射液', category: '麻醉耗材', brand: '赛特力', spec: '4%阿替卡因 1.7ml 50支/盒', unit: '盒', price: 380, tax_rate: 0.13, stock: 100, scene_tags: ['anesthetic'] },
  { id: 'prod-030', name: '利多卡因注射液', category: '麻醉耗材', brand: '上海朝晖', spec: '2% 5ml 10支/盒', unit: '盒', price: 18, tax_rate: 0.13, stock: 200, scene_tags: ['anesthetic'] },
  { id: 'prod-031', name: '一次性注射器', category: '麻醉耗材', brand: '康德莱', spec: '5ml 带针 100支/盒', unit: '盒', price: 45, tax_rate: 0.13, stock: 300, scene_tags: ['anesthetic'] },
  { id: 'prod-032', name: '明胶海绵', category: '种植耗材', brand: '杭州协和', spec: '60×40×5mm 10片/盒', unit: '盒', price: 98, tax_rate: 0.13, stock: 80, scene_tags: ['implant'] },
  { id: 'prod-033', name: '正畸托槽粘接剂', category: '正畸耗材', brand: '3M', spec: 'Transbond XT 5g', unit: '支', price: 420, tax_rate: 0.13, stock: 40, scene_tags: ['ortho'] },
  { id: 'prod-034', name: '树脂光固化灯', category: '修复耗材', brand: 'Woodpecker', spec: 'LED 无线型', unit: '台', price: 1280, tax_rate: 0.13, stock: 20, scene_tags: ['restorative'] },
  { id: 'prod-035', name: '排龈线', category: '修复耗材', brand: 'Ultradent', spec: '00号 2.5m/瓶', unit: '瓶', price: 78, tax_rate: 0.13, stock: 60, scene_tags: ['restorative'] },
]

export const purchaseHistory: PurchaseHistory[] = [
  { id: 'ph-001', clinic_id: 'clinic-001', product_id: 'prod-029', quantity: 5, purchased_at: '2026-05-10' },
  { id: 'ph-002', clinic_id: 'clinic-001', product_id: 'prod-016', quantity: 20, purchased_at: '2026-05-15' },
  { id: 'ph-003', clinic_id: 'clinic-001', product_id: 'prod-001', quantity: 10, purchased_at: '2026-05-20' },
  { id: 'ph-004', clinic_id: 'clinic-002', product_id: 'prod-021', quantity: 8, purchased_at: '2026-04-28' },
  { id: 'ph-005', clinic_id: 'clinic-002', product_id: 'prod-025', quantity: 15, purchased_at: '2026-05-05' },
  { id: 'ph-006', clinic_id: 'clinic-003', product_id: 'prod-008', quantity: 3, purchased_at: '2026-05-12' },
  { id: 'ph-007', clinic_id: 'clinic-003', product_id: 'prod-012', quantity: 10, purchased_at: '2026-05-18' },
  { id: 'ph-008', clinic_id: 'clinic-004', product_id: 'prod-002', quantity: 20, purchased_at: '2026-04-22' },
  { id: 'ph-009', clinic_id: 'clinic-004', product_id: 'prod-029', quantity: 8, purchased_at: '2026-05-08' },
  { id: 'ph-010', clinic_id: 'clinic-005', product_id: 'prod-007', quantity: 5, purchased_at: '2026-05-14' },
  { id: 'ph-011', clinic_id: 'clinic-005', product_id: 'prod-016', quantity: 30, purchased_at: '2026-05-20' },
  { id: 'ph-012', clinic_id: 'clinic-006', product_id: 'prod-022', quantity: 12, purchased_at: '2026-05-06' },
  { id: 'ph-013', clinic_id: 'clinic-006', product_id: 'prod-030', quantity: 10, purchased_at: '2026-05-16' },
  { id: 'ph-014', clinic_id: 'clinic-007', product_id: 'prod-003', quantity: 15, purchased_at: '2026-05-01' },
  { id: 'ph-015', clinic_id: 'clinic-008', product_id: 'prod-011', quantity: 2, purchased_at: '2026-05-11' },
]

export const orders: Order[] = [
  {
    id: 'ord-001',
    clinic_id: 'clinic-001',
    clinic_name: '瑞尔齿科朝阳门诊',
    status: 'completed',
    total_amount: 24420,
    created_at: '2026-05-10T10:30:00Z',
    items: [
      { id: 'oi-001', order_id: 'ord-001', product_id: 'prod-029', product_name: '碧兰麻注射液', brand: '赛特力', spec: '4%阿替卡因 1.7ml 50支/盒', unit: '盒', quantity: 5, price: 380, tax_rate: 0.13, subtotal: 2147, gifted: false },
      { id: 'oi-002', order_id: 'ord-001', product_id: 'prod-016', product_name: '医用丁腈手套', brand: '麦迪斯', spec: 'M号 100只/盒', unit: '盒', quantity: 20, price: 38, tax_rate: 0.13, subtotal: 858.8, gifted: false },
      { id: 'oi-003', order_id: 'ord-001', product_id: 'prod-016', product_name: '医用丁腈手套', brand: '麦迪斯', spec: 'M号 100只/盒', unit: '盒', quantity: 1, price: 0, tax_rate: 0.13, subtotal: 0, gifted: true },
      { id: 'oi-004', order_id: 'ord-001', product_id: 'prod-001', product_name: '瑞士ITI种植体', brand: 'Straumann', spec: 'SLA 4.1×10mm', unit: '颗', quantity: 10, price: 2800, tax_rate: 0.13, subtotal: 31640, gifted: false },
    ],
  },
  {
    id: 'ord-002',
    clinic_id: 'clinic-002',
    clinic_name: '拜博口腔海淀分院',
    status: 'completed',
    total_amount: 7220,
    created_at: '2026-04-28T14:20:00Z',
    items: [
      { id: 'oi-005', order_id: 'ord-002', product_id: 'prod-021', product_name: '根管锉ProTaper Gold', brand: 'Dentsply', spec: '全套6支/盒', unit: '盒', quantity: 8, price: 580, tax_rate: 0.13, subtotal: 5239.2, gifted: false },
      { id: 'oi-006', order_id: 'ord-002', product_id: 'prod-025', product_name: '光固化复合树脂', brand: '3M', spec: 'Z350XT A2 4g', unit: '支', quantity: 15, price: 268, tax_rate: 0.13, subtotal: 4542.6, gifted: false },
    ],
  },
  {
    id: 'ord-003',
    clinic_id: 'clinic-003',
    clinic_name: '欢乐口腔浦东旗舰店',
    status: 'pending',
    total_amount: 11368,
    created_at: '2026-06-15T09:00:00Z',
    items: [
      { id: 'oi-007', order_id: 'ord-003', product_id: 'prod-008', product_name: '陶瓷自锁托槽', brand: 'Ormco', spec: 'Damon Clear 上下颌套装', unit: '套', quantity: 3, price: 3200, tax_rate: 0.13, subtotal: 10848, gifted: false },
      { id: 'oi-008', order_id: 'ord-003', product_id: 'prod-012', product_name: '洁牙喷砂粉', brand: 'EMS', spec: '50μm 280g', unit: '罐', quantity: 5, price: 168, tax_rate: 0.13, subtotal: 949.2, gifted: false },
    ],
  },
  {
    id: 'ord-004',
    clinic_id: 'clinic-004',
    clinic_name: '马泷齿科静安门诊',
    status: 'partial',
    total_amount: 27440,
    created_at: '2026-06-10T11:30:00Z',
    items: [
      { id: 'oi-009', order_id: 'ord-004', product_id: 'prod-002', product_name: '韩国奥齿泰种植体', brand: 'Osstem', spec: 'GS 4.5×10mm', unit: '颗', quantity: 20, price: 980, tax_rate: 0.13, subtotal: 22148, gifted: false },
      { id: 'oi-010', order_id: 'ord-004', product_id: 'prod-029', product_name: '碧兰麻注射液', brand: '赛特力', spec: '4%阿替卡因 1.7ml 50支/盒', unit: '盒', quantity: 4, price: 380, tax_rate: 0.13, subtotal: 1717.6, gifted: false },
      { id: 'oi-011', order_id: 'ord-004', product_id: 'prod-004', product_name: 'ITI骨粉', brand: 'Straumann', spec: '0.5g/瓶', unit: '瓶', quantity: 5, price: 1200, tax_rate: 0.13, subtotal: 6780, gifted: false },
    ],
  },
  {
    id: 'ord-005',
    clinic_id: 'clinic-005',
    clinic_name: '瑞泰口腔天河分院',
    status: 'pending',
    total_amount: 3340,
    created_at: '2026-06-18T16:00:00Z',
    items: [
      { id: 'oi-012', order_id: 'ord-005', product_id: 'prod-007', product_name: '自锁托槽系统', brand: '3M', spec: 'Clarity SL 上颌', unit: '副', quantity: 1, price: 1800, tax_rate: 0.13, subtotal: 2034, gifted: false },
      { id: 'oi-013', order_id: 'ord-005', product_id: 'prod-009', product_name: '镍钛弓丝', brand: 'Ormco', spec: '0.014寸热激活', unit: '根', quantity: 20, price: 45, tax_rate: 0.13, subtotal: 1017, gifted: false },
      { id: 'oi-014', order_id: 'ord-005', product_id: 'prod-010', product_name: '正畸橡皮圈', brand: '3M', spec: '1/4 4.5oz 混合装', unit: '袋', quantity: 10, price: 28, tax_rate: 0.13, subtotal: 316.4, gifted: false },
    ],
  },
  {
    id: 'ord-006',
    clinic_id: 'clinic-006',
    clinic_name: '好牙医口腔南山店',
    status: 'pending',
    total_amount: 3540,
    created_at: '2026-06-19T08:45:00Z',
    items: [
      { id: 'oi-015', order_id: 'ord-006', product_id: 'prod-022', product_name: '机用镍钛根管锉', brand: 'Mani', spec: '25mm 6支/盒', unit: '盒', quantity: 6, price: 220, tax_rate: 0.13, subtotal: 1491.6, gifted: false },
      { id: 'oi-016', order_id: 'ord-006', product_id: 'prod-023', product_name: '根管封闭剂', brand: 'Dentsply', spec: 'AH Plus 双组份', unit: '套', quantity: 3, price: 298, tax_rate: 0.13, subtotal: 1009.74, gifted: false },
      { id: 'oi-017', order_id: 'ord-006', product_id: 'prod-024', product_name: '牙胶尖', brand: 'Dentsply', spec: '0.04锥度 25# 60支/盒', unit: '盒', quantity: 8, price: 68, tax_rate: 0.13, subtotal: 614.72, gifted: false },
    ],
  },
]

export const reminders: Reminder[] = [
  { id: 'rem-001', clinic_id: 'clinic-001', clinic_name: '瑞尔齿科朝阳门诊', product_id: 'prod-029', product_name: '碧兰麻注射液', remind_at: '2026-06-20', status: 'pending', message: '碧兰麻注射液库存预计不足，建议补货5盒' },
  { id: 'rem-002', clinic_id: 'clinic-001', clinic_name: '瑞尔齿科朝阳门诊', product_id: 'prod-016', product_name: '医用丁腈手套', remind_at: '2026-06-22', status: 'pending', message: '丁腈手套月消耗量大，建议提前订货20盒' },
  { id: 'rem-003', clinic_id: 'clinic-002', clinic_name: '拜博口腔海淀分院', product_id: 'prod-021', product_name: '根管锉ProTaper Gold', remind_at: '2026-06-25', status: 'pending', message: 'ProTaper Gold根管锉即将用完，建议补货10盒' },
  { id: 'rem-004', clinic_id: 'clinic-004', clinic_name: '马泷齿科静安门诊', product_id: 'prod-029', product_name: '碧兰麻注射液', remind_at: '2026-06-20', status: 'pending', message: '碧兰麻注射液上次采购已近一月，建议补货8盒' },
  { id: 'rem-005', clinic_id: 'clinic-005', clinic_name: '瑞泰口腔天河分院', product_id: 'prod-016', product_name: '医用丁腈手套', remind_at: '2026-06-21', status: 'pending', message: '手套库存告急，建议补货30盒' },
  { id: 'rem-006', clinic_id: 'clinic-006', clinic_name: '好牙医口腔南山店', product_id: 'prod-022', product_name: '机用镍钛根管锉', remind_at: '2026-06-20', status: 'pending', message: '镍钛根管锉消耗较快，建议补货12盒' },
  { id: 'rem-007', clinic_id: 'clinic-003', clinic_name: '欢乐口腔浦东旗舰店', product_id: 'prod-008', product_name: '陶瓷自锁托槽', remind_at: '2026-07-01', status: 'pending', message: '陶瓷自锁托槽库存预计7月初不足，建议提前备货5套' },
  { id: 'rem-008', clinic_id: 'clinic-007', clinic_name: '牙博士口腔锦江门诊', product_id: 'prod-030', product_name: '利多卡因注射液', remind_at: '2026-06-20', status: 'pending', message: '利多卡因即将到期补货周期，建议补货15盒' },
  { id: 'rem-009', clinic_id: 'clinic-001', clinic_name: '瑞尔齿科朝阳门诊', product_id: 'prod-001', product_name: '瑞士ITI种植体', remind_at: '2026-06-28', status: 'pending', message: 'ITI种植体库存偏低，建议补货15颗' },
]

export const giftPolicies: GiftPolicy[] = [
  { id: 'gp-001', product_id: 'prod-016', product_name: '医用丁腈手套', threshold: 10, gift_product_id: 'prod-016', gift_product_name: '医用丁腈手套', gift_quantity: 1, description: '买10盒丁腈手套赠送1盒同款' },
  { id: 'gp-002', product_id: 'prod-029', product_name: '碧兰麻注射液', threshold: 5, gift_product_id: 'prod-031', gift_product_name: '一次性注射器', gift_quantity: 2, description: '买5盒碧兰麻赠送2盒一次性注射器' },
  { id: 'gp-003', product_id: 'prod-021', product_name: '根管锉ProTaper Gold', threshold: 5, gift_product_id: 'prod-024', gift_product_name: '牙胶尖', gift_quantity: 3, description: '买5盒ProTaper Gold赠送3盒牙胶尖' },
  { id: 'gp-004', product_id: 'prod-025', product_name: '光固化复合树脂', threshold: 10, gift_product_id: 'prod-028', gift_product_name: '氧化锌暂封材', gift_quantity: 2, description: '买10支Z350树脂赠送2支氧化锌暂封材' },
  { id: 'gp-005', product_id: 'prod-001', product_name: '瑞士ITI种植体', threshold: 20, gift_product_id: 'prod-005', gift_product_name: '海奥生物膜', gift_quantity: 2, description: '买20颗ITI种植体赠送2片海奥生物膜' },
]

export const followUps: FollowUp[] = [
  { id: 'fu-001', clinic_id: 'clinic-001', type: 'call', title: '电话回访', content: '张主任反馈上个月的种植体使用良好，下周有3颗种植手术，考虑补一些ITI种植体。', created_at: '2026-06-18T10:30:00', operator: '李明' },
  { id: 'fu-002', clinic_id: 'clinic-001', type: 'quote', title: '报价单发送', content: '已发送ITI种植体+骨粉的组合报价，优惠后92折。', created_at: '2026-06-16T15:20:00', operator: '李明', related_order_id: 'ord-001' },
  { id: 'fu-003', clinic_id: 'clinic-001', type: 'order', title: '订单创建', content: '碧兰麻5盒 + 丁腈手套20盒 + ITI种植体10颗，合计¥24,420', created_at: '2026-05-10T14:00:00', operator: '李明', related_order_id: 'ord-001' },
  { id: 'fu-004', clinic_id: 'clinic-002', type: 'visit', title: '上门拜访', content: '王院长在店，聊了下ProTaper Gold根管锉的价格，对比了竞品，表示下次补货优先考虑我们。', created_at: '2026-06-15T11:00:00', operator: '李明' },
  { id: 'fu-005', clinic_id: 'clinic-003', type: 'call', title: '电话跟单', content: '刘医生确认了托槽订单，周内付款。顺便提到下个月有10个新正畸病例。', created_at: '2026-06-17T09:45:00', operator: '李明' },
  { id: 'fu-006', clinic_id: 'clinic-004', type: 'order', title: '订单创建', content: '奥齿泰种植体20颗 + 碧兰麻4盒 + 骨粉5瓶，合计¥27,440', created_at: '2026-06-10T11:30:00', operator: '李明', related_order_id: 'ord-004' },
  { id: 'fu-007', clinic_id: 'clinic-005', type: 'note', title: '备注', content: '陈护士对价格敏感，每次订货都要比对3家，建议下次带些样品过去。', created_at: '2026-06-12T16:00:00', operator: '李明' },
  { id: 'fu-008', clinic_id: 'clinic-006', type: 'quote', title: '根管耗材报价', content: '发送了镍钛根管锉、根管封闭剂、牙胶尖的组合报价，张医生说下周给回复。', created_at: '2026-06-19T10:15:00', operator: '李明' },
  { id: 'fu-009', clinic_id: 'clinic-007', type: 'visit', title: '初次拜访', content: '赵院长表示目前有固定供应商，但对我们的麻药价格感兴趣，留了样和名片。', created_at: '2026-06-14T14:30:00', operator: '李明' },
]

// 给现有订单加上预计到货日期
;(function patchOrders() {
  for (const o of orders) {
    if (o.id === 'ord-001') o.expected_arrival = '2026-05-12'
    if (o.id === 'ord-002') o.expected_arrival = '2026-04-30'
    if (o.id === 'ord-003') o.expected_arrival = '2026-06-17'
    if (o.id === 'ord-004') o.expected_arrival = '2026-06-15'
    if (o.id === 'ord-005') o.expected_arrival = '2026-06-20'
    if (o.id === 'ord-006') o.expected_arrival = '2026-06-22'
  }
})()

export const shipments: Shipment[] = [
  {
    id: 'ship-001',
    order_id: 'ord-001',
    created_at: '2026-05-10T14:00:00Z',
    shipped_by: '李明',
    tracking_no: 'SF1234567890',
    carrier: '顺丰速运',
    expected_arrival: '2026-05-12',
    note: '上午已发货，预计次日到达',
    items: [
      { id: 'si-001', order_item_id: 'oi-001', product_id: 'prod-029', product_name: '碧兰麻注射液', shipped_quantity: 5, unit: '盒' },
      { id: 'si-002', order_item_id: 'oi-002', product_id: 'prod-016', product_name: '医用丁腈手套', shipped_quantity: 20, unit: '盒' },
      { id: 'si-003', order_item_id: 'oi-003', product_id: 'prod-016', product_name: '医用丁腈手套', shipped_quantity: 1, unit: '盒' },
      { id: 'si-004', order_item_id: 'oi-004', product_id: 'prod-001', product_name: '瑞士ITI种植体', shipped_quantity: 10, unit: '颗' },
    ],
  },
  {
    id: 'ship-002',
    order_id: 'ord-002',
    created_at: '2026-04-28T16:00:00Z',
    shipped_by: '李明',
    tracking_no: 'JD9876543210',
    carrier: '京东物流',
    expected_arrival: '2026-04-30',
    note: '走京东次日达',
    items: [
      { id: 'si-005', order_item_id: 'oi-005', product_id: 'prod-021', product_name: '根管锉ProTaper Gold', shipped_quantity: 8, unit: '盒' },
      { id: 'si-006', order_item_id: 'oi-006', product_id: 'prod-025', product_name: '光固化复合树脂', shipped_quantity: 15, unit: '支' },
    ],
  },
  {
    id: 'ship-003',
    order_id: 'ord-004',
    created_at: '2026-06-10T17:00:00Z',
    shipped_by: '李明',
    tracking_no: 'YT2468013579',
    carrier: '圆通速递',
    expected_arrival: '2026-06-13',
    note: '库存不足，先发出有库存的部分，碧兰麻欠货2盒、骨粉欠货2瓶',
    items: [
      { id: 'si-007', order_item_id: 'oi-009', product_id: 'prod-002', product_name: '韩国奥齿泰种植体', shipped_quantity: 20, unit: '颗' },
      { id: 'si-008', order_item_id: 'oi-010', product_id: 'prod-029', product_name: '碧兰麻注射液', shipped_quantity: 2, unit: '盒' },
      { id: 'si-009', order_item_id: 'oi-011', product_id: 'prod-004', product_name: 'ITI骨粉', shipped_quantity: 3, unit: '瓶' },
    ],
  },
]

export const draftOrders: DraftOrder[] = [
  {
    id: 'draft-001',
    clinic_id: 'clinic-001',
    clinic_name: '瑞尔齿科朝阳门诊',
    items: [
      { product_id: 'prod-001', product_name: '瑞士ITI种植体', quantity: 5 },
      { product_id: 'prod-004', product_name: 'ITI骨粉', quantity: 3 },
    ],
    note: '张主任下周3颗种植手术，先选好，等他确认数量后再提交',
    created_at: '2026-06-19T10:30:00Z',
    updated_at: '2026-06-19T14:20:00Z',
    created_by: '李明',
  },
  {
    id: 'draft-002',
    clinic_id: 'clinic-004',
    clinic_name: '马泷齿科静安门诊',
    items: [
      { product_id: 'prod-029', product_name: '碧兰麻注射液', quantity: 10 },
      { product_id: 'prod-031', product_name: '一次性注射器', quantity: 5 },
    ],
    note: '欠货的碧兰麻到货后通知，一起发',
    created_at: '2026-06-18T15:00:00Z',
    updated_at: '2026-06-18T15:00:00Z',
    created_by: '李明',
  },
]

// 调整部分产品库存，制造一些欠货场景
function adjustStocks() {
  const stockMap: Record<string, number> = {
    'prod-001': 8,
    'prod-029': 12,
    'prod-016': 50,
    'prod-021': 3,
    'prod-022': 5,
    'prod-007': 2,
    'prod-011': 4,
  }
  for (const p of products) {
    if (stockMap[p.id] !== undefined) {
      p.stock = stockMap[p.id]
    }
  }
}
adjustStocks()
