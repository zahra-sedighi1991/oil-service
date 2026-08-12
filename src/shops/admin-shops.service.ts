import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  AuditLog, Product, ServiceCatalog, ServiceOrder, Shop, Suggestion, User,
} from '../database/entities';
import {
  InvoiceStatus, RecordStatus, ServiceOrderStatus, ShopStatus, SuggestionStatus, UserRole,
} from '../common/enums';
import type { UpdateShopDto } from './dto';

@Injectable()
export class AdminShopsService {
  constructor(private readonly dataSource: DataSource) {}

  async overview() {
    const [shops, operational, catalog, suggestions] = await Promise.all([
      this.dataSource.getRepository(Shop).createQueryBuilder('shop')
        .select('COUNT(*)', 'all')
        .addSelect('COUNT(*) FILTER (WHERE shop.status = :active)', 'active')
        .addSelect('COUNT(*) FILTER (WHERE shop.status = :pending)', 'pending')
        .addSelect('COUNT(*) FILTER (WHERE shop.status = :suspended)', 'suspended')
        .addSelect('COUNT(*) FILTER (WHERE shop.status = :closed)', 'closed')
        .addSelect(`COUNT(*) FILTER (WHERE shop."createdAt" >= date_trunc('month', CURRENT_TIMESTAMP))`, 'newThisMonth')
        .setParameters({ active: ShopStatus.ACTIVE, pending: ShopStatus.PENDING, suspended: ShopStatus.SUSPENDED, closed: ShopStatus.CLOSED })
        .getRawOne<Record<string, string>>(),
      this.dataSource.getRepository(ServiceOrder).query(
        `SELECT
          COUNT(*) FILTER (WHERE status = $1) AS "completedServices",
          COUNT(*) FILTER (WHERE status = $1 AND "serviceDate" >= date_trunc('month', CURRENT_TIMESTAMP)) AS "servicesThisMonth",
          (SELECT COUNT(*) FROM customers) AS customers,
          (SELECT COUNT(*) FROM vehicles) AS vehicles,
          COALESCE((SELECT SUM(CASE WHEN shop.currency = 'IRR' THEN invoice."totalAmount"::numeric / 10 ELSE invoice."totalAmount"::numeric END) FROM invoices invoice JOIN shops shop ON shop.id::text = invoice."shopId" WHERE invoice.status = $2), 0) AS revenue,
          COALESCE((SELECT SUM(CASE WHEN shop.currency = 'IRR' THEN invoice."totalAmount"::numeric / 10 ELSE invoice."totalAmount"::numeric END) FROM invoices invoice JOIN shops shop ON shop.id::text = invoice."shopId" WHERE invoice.status = $2 AND invoice."issuedAt" >= date_trunc('month', CURRENT_TIMESTAMP)), 0) AS "revenueThisMonth"
        FROM service_orders`,
        [ServiceOrderStatus.COMPLETED, InvoiceStatus.ISSUED],
      ),
      Promise.all([
        this.dataSource.getRepository(Product).count({ where: { status: RecordStatus.ACTIVE } }),
        this.dataSource.getRepository(ServiceCatalog).count({ where: { status: RecordStatus.ACTIVE } }),
      ]),
      this.dataSource.getRepository(Suggestion).count({ where: { status: SuggestionStatus.PENDING } }),
    ]);
    const operation = operational[0] ?? {};
    return {
      shops: this.numericObject(shops ?? {}),
      operations: this.numericObject(operation),
      catalog: { products: catalog[0], services: catalog[1], pendingSuggestions: suggestions },
    };
  }

