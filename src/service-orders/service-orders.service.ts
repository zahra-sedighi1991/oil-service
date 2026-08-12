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
import { CancelOrderDto, CompleteOrderDto, CreateOrderDto, type ReminderStatus } from './dto';

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
        lock: { mode: 'pessimistic_write' },
      });
      if (!order) throw new NotFoundException('سرویس یافت نشد.');
      if (order.status !== ServiceOrderStatus.DRAFT) throw new ConflictException('این سرویس قبلاً نهایی یا لغو شده است.');

      // PostgreSQL cannot apply FOR UPDATE to the nullable side of the LEFT JOINs
      // TypeORM creates when relations are loaded in the locking query. Keep the
      // order row locked, then load its lines separately in the same transaction.
      const [productLines, laborLines] = await Promise.all([
        manager.findBy(ServiceProductLine, { orderId: order.id }),
        manager.findBy(ServiceLaborLine, { orderId: order.id }),
      ]);
      if (!productLines.length && !laborLines.length) throw new BadRequestException('سرویس بدون قلم قابل نهایی‌سازی نیست.');

      const [vehicle, shop] = await Promise.all([
        manager.findOneByOrFail(Vehicle, { id: order.vehicleId, shopId }),
        manager.findOne(Shop, { where: { id: shopId }, lock: { mode: 'pessimistic_write' } }),
      ]);
      if (!shop) throw new NotFoundException('فروشگاه یافت نشد.');

      const productsTotal = productLines.reduce((sum, line) => sum + Number(line.total), 0);
      const servicesTotal = laborLines.reduce((sum, line) => sum + Number(line.total), 0);
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
        ...productLines.map((line) => manager.create(InvoiceLine, {
          itemType: 'product' as const, sourceId: line.productId,
          descriptionSnapshot: String(line.snapshot.displayName ?? line.snapshot.description),
          attributesSnapshot: line.snapshot.attributes as Record<string, unknown> ?? {},
          quantity: line.quantity, unitPrice: line.unitPrice, total: line.total,
        })),
        ...laborLines.map((line) => manager.create(InvoiceLine, {
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
        const latest = await manager.createQueryBuilder(ServiceOrder, 'remainingOrder')
          .select('MAX(remainingOrder.odometer)', 'odometer')
          .where('remainingOrder.shopId = :shopId', { shopId })
          .andWhere('remainingOrder.vehicleId = :vehicleId', { vehicleId: order.vehicleId })
          .andWhere('remainingOrder.status = :status', { status: ServiceOrderStatus.COMPLETED })
          .getRawOne<{ odometer: string | null }>();
        const vehicle = await manager.findOneByOrFail(Vehicle, { id: order.vehicleId, shopId });
        vehicle.lastOdometer = latest?.odometer === null || latest?.odometer === undefined
          ? null
          : Number(latest.odometer);
        await manager.save(vehicle);
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
      let intervalKm = input.intervalKm;
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
        if (!shopProduct?.isActive) {
          throw new BadRequestException('محصول انتخاب‌شده در کاتالوگ این فروشگاه فعال نیست.');
        }
        if (intervalKm === undefined) {
          const configuredInterval = shopProduct?.override?.intervalKm
            ?? product.attributes?.interval_km
            ?? product.attributes?.suggested_km;
          const parsedInterval = Number(configuredInterval);
          if (Number.isInteger(parsedInterval) && parsedInterval >= 0) intervalKm = parsedInterval;
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
        if (!input.description?.trim()) throw new BadRequestException('نام محصول خارج از کاتالوگ الزامی است.');
        snapshot = { description: input.description };
        await this.ensurePendingSuggestion(manager, order.shopId, 'product', input.description);
      }
      const dueDate = input.intervalMonths ? this.addMonths(order.serviceDate, input.intervalMonths) : undefined;
      await manager.save(ServiceProductLine, manager.create(ServiceProductLine, {
        orderId: order.id, productId: input.productId, snapshot,
        quantity: String(input.quantity), unitPrice: String(input.unitPrice),
        total: String(Math.round(input.quantity * input.unitPrice)),
        intervalKm, intervalMonths: input.intervalMonths,
        dueOdometer: intervalKm ? order.odometer + intervalKm : undefined,
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
        if (!input.description?.trim()) throw new BadRequestException('نام خدمت خارج از کاتالوگ الزامی است.');
        snapshot = { description: input.description };
        await this.ensurePendingSuggestion(manager, order.shopId, 'service', input.description);
      }
      await manager.save(ServiceLaborLine, manager.create(ServiceLaborLine, {
        orderId: order.id, serviceId: input.serviceId, snapshot,
        quantity: String(input.quantity), unitFee: String(input.unitFee),
        total: String(Math.round(input.quantity * input.unitFee)),
      }));
    }
  }

  async reminders(shopId: string, daysAheadInput?: string) {
    const parsedDaysAhead = Number.parseInt(daysAheadInput ?? '14', 10);
    const daysAhead = Number.isFinite(parsedDaysAhead)
      ? Math.min(Math.max(parsedDaysAhead, 0), 90)
      : 14;
    const shop = await this.dataSource.getRepository(Shop).findOneByOrFail({ id: shopId });
    const rows = await this.dataSource.getRepository(ServiceOrder).query(
      `WITH ranked_orders AS (
        SELECT
          service_order.*,
          ROW_NUMBER() OVER (
            PARTITION BY service_order."vehicleId"
            ORDER BY service_order."serviceDate" DESC, service_order.id DESC
          ) AS rank
        FROM service_orders service_order
        WHERE service_order."shopId" = $1 AND service_order.status = $2
      )
      SELECT
        latest.id AS "serviceOrderId",
        latest."customerId",
        latest."vehicleId",
        latest."serviceDate" AS "lastServiceDate",
        latest.odometer AS "lastOdometer",
        customer.name AS "customerName",
        customer.gender AS "customerGender",
        customer."mobileNormalized",
        customer."mobileDisplay",
        vehicle."plateDisplay",
        vehicle."temporaryIdentifier",
        brand."nameFa" AS "brandName",
        model."nameFa" AS "modelName",
        due."dueDate" AS "explicitDueDate",
        due."dueItem",
        reminder_status.action AS "reminderAction",
        reminder_status."createdAt" AS "reminderStatusAt",
        ARRAY(
          SELECT history."serviceDate"
          FROM ranked_orders history
          WHERE history."vehicleId" = latest."vehicleId" AND history.rank <= 4
          ORDER BY history.rank
        ) AS "historyDates",
        EXISTS (
          SELECT 1
          FROM audit_logs contact
          WHERE contact."shopId" = $1
            AND contact.action = 'service_reminder.sms_composer_opened'
            AND contact."entityType" = 'vehicle'
            AND contact."entityId" = latest."vehicleId"::text
            AND (contact."createdAt" AT TIME ZONE $3)::date =
              (CURRENT_TIMESTAMP AT TIME ZONE $3)::date
        ) AS "contactedToday"
      FROM ranked_orders latest
      INNER JOIN customers customer ON customer.id = latest."customerId"
      INNER JOIN vehicles vehicle ON vehicle.id = latest."vehicleId"
      LEFT JOIN vehicle_brands brand ON brand.id = vehicle."brandId"
      LEFT JOIN vehicle_models model ON model.id = vehicle."modelId"
      LEFT JOIN LATERAL (
        SELECT
          line."dueDate",
          COALESCE(line.snapshot->>'displayName', line.snapshot->>'description') AS "dueItem"
        FROM service_product_lines line
        WHERE line."orderId" = latest.id AND line."dueDate" IS NOT NULL
        ORDER BY line."dueDate" ASC
        LIMIT 1
      ) due ON true
      LEFT JOIN LATERAL (
        SELECT contact.action, contact."createdAt"
        FROM audit_logs contact
        WHERE contact."shopId" = $1
          AND contact."entityType" = 'vehicle'
          AND contact."entityId" = latest."vehicleId"::text
          AND contact.action LIKE 'service_reminder.status.%'
          AND contact."createdAt" > latest."serviceDate"
        ORDER BY contact."createdAt" DESC, contact.id DESC
        LIMIT 1
      ) reminder_status ON true
      WHERE latest.rank = 1 AND customer.status = $4
      ORDER BY latest."serviceDate" DESC`,
      [shopId, ServiceOrderStatus.COMPLETED, shop.timezone, RecordStatus.ACTIVE],
    );

    const today = this.dateInTimeZone(new Date(), shop.timezone);
    const items = rows.map((row: Record<string, unknown>) => {
      const lastServiceDate = new Date(String(row.lastServiceDate));
      const historyDates = (row.historyDates as Array<string | Date> ?? []).map((value) => new Date(value));
      const intervals = historyDates.slice(0, -1)
        .map((value, index) => Math.round((value.getTime() - historyDates[index + 1].getTime()) / 86_400_000))
        .filter((days) => days >= 30 && days <= 365)
        .sort((a, b) => a - b);
      const intervalDays = intervals.length
        ? intervals[Math.floor(intervals.length / 2)]
        : undefined;
      const explicitDueDate = row.explicitDueDate ? String(row.explicitDueDate) : undefined;
      const reminderStatus = row.reminderAction
        ? String(row.reminderAction).replace('service_reminder.status.', '') as ReminderStatus
        : undefined;
      const reminderStatusAt = row.reminderStatusAt ? new Date(String(row.reminderStatusAt)) : undefined;
      const dueDate = explicitDueDate
        ?? (intervalDays
          ? this.addDays(this.dateInTimeZone(lastServiceDate, shop.timezone), intervalDays)
          : this.addCalendarMonths(this.dateInTimeZone(lastServiceDate, shop.timezone), 3));
      return {
        serviceOrderId: row.serviceOrderId,
        customerId: row.customerId,
        vehicleId: row.vehicleId,
        customerName: row.customerName,
        customerGender: row.customerGender,
        mobileNormalized: row.mobileNormalized,
        mobileDisplay: row.mobileDisplay,
        plateDisplay: row.plateDisplay,
        temporaryIdentifier: row.temporaryIdentifier,
        brandName: row.brandName,
        modelName: row.modelName,
        lastServiceDate: lastServiceDate.toISOString(),
        lastOdometer: Number(row.lastOdometer),
        dueDate,
        dueItem: row.dueItem,
        dueSource: explicitDueDate ? 'registered' : intervalDays ? 'history' : 'default',
        intervalDays: explicitDueDate
          ? Math.max(1, this.daysBetween(this.dateInTimeZone(lastServiceDate, shop.timezone), dueDate))
          : intervalDays ?? this.daysBetween(this.dateInTimeZone(lastServiceDate, shop.timezone), dueDate),
        daysUntilDue: this.daysBetween(today, dueDate),
        contactedToday: Boolean(row.contactedToday),
        reminderStatus,
        reminderStatusAt: reminderStatusAt?.toISOString(),
        needsFollowUp: reminderStatus === 'sms_sent' && reminderStatusAt
          ? Date.now() - reminderStatusAt.getTime() >= 2 * 86_400_000
          : reminderStatus === 'no_answer',
      };
    })
      .filter((item) => item.daysUntilDue <= daysAhead)
      .sort((a, b) => a.daysUntilDue - b.daysUntilDue);

    return {
      generatedAt: new Date().toISOString(),
      daysAhead,
      shop: { name: shop.name, phone: shop.publicPhone },
      items,
    };
  }

  async logReminderSmsOpened(shopId: string, actorId: string, vehicleId: string) {
    const vehicle = await this.dataSource.getRepository(Vehicle).findOneBy({ id: vehicleId, shopId });
    if (!vehicle) throw new NotFoundException('خودرو یافت نشد.');
    await this.dataSource.getRepository(AuditLog).save({
      actorId,
      shopId,
      action: 'service_reminder.sms_composer_opened',
      entityType: 'vehicle',
      entityId: vehicleId,
      after: { openedAt: new Date().toISOString() },
    });
    return { success: true };
  }

  async updateReminderStatus(shopId: string, actorId: string, vehicleId: string, status: ReminderStatus) {
    const vehicle = await this.dataSource.getRepository(Vehicle).findOneBy({ id: vehicleId, shopId });
    if (!vehicle) throw new NotFoundException('خودرو یافت نشد.');
    const recordedAt = new Date();
    await this.dataSource.getRepository(AuditLog).save({
      actorId,
      shopId,
      action: `service_reminder.status.${status}`,
      entityType: 'vehicle',
      entityId: vehicleId,
      after: { status, recordedAt: recordedAt.toISOString() },
    });
    return { status, recordedAt: recordedAt.toISOString() };
  }

  private async ensurePendingSuggestion(
    manager: EntityManager,
    shopId: string,
    entityType: 'product' | 'service',
    rawDescription: string,
  ) {
    const description = rawDescription.trim();
    const existing = await manager.createQueryBuilder(Suggestion, 'suggestion')
      .where('suggestion.shopId = :shopId', { shopId })
      .andWhere('suggestion.entityType = :entityType', { entityType })
      .andWhere('suggestion.status = :status', { status: SuggestionStatus.PENDING })
      .andWhere("LOWER(TRIM(suggestion.payload->>'description')) = LOWER(TRIM(:description))", { description })
      .getOne();
    if (existing) return existing;
    return manager.save(Suggestion, manager.create(Suggestion, {
      shopId,
      entityType,
      payload: { description },
      status: SuggestionStatus.PENDING,
    }));
  }

  private addMonths(date: Date, months: number): string {
    const result = new Date(date);
    result.setUTCMonth(result.getUTCMonth() + months);
    return result.toISOString().slice(0, 10);
  }

  private dateInTimeZone(date: Date, timeZone: string): string {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);
    const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
    return `${value.year}-${value.month}-${value.day}`;
  }

  private addDays(date: string, days: number): string {
    const value = new Date(`${date}T00:00:00.000Z`);
    value.setUTCDate(value.getUTCDate() + days);
    return value.toISOString().slice(0, 10);
  }

  private addCalendarMonths(date: string, months: number): string {
    const [year, month, day] = date.split('-').map(Number);
    const value = new Date(Date.UTC(year, month - 1 + months, 1));
    const lastDay = new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + 1, 0)).getUTCDate();
    value.setUTCDate(Math.min(day, lastDay));
    return value.toISOString().slice(0, 10);
  }

  private daysBetween(from: string, to: string): number {
    return Math.round((Date.parse(`${to}T00:00:00.000Z`) - Date.parse(`${from}T00:00:00.000Z`)) / 86_400_000);
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
