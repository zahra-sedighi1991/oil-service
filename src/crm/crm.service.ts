import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import ExcelJS from 'exceljs';
import { DataSource, ILike, Repository } from 'typeorm';
import { AuditLog, Customer, Vehicle, VehicleModel, VehiclePublicLink } from '../database/entities';
import { PublicLinkStatus, RecordStatus } from '../common/enums';
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

  async exportCustomers(shopId: string) {
    const customers = await this.customers.find({
      where: { shopId },
      relations: { vehicles: { brand: true, model: true } },
      order: { createdAt: 'DESC' },
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'RoghanYar';
    workbook.created = new Date();
    const worksheet = workbook.addWorksheet('مشتریان', {
      views: [{ rightToLeft: true, state: 'frozen', ySplit: 1 }],
      properties: { defaultRowHeight: 22 },
    });

    worksheet.columns = [
      { header: 'ردیف', key: 'index', width: 8 },
      { header: 'نام و نام خانوادگی', key: 'name', width: 24 },
      { header: 'شماره موبایل', key: 'mobile', width: 18 },
      { header: 'جنسیت', key: 'gender', width: 11 },
      { header: 'تعداد خودرو', key: 'vehicleCount', width: 13 },
      { header: 'خودروها', key: 'vehicles', width: 34 },
      { header: 'پلاک یا شناسه خودرو', key: 'plates', width: 27 },
      { header: 'آخرین کیلومتر ثبت‌شده', key: 'odometers', width: 24 },
      { header: 'یادداشت', key: 'note', width: 36 },
      { header: 'تاریخ ثبت', key: 'createdAt', width: 16 },
    ];

    customers.forEach((customer, index) => {
      const vehicles = customer.vehicles ?? [];
      worksheet.addRow({
        index: index + 1,
        name: customer.name === 'مشتری بدون نام' ? 'بدون نام' : customer.name,
        mobile: customer.mobileNormalized,
        gender: customer.gender === 'female' ? 'خانم' : 'آقا',
        vehicleCount: vehicles.length,
        vehicles: vehicles.map((vehicle) => [
          vehicle.brand?.nameFa,
          vehicle.model?.nameFa,
          vehicle.year,
        ].filter(Boolean).join(' ')).filter(Boolean).join('، '),
        plates: vehicles.map((vehicle) => vehicle.plateDisplay || vehicle.temporaryIdentifier).filter(Boolean).join('، '),
        odometers: vehicles.map((vehicle) => vehicle.lastOdometer?.toLocaleString('fa-IR')).filter(Boolean).join('، '),
        note: customer.note ?? '',
        createdAt: customer.createdAt,
      });
    });

    const header = worksheet.getRow(1);
    header.height = 28;
    header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF176B4D' } };
    header.alignment = { horizontal: 'center', vertical: 'middle' };
    worksheet.autoFilter = { from: 'A1', to: 'J1' };
    worksheet.getColumn('mobile').numFmt = '@';
    worksheet.getColumn('createdAt').numFmt = 'yyyy/mm/dd';

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      row.alignment = { horizontal: 'right', vertical: 'middle', wrapText: true };
      if (rowNumber % 2 === 0) {
        row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F8F5' } };
      }
    });

    return Buffer.from(await workbook.xlsx.writeBuffer());
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
      shopId,
      name: dto.name?.trim() || 'مشتری بدون نام',
      gender: dto.gender ?? 'male',
      mobileDisplay: dto.mobile,
      mobileNormalized,
      note: dto.note,
    }));
  }

  async updateCustomer(shopId: string, actorId: string, id: string, dto: UpdateCustomerDto) {
    const customer = await this.getCustomer(shopId, id);
    const before = {
      name: customer.name,
      gender: customer.gender,
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
    Object.assign(customer, {
      name: dto.name !== undefined ? (dto.name.trim() || 'مشتری بدون نام') : customer.name,
      gender: dto.gender ?? customer.gender,
      note: dto.note ?? customer.note,
    });
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
        gender: customer.gender,
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
    if (!await this.customers.existsBy({ id: dto.ownerCustomerId, shopId })) {
      throw new NotFoundException('مالک خودرو در این فروشگاه یافت نشد.');
    }
    const model = await this.dataSource.getRepository(VehicleModel).findOneBy({
      id: dto.modelId,
      status: RecordStatus.ACTIVE,
    });
    if (!model) throw new NotFoundException('مدل خودرو یافت نشد.');
    const plateNormalized = dto.plate?.trim() ? normalizePlate(dto.plate) : undefined;
    if (plateNormalized && !/^\d{2}(?:الف|[آ-ی])\d{3}ایران\d{2}$/.test(plateNormalized)) {
      throw new BadRequestException('پلاک خودرو را کامل و با قالب صحیح وارد کنید.');
    }
    if (plateNormalized && await this.vehicles.existsBy({ shopId, plateNormalized })) {
      throw new ConflictException('این خودرو قبلاً در این فروشگاه ثبت شده است؛ سابقه آن را باز کنید.');
    }
    return this.vehicles.save(this.vehicles.create({
      ownerCustomerId: dto.ownerCustomerId,
      modelId: model.id,
      brandId: model.brandId,
      shopId,
      plateDisplay: dto.plate?.trim() || undefined,
      plateNormalized,
      lastOdometer: dto.lastOdometer,
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
