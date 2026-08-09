import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { Invoice } from '../database/entities';
import { normalizeDigits, normalizeMobile, normalizePlate } from '../common/normalizers';

@Injectable()
export class BillingService {
  constructor(@InjectRepository(Invoice) private readonly invoices: Repository<Invoice>) {}

  list(shopId: string, search?: string) {
    const query = this.invoices.createQueryBuilder('invoice')
      .leftJoinAndSelect('invoice.lines', 'line')
      .leftJoinAndSelect('invoice.order', 'order')
      .leftJoinAndSelect('order.customer', 'customer')
      .leftJoinAndSelect('order.vehicle', 'vehicle')
      .leftJoinAndSelect('vehicle.brand', 'brand')
      .leftJoinAndSelect('vehicle.model', 'model')
      .where('invoice.shopId = :shopId', { shopId });
    if (search?.trim()) {
      const value = search.trim();
      const normalizedDigits = normalizeDigits(value);
      const normalizedMobile = normalizeMobile(value);
      const normalizedPlate = normalizePlate(value);
      query.andWhere(new Brackets((where) => {
        where.where('invoice.invoiceNo ILIKE :invoiceSearch', { invoiceSearch: `%${normalizedDigits}%` })
          .orWhere('customer.name ILIKE :customerSearch', { customerSearch: `%${value}%` });
        if (normalizedMobile) {
          where.orWhere('customer.mobileNormalized LIKE :mobileSearch', { mobileSearch: `%${normalizedMobile}%` });
        }
        if (normalizedPlate) {
          where.orWhere('vehicle.plateNormalized ILIKE :plateSearch', { plateSearch: `%${normalizedPlate}%` });
        }
      }));
    }
    return query.orderBy('invoice.issuedAt', 'DESC').take(50).getMany();
  }

  async get(shopId: string, id: string) {
    const invoice = await this.invoices.findOne({
      where: { id, shopId },
      relations: {
        lines: true,
        order: {
          customer: true,
          vehicle: { brand: true, model: true },
          productLines: true,
        },
      },
    });
    if (!invoice) throw new NotFoundException('فاکتور یافت نشد.');
    return invoice;
  }
}
