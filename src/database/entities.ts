import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  Unique,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import {
  InvoiceStatus,
  PublicLinkStatus,
  RecordStatus,
  ServiceOrderStatus,
  ShopStatus,
  SuggestionStatus,
  UserRole,
} from '../common/enums';

@Entity('shops')
export class Shop extends BaseEntity {
  @Column() name: string;
  @Column() ownerName: string;
  @Column() publicPhone: string;
  @Column() city: string;
  @Column({ nullable: true }) address?: string;
  @Column({ default: 'TOMAN' }) currency: string;
  @Column({ default: 'Asia/Tehran' }) timezone: string;
  @Column({ default: 'INV-{year}-{sequence}' }) invoiceNumberTemplate: string;
  @Column({ type: 'enum', enum: ShopStatus, default: ShopStatus.PENDING })
  status: ShopStatus;
}

@Entity('users')
@Unique(['mobile'])
export class User extends BaseEntity {
  @Column({ nullable: true }) shopId?: string;
  @ManyToOne(() => Shop, { nullable: true }) @JoinColumn({ name: 'shopId' }) shop?: Shop;
  @Column() name: string;
  @Column() mobile: string;
  @Column({ type: 'enum', enum: UserRole, default: UserRole.SHOP_OWNER }) role: UserRole;
  @Column({ type: 'enum', enum: RecordStatus, default: RecordStatus.ACTIVE }) status: RecordStatus;
}

@Entity('vehicle_brands')
export class VehicleBrand extends BaseEntity {
  @Column() nameFa: string;
  @Column({ nullable: true }) nameEn?: string;
  @Column({ unique: true }) slug: string;
  @Column({ type: 'enum', enum: RecordStatus, default: RecordStatus.ACTIVE }) status: RecordStatus;
}

@Entity('vehicle_models')
@Unique(['brandId', 'slug'])
export class VehicleModel extends BaseEntity {
  @Column() brandId: string;
  @ManyToOne(() => VehicleBrand) @JoinColumn({ name: 'brandId' }) brand: VehicleBrand;
  @Column() nameFa: string;
  @Column({ nullable: true }) nameEn?: string;
  @Column() slug: string;
  @Column({ type: 'enum', enum: RecordStatus, default: RecordStatus.ACTIVE }) status: RecordStatus;
}

@Entity('product_manufacturers')
export class ProductManufacturer extends BaseEntity {
  @Column({ unique: true }) name: string;
  @Column({ type: 'enum', enum: RecordStatus, default: RecordStatus.ACTIVE }) status: RecordStatus;
}

@Entity('product_types')
export class ProductType extends BaseEntity {
  @Column({ unique: true }) key: string;
  @Column() title: string;
  @Column({ nullable: true }) titleTemplate?: string;
  @Column({ default: 1 }) currentSchemaVersion: number;
  @Column({ type: 'enum', enum: RecordStatus, default: RecordStatus.ACTIVE }) status: RecordStatus;
}

@Entity('product_attribute_definitions')
@Unique(['productTypeId', 'schemaVersion', 'key'])
export class ProductAttributeDefinition extends BaseEntity {
  @Column() productTypeId: string;
  @ManyToOne(() => ProductType) @JoinColumn({ name: 'productTypeId' }) productType: ProductType;
  @Column() schemaVersion: number;
  @Column() key: string;
  @Column() labelFa: string;
  @Column({ nullable: true }) labelEn?: string;
  @Column() dataType: string;
  @Column({ default: false }) required: boolean;
  @Column({ type: 'jsonb', default: {} }) config: Record<string, unknown>;
  @Column({ default: false }) searchable: boolean;
  @Column({ default: false }) filterable: boolean;
  @Column({ default: false }) showInTitle: boolean;
  @Column({ default: true }) showOnInvoice: boolean;
  @Column({ default: 0 }) sortOrder: number;
  @Column({ type: 'enum', enum: RecordStatus, default: RecordStatus.ACTIVE }) status: RecordStatus;
}

@Entity('product_attribute_options')
export class ProductAttributeOption extends BaseEntity {
  @Column() attributeDefinitionId: string;
  @ManyToOne(() => ProductAttributeDefinition) @JoinColumn({ name: 'attributeDefinitionId' })
  attributeDefinition: ProductAttributeDefinition;
  @Column() value: string;
  @Column() label: string;
  @Column({ default: 0 }) sortOrder: number;
  @Column({ type: 'enum', enum: RecordStatus, default: RecordStatus.ACTIVE }) status: RecordStatus;
}

@Entity('products')
@Index('idx_products_attributes_gin', ['attributes'], { synchronize: false })
export class Product extends BaseEntity {
  @Column() productTypeId: string;
  @ManyToOne(() => ProductType) @JoinColumn({ name: 'productTypeId' }) productType: ProductType;
  @Column({ nullable: true }) manufacturerId?: string;
  @ManyToOne(() => ProductManufacturer, { nullable: true }) @JoinColumn({ name: 'manufacturerId' })
  manufacturer?: ProductManufacturer;
  @Column({ nullable: true }) name?: string;
  @Column() displayName: string;
  @Column({ type: 'jsonb', default: {} }) attributes: Record<string, unknown>;
  @Column() schemaVersion: number;
  @Column({ type: 'enum', enum: RecordStatus, default: RecordStatus.ACTIVE }) status: RecordStatus;
}

