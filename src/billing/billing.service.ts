import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invoice } from '../database/entities';

@Injectable()
export class BillingService {
  constructor(@InjectRepository(Invoice) private readonly invoices: Repository<Invoice>) {}

  list(shopId: string) {
    return this.invoices.find({
      where: { shopId },
      relations: {
        lines: true,
        order: { customer: true, vehicle: { brand: true, model: true } },
      },
      order: { issuedAt: 'DESC' },
      take: 50,
    });
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
