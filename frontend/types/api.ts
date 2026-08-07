export interface AuthUser {
  id: string
  name: string
  shopId?: string
  role: 'shop_owner' | 'super_admin'
}

export interface AuthResponse {
  accessToken: string
  user: AuthUser
}

export interface Shop {
  id: string
  name: string
  ownerName: string
  publicPhone: string
  city: string
  address?: string
  currency: string
  timezone: string
  status: 'pending' | 'active' | 'suspended' | 'closed'
}

export interface Vehicle {
  id: string
  ownerCustomerId: string
  plateDisplay?: string
  temporaryIdentifier?: string
  year?: number
  lastOdometer?: number
  brand?: { id: string; nameFa: string }
  model?: { id: string; nameFa: string }
}

export interface VehicleModelOption {
  id: string
  brandId: string
  nameFa: string
  nameEn?: string
  slug?: string
  isPopular: boolean
  brand?: { id: string; nameFa: string }
}

export interface Customer {
  id: string
  name: string
  gender: 'male' | 'female'
  mobileNormalized: string
  mobileDisplay: string
  note?: string
  vehicles: Vehicle[]
}

export interface Product {
  id: string
  name?: string
  displayName: string
  attributes: Record<string, unknown>
  productTypeId: string
  productType?: { id: string; key: string; title: string }
  compatibility?: {
    status: 'compatible' | 'universal' | 'incompatible'
    matchLevel?: 'model'
  }
  shopConfiguration?: {
    salePrice?: string
    isActive: boolean
    favorite: boolean
    sortOrder?: number
    override?: {
      intervalKm?: number
      [key: string]: unknown
    }
  }
}

export interface CatalogService {
  id: string
  name: string
  category?: string
  shopConfiguration?: {
    fee?: string
    isActive: boolean
    favorite: boolean
    sortOrder?: number
  }
}

export interface Dashboard {
  today: { services: number; newCustomers: number; returningCustomers: number }
  month: { services: number; uniqueCustomers: number; invoices: number }
}

export interface Invoice {
  id: string
  invoiceNo: string
  totalAmount: string
  currency: string
  issuedAt: string
  status: 'issued' | 'void'
  order?: {
    odometer: number
    serviceDate: string
    customer: Customer
    vehicle: Vehicle
  }
  lines: Array<{
    id: string
    itemType: 'product' | 'service'
    descriptionSnapshot: string
    quantity: string
    unitPrice: string
    total: string
  }>
}