@Entity('shop_products')
@Unique(['shopId', 'productId'])
export class ShopProduct extends BaseEntity {
  @Column() shopId: string;
  @Column() productId: string;
  @ManyToOne(() => Product) @JoinColumn({ name: 'productId' }) product: Product;
  @Column({ type: 'bigint', nullable: true }) salePrice?: string;
  @Column({ default: true }) isActive: boolean;
  @Column({ default: false }) favorite: boolean;
  @Column({ default: 0 }) sortOrder: number;
  @Column({ type: 'jsonb', default: {} }) override: Record<string, unknown>;
}

@Entity('service_catalog')
export class ServiceCatalog extends BaseEntity {
  @Column() name: string;
  @Column({ nullable: true }) category?: string;
  @Column({ nullable: true }) description?: string;
  @Column({ type: 'enum', enum: RecordStatus, default: RecordStatus.ACTIVE }) status: RecordStatus;
}

@Entity('shop_services')
@Unique(['shopId', 'serviceId'])
export class ShopService extends BaseEntity {
  @Column() shopId: string;
  @Column() serviceId: string;
  @ManyToOne(() => ServiceCatalog) @JoinColumn({ name: 'serviceId' }) service: ServiceCatalog;
  @Column({ type: 'bigint', nullable: true }) fee?: string;
  @Column({ default: true }) isActive: boolean;
  @Column({ default: false }) favorite: boolean;
  @Column({ default: 0 }) sortOrder: number;
}

@Entity('customers')
@Unique(['shopId', 'mobileNormalized'])
export class Customer extends BaseEntity {
  @Column() shopId: string;
  @Column() name: string;
  @Column() mobileNormalized: string;
  @Column() mobileDisplay: string;
  @Column({ nullable: true }) note?: string;
  @Column({ type: 'enum', enum: RecordStatus, default: RecordStatus.ACTIVE }) status: RecordStatus;
  @OneToMany(() => Vehicle, (vehicle) => vehicle.owner) vehicles: Vehicle[];
}

@Entity('vehicles')
@Index(['shopId', 'plateNormalized'], { unique: true, where: '"plateNormalized" IS NOT NULL' })
export class Vehicle extends BaseEntity {
  @Column() shopId: string;
  @Column() ownerCustomerId: string;
  @ManyToOne(() => Customer, (customer) => customer.vehicles) @JoinColumn({ name: 'ownerCustomerId' })
  owner: Customer;
  @Column() brandId: string;
  @ManyToOne(() => VehicleBrand) @JoinColumn({ name: 'brandId' }) brand: VehicleBrand;
  @Column() modelId: string;
  @ManyToOne(() => VehicleModel) @JoinColumn({ name: 'modelId' }) model: VehicleModel;
  @Column({ nullable: true }) plateNormalized?: string;
  @Column({ nullable: true }) plateDisplay?: string;
  @Column({ nullable: true }) temporaryIdentifier?: string;
  @Column({ nullable: true }) year?: number;
  @Column({ nullable: true }) lastOdometer?: number;
}

@Entity('service_orders')
@Index(['shopId', 'serviceDate', 'status'])
@Index(['vehicleId', 'serviceDate'])
@Index(['shopId', 'idempotencyKey'], { unique: true, where: '"idempotencyKey" IS NOT NULL' })
export class ServiceOrder extends BaseEntity {
  @Column() shopId: string;
  @Column() customerId: string;
  @ManyToOne(() => Customer) @JoinColumn({ name: 'customerId' }) customer: Customer;
  @Column() vehicleId: string;
  @ManyToOne(() => Vehicle) @JoinColumn({ name: 'vehicleId' }) vehicle: Vehicle;
  @Column({ type: 'timestamptz' }) serviceDate: Date;
  @Column() odometer: number;
  @Column({ type: 'enum', enum: ServiceOrderStatus, default: ServiceOrderStatus.DRAFT })
  status: ServiceOrderStatus;
  @Column({ nullable: true }) note?: string;
  @Column({ nullable: true }) cancellationReason?: string;
  @Column({ nullable: true }) idempotencyKey?: string;
  @OneToMany(() => ServiceProductLine, (line) => line.order, { cascade: true })
  productLines: ServiceProductLine[];
  @OneToMany(() => ServiceLaborLine, (line) => line.order, { cascade: true })
  laborLines: ServiceLaborLine[];
}