  async list(search?: string, status?: ShopStatus) {
    const query = this.dataSource.getRepository(Shop).createQueryBuilder('shop')
      .leftJoin(User, 'owner', 'owner."shopId" = shop.id')
      .select([
        'shop.id AS id', 'shop.name AS name', 'shop."ownerName" AS "ownerName"',
        'shop."publicPhone" AS "publicPhone"', 'shop.city AS city', 'shop.address AS address',
        'shop.status AS status', 'shop.currency AS currency', 'shop."createdAt" AS "createdAt"',
      ])
      .addSelect('COUNT(DISTINCT owner.id)', 'users')
      .addSelect('(SELECT COUNT(*) FROM customers customer WHERE customer."shopId" = shop.id::text)', 'customers')
      .addSelect('(SELECT COUNT(*) FROM vehicles vehicle WHERE vehicle."shopId" = shop.id::text)', 'vehicles')
      .addSelect(
        '(SELECT COUNT(*) FROM service_orders service_order WHERE service_order."shopId" = shop.id::text AND service_order.status = :completedStatus)',
        'services',
      )
      .addSelect(
        `(SELECT COUNT(*) FROM service_orders service_order
          WHERE service_order."shopId" = shop.id::text
          AND service_order.status = :completedStatus
          AND service_order."serviceDate" >= date_trunc('month', CURRENT_TIMESTAMP))`,
        'servicesThisMonth',
      )
      .addSelect(
        '(SELECT COALESCE(SUM(invoice."totalAmount"::numeric), 0) FROM invoices invoice WHERE invoice."shopId" = shop.id::text AND invoice.status = :issuedStatus)',
        'revenue',
      )
      .addSelect(
        '(SELECT MAX(service_order."serviceDate") FROM service_orders service_order WHERE service_order."shopId" = shop.id::text AND service_order.status = :completedStatus)',
        'lastServiceAt',
      )
      .groupBy('shop.id')
      .orderBy('shop."createdAt"', 'DESC')
      .setParameters({
        completedStatus: ServiceOrderStatus.COMPLETED,
        issuedStatus: InvoiceStatus.ISSUED,
      })
      .take(200);
    if (status && Object.values(ShopStatus).includes(status)) query.andWhere('shop.status = :status', { status });
    if (search?.trim()) {
      const value = `%${search.trim()}%`;
      query.andWhere('(shop.name ILIKE :value OR shop."ownerName" ILIKE :value OR shop."publicPhone" ILIKE :value OR shop.city ILIKE :value)', { value });
    }
    return (await query.getRawMany<Record<string, unknown>>()).map((row) => this.numericObject(row));
  }

