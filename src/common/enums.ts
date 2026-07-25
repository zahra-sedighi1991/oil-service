export enum RecordStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING_REVIEW = 'pending_review',
}

export enum ShopStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  CLOSED = 'closed',
}

export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  SHOP_OWNER = 'shop_owner',
}

export enum ServiceOrderStatus {
  DRAFT = 'draft',
  COMPLETED = 'completed',
  CANCELED = 'canceled',
}

export enum InvoiceStatus {
  ISSUED = 'issued',
  VOID = 'void',
}

export enum SuggestionStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  MERGED = 'merged',
}

export enum PublicLinkStatus {
  ACTIVE = 'active',
  REVOKED = 'revoked',
}