@Entity('service_product_lines')
export class ServiceProductLine extends BaseEntity {
  @Column() orderId: string;
  @ManyToOne(() => ServiceOrder, (order) => order.productLines) @JoinColumn({ name: 'orderId' })
  order: ServiceOrder;
  @Column({ nullable: true }) productId?: string;
  @Column({ type: 'jsonb' }) snapshot: Record<string, unknown>;
  @Column({ type: 'decimal', precision: 12, scale: 3 }) quantity: string;
  @Column({ type: 'bigint' }) unitPrice: string;
  @Column({ type: 'bigint' }) total: string;
  @Column({ nullable: true }) intervalKm?: number;
  @Column({ nullable: true }) intervalMonths?: number;
  @Column({ nullable: true }) dueOdometer?: number;
  @Column({ type: 'date', nullable: true }) dueDate?: string;
  @Column({ default: false }) temporary: boolean;
}

@Entity('service_labor_lines')
export class ServiceLaborLine extends BaseEntity {
  @Column() orderId: string;
  @ManyToOne(() => ServiceOrder, (order) => order.laborLines) @JoinColumn({ name: 'orderId' })
  order: ServiceOrder;
  @Column({ nullable: true }) serviceId?: string;
  @Column({ type: 'jsonb' }) snapshot: Record<string, unknown>;
  @Column({ type: 'decimal', precision: 12, scale: 3 }) quantity: string;
  @Column({ type: 'bigint' }) unitFee: string;
  @Column({ type: 'bigint' }) total: string;
}

@Entity('invoices')
@Unique(['shopId', 'invoiceNo'])
export class Invoice extends BaseEntity {
  @Column() orderId: string;
  @OneToOne(() => ServiceOrder) @JoinColumn({ name: 'orderId' }) order: ServiceOrder;
  @Column() shopId: string;
  @Column() invoiceNo: string;
  @Column({ type: 'bigint' }) productsTotal: string;
  @Column({ type: 'bigint' }) servicesTotal: string;
  @Column({ type: 'bigint', default: 0 }) discountAmount: string;
  @Column({ type: 'bigint' }) totalAmount: string;
  @Column() currency: string;
  @Column({ type: 'enum', enum: InvoiceStatus, default: InvoiceStatus.ISSUED }) status: InvoiceStatus;
  @Column({ type: 'timestamptz' }) issuedAt: Date;
  @OneToMany(() => InvoiceLine, (line) => line.invoice, { cascade: true }) lines: InvoiceLine[];
}

@Entity('invoice_lines')
export class InvoiceLine extends BaseEntity {
  @Column() invoiceId: string;
  @ManyToOne(() => Invoice, (invoice) => invoice.lines) @JoinColumn({ name: 'invoiceId' })
  invoice: Invoice;
  @Column({ type: 'varchar', length: 20 }) itemType: 'product' | 'service';
  @Column({ nullable: true }) sourceId?: string;
  @Column() descriptionSnapshot: string;
  @Column({ type: 'jsonb', default: {} }) attributesSnapshot: Record<string, unknown>;
  @Column({ type: 'decimal', precision: 12, scale: 3 }) quantity: string;
  @Column({ type: 'bigint' }) unitPrice: string;
  @Column({ type: 'bigint' }) total: string;
}

@Entity('vehicle_public_links')
export class VehiclePublicLink extends BaseEntity {
  @Column() shopId: string;
  @Column() vehicleId: string;
  @ManyToOne(() => Vehicle) @JoinColumn({ name: 'vehicleId' }) vehicle: Vehicle;
  @Column({ unique: true }) tokenHash: string;
  @Column({ type: 'enum', enum: PublicLinkStatus, default: PublicLinkStatus.ACTIVE })
  status: PublicLinkStatus;
  @Column({ type: 'timestamptz', nullable: true }) expiresAt?: Date;
  @Column({ type: 'timestamptz', nullable: true }) revokedAt?: Date;
  @Column({ type: 'timestamptz', nullable: true }) lastAccessAt?: Date;
}

@Entity('suggestions')
export class Suggestion extends BaseEntity {
  @Column() shopId: string;
  @Column() entityType: string;
  @Column({ type: 'jsonb' }) payload: Record<string, unknown>;
  @Column({ type: 'enum', enum: SuggestionStatus, default: SuggestionStatus.PENDING })
  status: SuggestionStatus;
  @Column({ nullable: true }) decisionNote?: string;
  @Column({ nullable: true }) mappedEntityId?: string;
}

@Entity('audit_logs')
export class AuditLog extends BaseEntity {
  @Column({ nullable: true }) actorId?: string;
  @Column({ nullable: true }) shopId?: string;
  @Column() action: string;
  @Column() entityType: string;
  @Column({ nullable: true }) entityId?: string;
  @Column({ type: 'jsonb', nullable: true }) before?: Record<string, unknown>;
  @Column({ type: 'jsonb', nullable: true }) after?: Record<string, unknown>;
}

export const ENTITIES = [
  Shop, User, VehicleBrand, VehicleModel, ProductManufacturer, ProductType,
  ProductAttributeDefinition, ProductAttributeOption, Product, ShopProduct,
  ServiceCatalog, ShopService, Customer, Vehicle, ServiceOrder,
  ServiceProductLine, ServiceLaborLine, Invoice, InvoiceLine,
  VehiclePublicLink, Suggestion, AuditLog,
];