  async detail(id: string) {
    const shop = await this.dataSource.getRepository(Shop).findOneBy({ id });
    if (!shop) throw new NotFoundException('فروشگاه یافت نشد.');
    const shopId = id;
    const [summaryRows, users, recentServices, audits, configuration] = await Promise.all([
      this.dataSource.getRepository(ServiceOrder).query(
        `SELECT
          (SELECT COUNT(*) FROM customers WHERE "shopId" = $1) AS customers,
          (SELECT COUNT(*) FROM vehicles WHERE "shopId" = $1) AS vehicles,
          COUNT(*) FILTER (WHERE status = $2) AS services,
          COUNT(*) FILTER (WHERE status = $2 AND "serviceDate" >= date_trunc('month', CURRENT_TIMESTAMP)) AS "servicesThisMonth",
          COUNT(*) FILTER (WHERE status = $3) AS drafts,
          COALESCE((SELECT COUNT(*) FROM invoices WHERE "shopId" = $1 AND status = $4), 0) AS invoices,
          COALESCE((SELECT SUM("totalAmount"::numeric) FROM invoices WHERE "shopId" = $1 AND status = $4), 0) AS revenue,
          COALESCE((SELECT SUM("totalAmount"::numeric) FROM invoices WHERE "shopId" = $1 AND status = $4 AND "issuedAt" >= date_trunc('month', CURRENT_TIMESTAMP)), 0) AS "revenueThisMonth",
          MAX("serviceDate") FILTER (WHERE status = $2) AS "lastServiceAt"
        FROM service_orders WHERE "shopId" = $1`,
        [shopId, ServiceOrderStatus.COMPLETED, ServiceOrderStatus.DRAFT, InvoiceStatus.ISSUED],
      ),
      this.dataSource.getRepository(User).find({
        where: { shopId },
        select: { id: true, name: true, mobile: true, role: true, status: true, createdAt: true, updatedAt: true },
        order: { createdAt: 'ASC' },
      }),
      this.dataSource.getRepository(ServiceOrder).find({
        where: { shopId },
        select: {
          id: true,
          serviceDate: true,
          odometer: true,
          status: true,
          customer: { id: true, name: true },
          vehicle: {
            id: true,
            plateDisplay: true,
            brand: { id: true, nameFa: true },
            model: { id: true, nameFa: true },
          },
        },
        relations: { customer: true, vehicle: { brand: true, model: true } },
        order: { serviceDate: 'DESC' },
        take: 10,
      }),
      this.dataSource.getRepository(AuditLog).find({
        where: { shopId },
        select: { id: true, actorId: true, shopId: true, action: true, entityType: true, entityId: true, createdAt: true },
        order: { createdAt: 'DESC' },
        take: 30,
      }),
      Promise.all([
        this.dataSource.query('SELECT COUNT(*) AS count FROM shop_products WHERE "shopId" = $1 AND "isActive" = true', [shopId]),
        this.dataSource.query('SELECT COUNT(*) AS count FROM shop_services WHERE "shopId" = $1 AND "isActive" = true', [shopId]),
        this.dataSource.getRepository(Suggestion).count({ where: { shopId, status: SuggestionStatus.PENDING } }),
      ]),
    ]);
    return {
      shop,
      summary: this.numericObject(summaryRows[0] ?? {}),
      configuration: {
        activeProducts: Number(configuration[0][0]?.count ?? 0),
        activeServices: Number(configuration[1][0]?.count ?? 0),
        pendingSuggestions: configuration[2],
      },
      users,
      recentServices,
      audits,
    };
  }

  async update(id: string, actorId: string, dto: UpdateShopDto) {
    return this.dataSource.transaction(async (manager) => {
      const shop = await manager.findOneBy(Shop, { id });
      if (!shop) throw new NotFoundException('فروشگاه یافت نشد.');
      const before = { ...shop };
      Object.assign(shop, dto);
      const result = await manager.save(shop);
      await manager.save(AuditLog, manager.create(AuditLog, {
        actorId, shopId: id, action: 'admin.shop_updated', entityType: 'shop', entityId: id,
        before, after: { ...dto },
      }));
      return result;
    });
  }

  async updateUserStatus(shopId: string, userId: string, actorId: string, status: RecordStatus) {
    return this.dataSource.transaction(async (manager) => {
      const user = await manager.findOneBy(User, { id: userId, shopId });
      if (!user || user.role === UserRole.SUPER_ADMIN) throw new NotFoundException('کاربر فروشگاه یافت نشد.');
      const previousStatus = user.status;
      user.status = status;
      const result = await manager.save(user);
      await manager.save(AuditLog, manager.create(AuditLog, {
        actorId,
        shopId,
        action: 'admin.shop_user_status_changed',
        entityType: 'user',
        entityId: userId,
        before: { status: previousStatus },
        after: { status },
      }));
      return {
        id: result.id,
        name: result.name,
        mobile: result.mobile,
        role: result.role,
        status: result.status,
        updatedAt: result.updatedAt,
      };
    });
  }

  private numericObject<T extends Record<string, unknown>>(value: T): T {
    const result = { ...value };
    for (const key of ['all', 'active', 'pending', 'suspended', 'closed', 'newThisMonth', 'completedServices', 'servicesThisMonth', 'customers', 'vehicles', 'revenue', 'revenueThisMonth', 'users', 'services', 'drafts', 'invoices']) {
      if (key in result) (result as Record<string, unknown>)[key] = Number(result[key] ?? 0);
    }
    return result;
  }
}
