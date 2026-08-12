export type AdminShopStatus = 'pending' | 'active' | 'suspended' | 'closed'
export type AdminUserStatus = 'active' | 'inactive' | 'pending_review'

export interface AdminOverview {
  shops: {
    all: number
    active: number
    pending: number
    suspended: number
    closed: number
    newThisMonth: number
  }
  operations: {
    completedServices: number
    servicesThisMonth: number
    customers: number
    vehicles: number
    revenue: number
    revenueThisMonth: number
  }
  catalog: {
    products: number
    services: number
    pendingSuggestions: number
  }
}

export interface AdminShopListItem {
  id: string
  name: string
  ownerName: string
  publicPhone: string
  city: string
  address?: string
  status: AdminShopStatus
  currency: string
  createdAt: string
  users: number
  customers: number
  vehicles: number
  services: number
  servicesThisMonth: number
  revenue: number
  lastServiceAt?: string | null
}

export interface AdminAuditLog {
  id: string
  actorId?: string
  actorName?: string | null
  shopId?: string
  action: string
  entityType: string
  entityId?: string
  createdAt: string
}

export interface AdminShopDetail {
  shop: {
    id: string
    name: string
    ownerName: string
    publicPhone: string
    city: string
    address?: string
    currency: string
    timezone: string
    invoiceNumberTemplate: string
    status: AdminShopStatus
    createdAt: string
    updatedAt: string
  }
  summary: {
    customers: number
    vehicles: number
    services: number
    servicesThisMonth: number
    drafts: number
    invoices: number
    revenue: number
    revenueThisMonth: number
    lastServiceAt?: string | null
  }
  configuration: {
    activeProducts: number
    activeServices: number
    pendingSuggestions: number
  }
  users: Array<{
    id: string
    name: string
    mobile: string
    role: string
    status: AdminUserStatus
    createdAt: string
  }>
  recentServices: Array<{
    id: string
    serviceDate: string
    odometer: number
    status: string
    customer?: { name: string }
    vehicle?: { plateDisplay?: string; brand?: { nameFa: string }; model?: { nameFa: string } }
  }>
  audits: AdminAuditLog[]
}
