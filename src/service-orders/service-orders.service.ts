import {
  BadRequestException, ConflictException, Injectable, NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { randomBytes, createHash } from 'crypto';
import {
  AuditLog, Customer, Invoice, InvoiceLine, Product, ProductAttributeDefinition, ServiceCatalog,
  ServiceLaborLine, ServiceOrder, ServiceProductLine, Shop, Suggestion,
  ShopProduct, ShopService, Vehicle, VehiclePublicLink,
} from '../database/entities';
import {
  InvoiceStatus, PublicLinkStatus, RecordStatus, ServiceOrderStatus, SuggestionStatus,
} from '../common/enums';
import { CancelOrderDto, CompleteOrderDto, CreateOrderDto } from './dto';

@Injectable()
export class ServiceOrdersService {
  constructor(private readonly dataSource: DataSource) {}

  list(shopId: string, vehicleId?: string) {
    return this.dataSource.getRepository(ServiceOrder).find({
      where: { shopId, ...(vehicleId ? { vehicleId } : {}) },
      relations: { customer: true, vehicle: true, productLines: true, laborLines: true },
      order: { serviceDate: 'DESC' },
      take: 50,
    });
  }

  async get(shopId: string, id: string) {
    const order = await this.dataSource.getRepository(ServiceOrder).findOne({
      where: { id, shopId },
      relations: { customer: true, vehicle: true, productLines: true, laborLines: true },
    });
    if (!order) throw new NotFoundException('سرویس یافت نشد.');
    return order;
  }

  async createDraft(shopId: string, actorId: string, dto: CreateOrderDto) {
    return this.dataSource.transaction(async (manager) => {
      const [customer, vehicle] = await Promise.all([
        manager.findOneBy(Customer, { id: dto.customerId, shopId }),
        manager.findOneBy(Vehicle, { id: dto.vehicleId, shopId }),
      ]);
      if (!customer || !vehicle || vehicle.ownerCustomerId !== customer.id) {
        throw new NotFoundException('مشتری یا خودرو در این فروشگاه یافت نشد.');
      }
      if (vehicle.lastOdometer !== null && vehicle.lastOdometer !== undefined && dto.odometer < vehicle.lastOdometer) {
        throw new BadRequestException('کیلومتر واردشده از آخرین مقدار ثبت‌شده کمتر است.');
      }
      const order = await manager.save(ServiceOrder, manager.create(ServiceOrder, {
        shopId,
        customerId: customer.id,
        vehicleId: vehicle.id,
        serviceDate: dto.serviceDate ? new Date(dto.serviceDate) : new Date(),
        odometer: dto.odometer,
        note: dto.note,
        status: ServiceOrderStatus.DRAFT,
      }));
      await this.replaceLines(manager, order, dto);
      await this.audit(manager, actorId, shopId, 'service_order.created', order.id, undefined, { status: order.status });
      return manager.findOne(ServiceOrder, {
        where: { id: order.id },
        relations: { productLines: true, laborLines: true },
      });
    });
  }

  async updateDraft(shopId: string, actorId: string, id: string, dto: CreateOrderDto) {
    return this.dataSource.transaction(async (manager) => {
      const order = await manager.findOneBy(ServiceOrder, { id, shopId });
      if (!order) throw new NotFoundException('سرویس یافت نشد.');
      if (order.status !== ServiceOrderStatus.DRAFT) throw new ConflictException('فقط پیش‌نویس قابل ویرایش است.');
      const [customer, vehicle] = await Promise.all([
        manager.findOneBy(Customer, { id: dto.customerId, shopId }),
        manager.findOneBy(Vehicle, { id: dto.vehicleId, shopId }),
      ]);
      if (!customer || !vehicle || vehicle.ownerCustomerId !== customer.id) {
        throw new NotFoundException('مشتری یا خودرو در این فروشگاه یافت نشد.');
      }
      if (vehicle.lastOdometer !== null && vehicle.lastOdometer !== undefined && dto.odometer < vehicle.lastOdometer) {
        throw new BadRequestException('کیلومتر واردشده از آخرین مقدار ثبت‌شده کمتر است.');
      }
      Object.assign(order, {
        customerId: dto.customerId, vehicleId: dto.vehicleId, odometer: dto.odometer,
        serviceDate: dto.serviceDate ? new Date(dto.serviceDate) : order.serviceDate, note: dto.note,
      });
      await manager.save(order);
      await manager.delete(ServiceProductLine, { orderId: order.id });
      await manager.delete(ServiceLaborLine, { orderId: order.id });
      await this.replaceLines(manager, order, dto);
      await this.audit(manager, actorId, shopId, 'service_order.updated', order.id);
      return manager.findOne(ServiceOrder, {
        where: { id: order.id },
        relations: { productLines: true, laborLines: true },
      });
    });
  }

  async complete(shopId: string, actorId: string, id: string, idempotencyKey: string, dto: CompleteOrderDto) {
    if (!idempotencyKey) throw new BadRequestException('هدر Idempotency-Key الزامی است.');
    return this.dataSource.transaction(async (manager) => {
      const repeated = await manager.findOneBy(ServiceOrder, { shopId, idempotencyKey });
      if (repeated) return this.completionResult(manager, repeated, undefined);

      const order = await manager.findOne(ServiceOrder, {
        where: { id, shopId },
        relations: { productLines: true, laborLines: true },
        lock: { mode: 'pessimistic_write' },
      });
      if (!order) throw new NotFoundException('سرویس یافت نشد.');
      if (order.status !== ServiceOrderStatus.DRAFT) throw new ConflictException('این سرویس قبلاً نهایی یا لغو شده است.');
      if (!order.productLines.length && !order.laborLines.length) throw new BadRequestException('سرویس بدون قلم قابل نهایی‌سازی نیست.');

      const [vehicle, shop] = await Promise.all([
        manager.findOneByOrFail(Vehicle, { id: order.vehicleId, shopId }),
        manager.findOne(Shop, { where: { id: shopId }, lock: { mode: 'pessimistic_write' } }),
      ]);
      if (!shop) throw new NotFoundException('فروشگاه یافت نشد.');

      const productsTotal = order.productLines.reduce((sum, line) => sum + Number(line.total), 0);
      const servicesTotal = order.laborLines.reduce((sum, line) => sum + Number(line.total), 0);
      const discount = dto.discountAmount ?? 0;
      if (discount > productsTotal + servicesTotal) throw new BadRequestException('تخفیف نمی‌تواند بیشتر از جمع فاکتور باشد.');
      const count = await manager.count(Invoice, { where: { shopId } });
      const year = new Intl.DateTimeFormat('fa-IR-u-nu-latn', { year: 'numeric', timeZone: shop.timezone }).format(order.serviceDate);
      const invoiceNo = `${year}-${String(count + 1).padStart(6, '0')}`;

      const invoice = manager.create(Invoice, {
        shopId, orderId: order.id, invoiceNo,
        productsTotal: String(productsTotal), servicesTotal: String(servicesTotal),
        discountAmount: String(discount), totalAmount: String(productsTotal + servicesTotal - discount),
        currency: shop.currency, issuedAt: new Date(),
      });
      invoice.lines = [
        ...order.productLines.map((line) => manager.create(InvoiceLine, {
          itemType: 'product' as const, sourceId: line.productId,
          descriptionSnapshot: String(line.snapshot.displayName ?? line.snapshot.description),
          attributesSnapshot: line.snapshot.attributes as Record<string, unknown> ?? {},
          quantity: line.quantity, unitPrice: line.unitPrice, total: line.total,
        })),
        ...order.laborLines.map((line) => manager.create(InvoiceLine, {
          itemType: 'service' as const, sourceId: line.serviceId,
          descriptionSnapshot: String(line.snapshot.name ?? line.snapshot.description),
          attributesSnapshot: {}, quantity: line.quantity, unitPrice: line.unitFee, total: line.total,
        })),
      ];
      await manager.save(invoice);
      order.status = ServiceOrderStatus.COMPLETED;
      order.idempotencyKey = idempotencyKey;
      await manager.save(order);
      vehicle.lastOdometer = Math.max(vehicle.lastOdometer ?? 0, order.odometer);
      await manager.save(vehicle);
      const rawToken = await this.ensurePublicLink(manager, shopId, vehicle.id);
      await this.audit(manager, actorId, shopId, 'service_order.completed', order.id, { status: 'draft' }, { status: 'completed', invoiceId: invoice.id });
      return this.completionResult(manager, order, rawToken);
    });
  }

  async cancel(shopId: string, actorId: string, id: string, dto: CancelOrderDto) {
    return this.dataSource.transaction(async (manager) => {
      const order = await manager.findOneBy(ServiceOrder, { id, shopId });
      if (!order) throw new NotFoundException('سرویس یافت نشد.');
      if (order.status === ServiceOrderStatus.CANCELED) return order;
      const previousStatus = order.status;
      order.status = ServiceOrderStatus.CANCELED;
      order.cancellationReason = dto.reason;
      await manager.save(order);
      if (previousStatus === ServiceOrderStatus.COMPLETED) {
        await manager.update(Invoice, {
          shopId,
          orderId: order.id,
          status: InvoiceStatus.ISSUED,
        }, { status: InvoiceStatus.VOID });
      }
      await this.audit(
        manager,
        actorId,
        shopId,
        'service_order.canceled',
        order.id,
        { status: previousStatus },
        { status: order.status, reason: dto.reason, invoiceVoided: previousStatus === ServiceOrderStatus.COMPLETED },
      );
      return order;
    });
  }

  private async replaceLines(manager: EntityManager, order: ServiceOrder, dto: CreateOrderDto) {
    for (const input of dto.products ?? []) {
      let snapshot: Record<string, unknown>;
      if (input.productId) {
        const product = await manager.findOneBy(Product, {
          id: input.productId,
          status: RecordStatus.ACTIVE,
        });
        if (!product) throw new NotFoundException('یکی از محصولات یافت نشد.');
        const shopProduct = await manager.findOneBy(ShopProduct, {
          shopId: order.shopId,
          productId: product.id,
        });
        if (shopProduct && !shopProduct.isActive) {
          throw new BadRequestException('محصول انتخاب‌شده در این فروشگاه غیرفعال است.');
        }
        const definitions = await manager.findBy(ProductAttributeDefinition, {
          productTypeId: product.productTypeId,
          schemaVersion: product.schemaVersion,
          status: RecordStatus.ACTIVE,
        });
        const invoiceKeys = new Set(
          definitions.filter((definition) => definition.showOnInvoice).map((definition) => definition.key),
        );
        snapshot = {
          displayName: product.displayName,
          attributes: Object.fromEntries(
            Object.entries(product.attributes).filter(([key]) => invoiceKeys.has(key)),
          ),
          schemaVersion: product.schemaVersion,
        };
      } else {
        if (!input.description) throw new BadRequestException('شرح آیتم موقت الزامی است.');
        snapshot = { description: input.description };
        await manager.save(Suggestion, manager.create(Suggestion, {
          shopId: order.shopId, entityType: 'product', payload: { description: input.description },
          status: SuggestionStatus.PENDING,
        }));
      }
      const dueDate = input.intervalMonths ? this.addMonths(order.serviceDate, input.intervalMonths) : undefined;
      await manager.save(ServiceProductLine, manager.create(ServiceProductLine, {
        orderId: order.id, productId: input.productId, snapshot,
        quantity: String(input.quantity), unitPrice: String(input.unitPrice),
        total: String(Math.round(input.quantity * input.unitPrice)),
        intervalKm: input.intervalKm, intervalMonths: input.intervalMonths,
        dueOdometer: input.intervalKm ? order.odometer + input.intervalKm : undefined,
        dueDate, temporary: !input.productId,
      }));
    }
    for (const input of dto.services ?? []) {
      let snapshot: Record<string, unknown>;
      if (input.serviceId) {
        const service = await manager.findOneBy(ServiceCatalog, {
          id: input.serviceId,
          status: RecordStatus.ACTIVE,
        });
        if (!service) throw new NotFoundException('یکی از خدمات یافت نشد.');
        const shopService = await manager.findOneBy(ShopService, {
          shopId: order.shopId,
          serviceId: service.id,
        });
        if (shopService && !shopService.isActive) {
          throw new BadRequestException('خدمت انتخاب‌شده در این فروشگاه غیرفعال است.');
        }
        snapshot = { name: service.name, category: service.category };
      } else {
        if (!input.description) throw new BadRequestException('شرح خدمت محلی الزامی است.');
        snapshot = { description: input.description };
        await manager.save(Suggestion, manager.create(Suggestion, {
          shopId: order.shopId,
          entityType: 'service',
          payload: { description: input.description },
          status: SuggestionStatus.PENDING,
        }));
      }
      await manager.save(ServiceLaborLine, manager.create(ServiceLaborLine, {
        orderId: order.id, serviceId: input.serviceId, snapshot,
        quantity: String(input.quantity), unitFee: String(input.unitFee),
        total: String(Math.round(input.quantity * input.unitFee)),
      }));
    }
  }

  private addMonths(date: Date, months: number): string {
    const result = new Date(date);
    result.setUTCMonth(result.getUTCMonth() + months);
    return result.toISOString().slice(0, 10);
  }

  private async ensurePublicLink(manager: EntityManager, shopId: string, vehicleId: string) {
    const active = await manager.findOneBy(VehiclePublicLink, { shopId, vehicleId, status: PublicLinkStatus.ACTIVE });
    if (active) return undefined;
    const token = randomBytes(24).toString('base64url');
    await manager.save(VehiclePublicLink, manager.create(VehiclePublicLink, {
      shopId, vehicleId, tokenHash: createHash('sha256').update(token).digest('hex'),
    }));
    return token;
  }

  private async completionResult(manager: EntityManager, order: ServiceOrder, token?: string) {
    const invoice = await manager.findOneBy(Invoice, { orderId: order.id, shopId: order.shopId });
    return {
      serviceOrderId: order.id,
      invoiceId: invoice?.id,
      invoiceNo: invoice?.invoiceNo,
      totalAmount: invoice ? Number(invoice.totalAmount) : undefined,
      currency: invoice?.currency,
      publicToken: token,
    };
  }

  private audit(
    manager: EntityManager, actorId: string, shopId: string, action: string,
    entityId: string, before?: Record<string, unknown>, after?: Record<string, unknown>,
  ) {
    return manager.save(AuditLog, manager.create(AuditLog, {
      actorId, shopId, action, entityType: 'service_order', entityId, before, after,
    }));
  }
}
