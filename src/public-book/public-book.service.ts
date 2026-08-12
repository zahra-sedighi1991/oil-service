import { GoneException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, In } from 'typeorm';
import { createHash, randomBytes } from 'crypto';
import {
  AuditLog, Invoice, Product, ServiceOrder, Shop, Vehicle, VehiclePublicLink,
} from '../database/entities';
import {
  InvoiceStatus, PublicLinkStatus, ServiceOrderStatus,
} from '../common/enums';

@Injectable()
export class PublicBookService {
  constructor(private readonly dataSource: DataSource) {}

  async view(token: string) {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const link = await this.dataSource.getRepository(VehiclePublicLink).findOneBy({ tokenHash });
    if (!link) throw new NotFoundException('لینک دفترچه سرویس یافت نشد.');
    if (link.status !== PublicLinkStatus.ACTIVE || link.revokedAt || (link.expiresAt && link.expiresAt < new Date())) {
      throw new GoneException('این لینک دیگر معتبر نیست.');
    }
    const [vehicle, shop, orders] = await Promise.all([
      this.dataSource.getRepository(Vehicle).findOne({
        where: { id: link.vehicleId, shopId: link.shopId },
        relations: { brand: true, model: true },
      }),
      this.dataSource.getRepository(Shop).findOneBy({ id: link.shopId }),
      this.dataSource.getRepository(ServiceOrder).find({
        where: { vehicleId: link.vehicleId, shopId: link.shopId, status: ServiceOrderStatus.COMPLETED },
        relations: { productLines: true, laborLines: true },
        order: { serviceDate: 'DESC' },
      }),
    ]);
    if (!vehicle || !shop) throw new NotFoundException('اطلاعات دفترچه سرویس یافت نشد.');
    const invoices = await this.dataSource.getRepository(Invoice).find({
      select: { orderId: true, totalAmount: true, currency: true },
      where: { shopId: link.shopId, status: InvoiceStatus.ISSUED },
    });
    const invoiceByOrderId = new Map(invoices.map((invoice) => [invoice.orderId, invoice]));
    link.lastAccessAt = new Date();
    await this.dataSource.getRepository(VehiclePublicLink).save(link);
    const productIds = [...new Set(
      orders.flatMap((order) => order.productLines.map((line) => line.productId).filter(Boolean)),
    )] as string[];
    const products = productIds.length
      ? await this.dataSource.getRepository(Product).find({
        select: { id: true, productTypeId: true },
        where: { id: In(productIds) },
      })
      : [];
    const productTypeById = new Map(products.map((product) => [product.id, product.productTypeId]));
    const latestLineByProductType = new Map<string, (typeof orders)[number]['productLines'][number]>();
    for (const order of orders) {
      for (const line of order.productLines) {
        const description = String(line.snapshot.displayName ?? line.snapshot.description ?? '').trim().toLowerCase();
        const key = line.productId
          ? `type:${productTypeById.get(line.productId) ?? line.productId}`
          : `temporary:${description}`;
        if (!latestLineByProductType.has(key)) latestLineByProductType.set(key, line);
      }
    }
    const dueItems = [...latestLineByProductType.values()]
      .filter((line) => line.dueDate || line.dueOdometer);
    const nextByDate = dueItems.filter((line) => line.dueDate)
      .sort((a, b) => a.dueDate!.localeCompare(b.dueDate!))[0];
    const nextByOdometer = dueItems.filter((line) => line.dueOdometer !== null && line.dueOdometer !== undefined)
      .sort((a, b) => a.dueOdometer! - b.dueOdometer!)[0];
    return {
      shop: {
        name: shop.name,
        phone: shop.publicPhone,
        city: shop.city,
        address: shop.address,
      },
      vehicle: {
        brand: vehicle.brand.nameFa, model: vehicle.model.nameFa,
        plate: this.maskPlate(vehicle.plateDisplay) || 'بدون پلاک',
      },
      nextDue: nextByDate || nextByOdometer ? {
        dueDate: nextByDate?.dueDate,
        dueDateItem: nextByDate ? this.snapshotLabel(nextByDate.snapshot) : undefined,
        dueOdometer: nextByOdometer?.dueOdometer,
        dueOdometerItem: nextByOdometer ? this.snapshotLabel(nextByOdometer.snapshot) : undefined,
      } : null,
      services: orders.filter((order) => invoiceByOrderId.has(order.id)).map((order) => {
        const invoice = invoiceByOrderId.get(order.id)!;
        return {
          serviceDate: order.serviceDate,
          odometer: order.odometer,
          totalAmount: Number(invoice.totalAmount),
          currency: invoice.currency,
          products: order.productLines
            .map((line) => this.snapshotLabel(line.snapshot))
            .filter(Boolean),
          services: order.laborLines
            .map((line) => this.snapshotLabel(line.snapshot))
            .filter(Boolean),
        };
      }),
    };
  }

