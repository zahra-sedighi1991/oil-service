import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, ILike, Repository } from 'typeorm';
import { AuditLog, Customer, Vehicle, VehiclePublicLink } from '../database/entities';
import { PublicLinkStatus } from '../common/enums';
import { normalizeMobile, normalizePlate } from '../common/normalizers';
import { CreateCustomerDto, CreateVehicleDto, UpdateCustomerDto } from './dto';

@Injectable()
export class CrmService {
  constructor(
    @InjectRepository(Customer) private readonly customers: Repository<Customer>,
    @InjectRepository(Vehicle) private readonly vehicles: Repository<Vehicle>,
    private readonly dataSource: DataSource,
  ) {}

  listCustomers(shopId: string, mobile?: string, search?: string) {
    const qb = this.customers.createQueryBuilder('customer')
      .leftJoinAndSelect('customer.vehicles', 'vehicle')
      .leftJoinAndSelect('vehicle.brand', 'brand')
      .leftJoinAndSelect('vehicle.model', 'model')
      .where('customer.shopId = :shopId', { shopId });
    if (mobile) qb.andWhere('customer.mobileNormalized LIKE :mobile', { mobile: `%${normalizeMobile(mobile)}%` });
    if (search) qb.andWhere('customer.name ILIKE :search', { search: `%${search}%` });
    return qb.orderBy('customer.updatedAt', 'DESC').take(50).getMany();
  }

  async getCustomer(shopId: string, id: string) {
    const customer = await this.customers.findOne({
      where: { id, shopId },
      relations: { vehicles: { brand: true, model: true } },
    });
    if (!customer) throw new NotFoundException('مشتری یافت نشد.');
    return customer;
  }

  async createCustomer(shopId: string, dto: CreateCustomerDto) {
    const mobileNormalized = normalizeMobile(dto.mobile);
    if (!/^09\d{9}$/.test(mobileNormalized)) throw new BadRequestException('شماره موبایل را به‌صورت ۱۱ رقمی وارد کنید.');
    if (await this.customers.existsBy({ shopId, mobileNormalized })) {
      throw new ConflictException('این شماره موبایل قبلاً در این فروشگاه ثبت شده است.');
    }
    return this.customers.save(this.customers.create({
      ...dto, shopId, mobileDisplay: dto.mobile, mobileNormalized,
    }));
  }

  async updateCustomer(shopId: string, actorId: string, id: string, dto: UpdateCustomerDto) {
    const customer = await this.getCustomer(shopId, id);
    const before = {
      name: customer.name,
      mobileNormalized: customer.mobileNormalized,
      note: customer.note,
    };
    if (dto.mobile) {
      const mobile = normalizeMobile(dto.mobile);
      if (!/^09\d{9}$/.test(mobile)) throw new BadRequestException('شماره موبایل را به‌صورت ۱۱ رقمی وارد کنید.');
      const duplicate = await this.customers.findOneBy({ shopId, mobileNormalized: mobile });
      if (duplicate && duplicate.id !== id) {
        throw new ConflictException('این شماره موبایل قبلاً در این فروشگاه ثبت شده است.');
      }
      customer.mobileNormalized = mobile;
      customer.mobileDisplay = dto.mobile;
    }
    Object.assign(customer, { name: dto.name ?? customer.name, note: dto.note ?? customer.note });
    const result = await this.customers.save(customer);
    await this.dataSource.getRepository(AuditLog).save({
      actorId,
      shopId,
      action: 'customer.updated',
      entityType: 'customer',
      entityId: customer.id,
      before,
      after: {
        name: customer.name,
        mobileNormalized: customer.mobileNormalized,
        note: customer.note,
      },
    });
    return result;
  }

  listVehicles(shopId: string, plate?: string) {
    return this.vehicles.find({
      where: {
        shopId,
        ...(plate ? { plateNormalized: ILike(`%${normalizePlate(plate)}%`) } : {}),
      },
      relations: { owner: true, brand: true, model: true },
      take: 50,
      order: { updatedAt: 'DESC' },
    });
  }

  async createVehicle(shopId: string, dto: CreateVehicleDto) {
    if (!dto.plate && !dto.temporaryIdentifier) {
      throw new BadRequestException('پلاک یا شناسه موقت خودرو الزامی است.');
    }
    if (!await this.customers.existsBy({ id: dto.ownerCustomerId, shopId })) {
      throw new NotFoundException('مالک خودرو در این فروشگاه یافت نشد.');
    }
    const plateNormalized = dto.plate ? normalizePlate(dto.plate) : undefined;
    if (plateNormalized && await this.vehicles.existsBy({ shopId, plateNormalized })) {
      throw new ConflictException('این خودرو قبلاً در این فروشگاه ثبت شده است؛ سابقه آن را باز کنید.');
    }
    return this.vehicles.save(this.vehicles.create({
      ...dto,
      shopId,
      plateDisplay: dto.plate,
      plateNormalized,
    }));
  }

  async transferOwnership(shopId: string, actorId: string, vehicleId: string, ownerCustomerId: string) {
    return this.dataSource.transaction(async (manager) => {
      const [vehicle, owner] = await Promise.all([
        manager.findOneBy(Vehicle, { id: vehicleId, shopId }),
        manager.findOneBy(Customer, { id: ownerCustomerId, shopId }),
      ]);
      if (!vehicle || !owner) throw new NotFoundException('خودرو یا مالک جدید در این فروشگاه یافت نشد.');
      const previousOwnerId = vehicle.ownerCustomerId;
      vehicle.ownerCustomerId = owner.id;
      await manager.save(vehicle);
      await manager.update(VehiclePublicLink, {
        shopId, vehicleId, status: PublicLinkStatus.ACTIVE,
      }, { status: PublicLinkStatus.REVOKED, revokedAt: new Date() });
      await manager.save(AuditLog, manager.create(AuditLog, {
        actorId,
        shopId,
        action: 'vehicle.owner_transferred',
        entityType: 'vehicle',
        entityId: vehicle.id,
        before: { ownerCustomerId: previousOwnerId },
        after: { ownerCustomerId: owner.id, publicLinksRevoked: true },
      }));
      return vehicle;
    });
  }
}
