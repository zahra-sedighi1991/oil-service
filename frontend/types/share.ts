export interface ServiceShareCardItem {
  description: string
  totalAmount: number
}

export interface ServiceShareCardData {
  shopName: string
  shopCity?: string
  shopPhone?: string
  customerName?: string
  odometer: number
  nextDueOdometer?: number
  nextDueItem?: string
  invoiceNo: string
  totalAmount: number
  currency?: string
  serviceDate: string
  products: ServiceShareCardItem[]
  services: ServiceShareCardItem[]
}