  async regenerate(shopId: string, actorId: string, vehicleId: string) {
    return this.dataSource.transaction(async (manager) => {
      if (!await manager.existsBy(Vehicle, { id: vehicleId, shopId })) throw new NotFoundException('خودرو یافت نشد.');
      const links = await manager.findBy(VehiclePublicLink, { vehicleId, shopId, status: PublicLinkStatus.ACTIVE });
      for (const link of links) {
        link.status = PublicLinkStatus.REVOKED;
        link.revokedAt = new Date();
      }
      await manager.save(links);
      const token = randomBytes(24).toString('base64url');
      const link = await manager.save(VehiclePublicLink, manager.create(VehiclePublicLink, {
        vehicleId, shopId, tokenHash: createHash('sha256').update(token).digest('hex'),
      }));
      await manager.save(AuditLog, manager.create(AuditLog, {
        actorId, shopId, action: 'public_link.regenerated',
        entityType: 'vehicle_public_link', entityId: link.id,
      }));
      return { token, path: `/public/v1/service-book/${token}` };
    });
  }

  async issueForSharing(shopId: string, actorId: string, vehicleId: string) {
    return this.dataSource.transaction(async (manager) => {
      if (!await manager.existsBy(Vehicle, { id: vehicleId, shopId })) throw new NotFoundException('خودرو یافت نشد.');
      const token = randomBytes(24).toString('base64url');
      const link = await manager.save(VehiclePublicLink, manager.create(VehiclePublicLink, {
        vehicleId, shopId, tokenHash: createHash('sha256').update(token).digest('hex'),
      }));
      await manager.save(AuditLog, manager.create(AuditLog, {
        actorId, shopId, action: 'public_link.issued_for_sharing',
        entityType: 'vehicle_public_link', entityId: link.id,
      }));
      return { token, path: `/public/v1/service-book/${token}` };
    });
  }

  async revoke(shopId: string, actorId: string, vehicleId: string) {
    const repo = this.dataSource.getRepository(VehiclePublicLink);
    const links = await repo.findBy({ vehicleId, shopId, status: PublicLinkStatus.ACTIVE });
    for (const link of links) {
      link.status = PublicLinkStatus.REVOKED;
      link.revokedAt = new Date();
    }
    await repo.save(links);
    await this.dataSource.getRepository(AuditLog).save({
      actorId, shopId, action: 'public_link.revoked',
      entityType: 'vehicle', entityId: vehicleId,
    });
    return { revoked: links.length };
  }

  private maskPlate(plate?: string) {
    if (!plate || plate.length < 4) return plate;
    return `${plate.slice(0, 2)}***${plate.slice(-2)}`;
  }

  private snapshotLabel(snapshot: Record<string, unknown>) {
    const label = snapshot.displayName ?? snapshot.name ?? snapshot.description;
    return typeof label === 'string' ? label.trim() : '';
  }
}
