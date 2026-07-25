import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import {
  Product,
  ProductManufacturer,
  AuditLog,
  ProductAttributeDefinition,
  ProductAttributeOption,
  ProductType,
  ServiceCatalog,
  ShopProduct,
  ShopService,
  VehicleBrand,
  VehicleModel,
} from '../database/entities';
import {
  ConfigureShopProductDto,
  ConfigureShopServiceDto,
  CreateAttributeDto,
  CreateAttributeOptionDto,
  CreateProductDto,
  CreateManufacturerDto,
  CreateProductTypeDto,
  CreateServiceCatalogDto,
  CreateVehicleBrandDto,
  CreateVehicleModelDto,
} from './dto';
import { RecordStatus } from '../common/enums';

@Injectable()
export class CatalogService {
  constructor(
    @InjectRepository(VehicleBrand) private readonly brands: Repository<VehicleBrand>,
    @InjectRepository(VehicleModel) private readonly models: Repository<VehicleModel>,
    @InjectRepository(ProductType) private readonly types: Repository<ProductType>,
    @InjectRepository(ProductAttributeDefinition) private readonly attributes: Repository<ProductAttributeDefinition>,
    @InjectRepository(ProductAttributeOption) private readonly attributeOptions: Repository<ProductAttributeOption>,
    @InjectRepository(Product) private readonly products: Repository<Product>,
    @InjectRepository(ProductManufacturer) private readonly manufacturers: Repository<ProductManufacturer>,
    @InjectRepository(ShopProduct) private readonly shopProducts: Repository<ShopProduct>,
    @InjectRepository(ServiceCatalog) private readonly services: Repository<ServiceCatalog>,
    @InjectRepository(ShopService) private readonly shopServices: Repository<ShopService>,
    @InjectRepository(AuditLog) private readonly audits: Repository<AuditLog>,
  ) {}

  listBrands(search?: string) {
    return this.brands.find({
      where: { status: RecordStatus.ACTIVE, ...(search ? { nameFa: ILike(`%${search}%`) } : {}) },
      order: { nameFa: 'ASC' },
    });
  }
  createBrand(dto: CreateVehicleBrandDto) { return this.brands.save(this.brands.create(dto)); }
  listModels(brandId?: string) {
    return this.models.find({ where: { status: RecordStatus.ACTIVE, ...(brandId ? { brandId } : {}) }, order: { nameFa: 'ASC' } });
  }
  createModel(dto: CreateVehicleModelDto) { return this.models.save(this.models.create(dto)); }
  createType(dto: CreateProductTypeDto) { return this.types.save(this.types.create(dto)); }
  listTypes() { return this.types.find({ where: { status: RecordStatus.ACTIVE }, order: { title: 'ASC' } }); }
  createManufacturer(dto: CreateManufacturerDto) {
    return this.manufacturers.save(this.manufacturers.create(dto));
  }
  listManufacturers() {
    return this.manufacturers.find({
      where: { status: RecordStatus.ACTIVE },
      order: { name: 'ASC' },
    });
  }

  async setStatus(
    entity: 'vehicle-brand' | 'vehicle-model' | 'product-type' | 'product' | 'service',
    id: string,
    status: RecordStatus,
  ) {
    const repositoryMap = {
      'vehicle-brand': this.brands,
      'vehicle-model': this.models,
      'product-type': this.types,
      product: this.products,
      service: this.services,
    };
    const repository = repositoryMap[entity] as unknown as Repository<{ id: string; status: RecordStatus }>;
    if (!repository) throw new BadRequestException('نوع موجودیت قابل مدیریت نیست.');
    const record = await repository.findOneBy({ id });
    if (!record) throw new NotFoundException('رکورد کاتالوگ یافت نشد.');
    record.status = status;
    return repository.save(record);
  }

  async addAttribute(productTypeId: string, dto: CreateAttributeDto) {
    const type = await this.types.findOneBy({ id: productTypeId });
    if (!type) throw new NotFoundException('نوع محصول یافت نشد.');
    if (!['text','integer','decimal','boolean','single_select','multi_select','reference','quantity_unit','date'].includes(dto.dataType)) {
      throw new BadRequestException('نوع داده ویژگی پشتیبانی نمی‌شود.');
    }
    const regex = (dto.config as { regex?: string } | undefined)?.regex;
    if (regex) {
      try {
        new RegExp(regex);
      } catch {
        throw new BadRequestException('عبارت منظم اعتبارسنجی معتبر نیست.');
      }
    }
    return this.attributes.save(this.attributes.create({ ...dto, productTypeId }));
  }

  async publishSchema(productTypeId: string, schemaVersion: number) {
    if (!Number.isInteger(schemaVersion) || schemaVersion < 1) {
      throw new BadRequestException('نسخه اسکیما معتبر نیست.');
    }
    const type = await this.types.findOneBy({ id: productTypeId });
    if (!type) throw new NotFoundException('نوع محصول یافت نشد.');
    if (!await this.attributes.existsBy({ productTypeId, schemaVersion, status: RecordStatus.ACTIVE })) {
      throw new BadRequestException('نسخه اسکیما بدون فیلد قابل انتشار نیست.');
    }
    type.currentSchemaVersion = schemaVersion;
    return this.types.save(type);
  }

  async getSchema(productTypeId: string, version?: number) {
    const type = await this.types.findOneBy({ id: productTypeId });
    if (!type) throw new NotFoundException('نوع محصول یافت نشد.');
    const schemaVersion = version ?? type.currentSchemaVersion;
    if (!Number.isInteger(schemaVersion) || schemaVersion < 1) {
      throw new BadRequestException('نسخه اسکیما معتبر نیست.');
    }
    const definitions = await this.attributes.find({
      where: { productTypeId, schemaVersion, status: RecordStatus.ACTIVE },
      order: { sortOrder: 'ASC' },
    });
    const options = definitions.length
      ? await this.attributeOptions.createQueryBuilder('option')
        .where('option.attributeDefinitionId IN (:...ids)', { ids: definitions.map((item) => item.id) })
        .andWhere('option.status = :status', { status: RecordStatus.ACTIVE })
        .orderBy('option.sortOrder', 'ASC')
        .getMany()
      : [];
    return {
      productTypeId,
      schemaVersion,
      fields: definitions.map((definition) => ({
        ...definition,
        options: options.filter((option) => option.attributeDefinitionId === definition.id),
      })),
    };
  }

  async addAttributeOption(attributeDefinitionId: string, dto: CreateAttributeOptionDto) {
    if (!await this.attributes.existsBy({ id: attributeDefinitionId })) {
      throw new NotFoundException('تعریف ویژگی یافت نشد.');
    }
    return this.attributeOptions.save(this.attributeOptions.create({
      ...dto,
      attributeDefinitionId,
    }));
  }

  async createProduct(dto: CreateProductDto) {
    const type = await this.types.findOneBy({ id: dto.productTypeId });
    if (!type) throw new NotFoundException('نوع محصول یافت نشد.');
    const definitions = await this.attributes.findBy({
      productTypeId: type.id,
      schemaVersion: type.currentSchemaVersion,
      status: RecordStatus.ACTIVE,
    });
    await this.validateAttributes(dto.attributes, definitions);
    const displayName = this.renderTitle(type, dto.name, dto.attributes, definitions);
    return this.products.save(this.products.create({
      ...dto,
      displayName,
      schemaVersion: type.currentSchemaVersion,
    }));
  }

  async listProducts(shopId: string, search?: string, productTypeId?: string, attributesJson?: string) {
    const qb = this.products.createQueryBuilder('product')
      .leftJoinAndMapOne(
        'product.shopConfiguration',
        ShopProduct,
        'shopConfiguration',
        'shopConfiguration.productId = product.id AND shopConfiguration.shopId = :shopId',
        { shopId },
      )
      .where('product.status = :status', { status: RecordStatus.ACTIVE });
    if (search) qb.andWhere('product.displayName ILIKE :search', { search: `%${search}%` });
    if (productTypeId) qb.andWhere('product.productTypeId = :productTypeId', { productTypeId });
    if (attributesJson) {
      let attributes: unknown;
      try {
        attributes = JSON.parse(attributesJson);
      } catch {
        throw new BadRequestException('فیلتر ویژگی‌ها JSON معتبر نیست.');
      }
      if (!attributes || Array.isArray(attributes) || typeof attributes !== 'object') {
        throw new BadRequestException('فیلتر ویژگی‌ها باید یک شیء JSON باشد.');
      }
      qb.andWhere('product.attributes @> CAST(:attributes AS jsonb)', {
        attributes: JSON.stringify(attributes),
      });
    }
    return qb.orderBy('shopConfiguration.favorite', 'DESC', 'NULLS LAST')
      .addOrderBy('shopConfiguration.sortOrder', 'ASC', 'NULLS LAST')
      .addOrderBy('product.displayName', 'ASC')
      .take(50)
      .getMany();
  }

  async configureProduct(shopId: string, actorId: string, productId: string, dto: ConfigureShopProductDto) {
    if (!await this.products.existsBy({ id: productId })) throw new NotFoundException('محصول یافت نشد.');
    const existingSetting = await this.shopProducts.findOneBy({ shopId, productId });
    const before = existingSetting ? { ...existingSetting } : undefined;
    const setting = existingSetting ?? this.shopProducts.create({ shopId, productId });
    if (dto.salePrice !== undefined) setting.salePrice = String(dto.salePrice);
    if (dto.isActive !== undefined) setting.isActive = dto.isActive;
    if (dto.favorite !== undefined) setting.favorite = dto.favorite;
    if (dto.sortOrder !== undefined) setting.sortOrder = dto.sortOrder;
    if (dto.override !== undefined) setting.override = dto.override;
    const result = await this.shopProducts.save(setting);
    await this.audits.save(this.audits.create({
      actorId, shopId, action: 'shop_product.configured',
      entityType: 'shop_product', entityId: result.id, before, after: { ...dto },
    }));
    return result;
  }
  createService(dto: CreateServiceCatalogDto) { return this.services.save(this.services.create(dto)); }
  listServices(shopId?: string) {
    if (!shopId) {
      return this.services.find({
        where: { status: RecordStatus.ACTIVE },
        order: { name: 'ASC' },
      });
    }
    return this.services.createQueryBuilder('service')
      .leftJoinAndMapOne(
        'service.shopConfiguration',
        ShopService,
        'shopConfiguration',
        'shopConfiguration.serviceId = service.id AND shopConfiguration.shopId = :shopId',
        { shopId },
      )
      .where('service.status = :status', { status: RecordStatus.ACTIVE })
      .orderBy('shopConfiguration.favorite', 'DESC', 'NULLS LAST')
      .addOrderBy('shopConfiguration.sortOrder', 'ASC', 'NULLS LAST')
      .addOrderBy('service.name', 'ASC')
      .getMany();
  }
  async configureService(shopId: string, actorId: string, serviceId: string, dto: ConfigureShopServiceDto) {
    if (!await this.services.existsBy({ id: serviceId })) throw new NotFoundException('خدمت یافت نشد.');
    const existingSetting = await this.shopServices.findOneBy({ shopId, serviceId });
    const before = existingSetting ? { ...existingSetting } : undefined;
    const setting = existingSetting ?? this.shopServices.create({ shopId, serviceId });
    if (dto.fee !== undefined) setting.fee = String(dto.fee);
    if (dto.isActive !== undefined) setting.isActive = dto.isActive;
    if (dto.favorite !== undefined) setting.favorite = dto.favorite;
    if (dto.sortOrder !== undefined) setting.sortOrder = dto.sortOrder;
    const result = await this.shopServices.save(setting);
    await this.audits.save(this.audits.create({
      actorId, shopId, action: 'shop_service.configured',
      entityType: 'shop_service', entityId: result.id, before, after: { ...dto },
    }));
    return result;
  }

  private async validateAttributes(values: Record<string, unknown>, definitions: ProductAttributeDefinition[]) {
    const allowed = new Set(definitions.map((item) => item.key));
    const optionRows = definitions.length
      ? await this.attributeOptions.createQueryBuilder('option')
        .where('option.attributeDefinitionId IN (:...ids)', { ids: definitions.map((item) => item.id) })
        .andWhere('option.status = :status', { status: RecordStatus.ACTIVE })
        .getMany()
      : [];
    for (const key of Object.keys(values)) {
      if (!allowed.has(key)) throw new BadRequestException(`ویژگی ${key} در نسخه فعلی اسکیما تعریف نشده است.`);
    }
    for (const definition of definitions) {
      const value = values[definition.key];
      if (definition.required && (value === undefined || value === null || value === '')) {
        throw new BadRequestException(`ویژگی «${definition.labelFa}» الزامی است.`);
      }
      if (value === undefined || value === null) continue;
      const config = definition.config as {
        min?: number;
        max?: number;
        minLength?: number;
        maxLength?: number;
        regex?: string;
        options?: unknown[];
        units?: string[];
      };
      const configuredOptions = optionRows
        .filter((option) => option.attributeDefinitionId === definition.id)
        .map((option) => option.value);
      const validOptions = configuredOptions.length ? configuredOptions : config.options;
      if (['integer', 'decimal'].includes(definition.dataType)) {
        if (typeof value !== 'number' || (definition.dataType === 'integer' && !Number.isInteger(value))) {
          throw new BadRequestException(`مقدار «${definition.labelFa}» عدد معتبر نیست.`);
        }
        if (config.min !== undefined && value < config.min) throw new BadRequestException(`مقدار «${definition.labelFa}» کمتر از حد مجاز است.`);
        if (config.max !== undefined && value > config.max) throw new BadRequestException(`مقدار «${definition.labelFa}» بیشتر از حد مجاز است.`);
      }
      if (definition.dataType === 'boolean' && typeof value !== 'boolean') {
        throw new BadRequestException(`مقدار «${definition.labelFa}» باید بله/خیر باشد.`);
      }
      if (['text', 'date', 'reference'].includes(definition.dataType) && typeof value !== 'string') {
        throw new BadRequestException(`مقدار «${definition.labelFa}» باید متن باشد.`);
      }
      if (typeof value === 'string') {
        if (config.minLength !== undefined && value.length < config.minLength) {
          throw new BadRequestException(`مقدار «${definition.labelFa}» کوتاه‌تر از حد مجاز است.`);
        }
        if (config.maxLength !== undefined && value.length > config.maxLength) {
          throw new BadRequestException(`مقدار «${definition.labelFa}» بلندتر از حد مجاز است.`);
        }
        if (config.regex && !new RegExp(config.regex).test(value)) {
          throw new BadRequestException(`قالب مقدار «${definition.labelFa}» معتبر نیست.`);
        }
      }
      if (definition.dataType === 'single_select' && validOptions && !validOptions.includes(value)) {
        throw new BadRequestException(`گزینه «${definition.labelFa}» مجاز نیست.`);
      }
      if (definition.dataType === 'multi_select') {
        if (!Array.isArray(value) || (validOptions && value.some((item) => !validOptions.includes(item)))) {
          throw new BadRequestException(`گزینه‌های «${definition.labelFa}» مجاز نیستند.`);
        }
      }
      if (definition.dataType === 'quantity_unit') {
        const quantity = value as { value?: unknown; unit?: unknown };
        if (
          typeof quantity !== 'object'
          || quantity === null
          || typeof quantity.value !== 'number'
          || typeof quantity.unit !== 'string'
          || (config.units && !config.units.includes(quantity.unit))
        ) {
          throw new BadRequestException(`مقدار «${definition.labelFa}» باید شامل عدد و واحد باشد.`);
        }
      }
    }
  }

  private renderTitle(type: ProductType, name: string | undefined, values: Record<string, unknown>, definitions: ProductAttributeDefinition[]) {
    if (name) return name;
    let title = type.titleTemplate ?? [type.title, ...definitions.filter((x) => x.showInTitle).map((x) => `{${x.key}}`)].join(' ');
    for (const [key, value] of Object.entries(values)) title = title.replaceAll(`{${key}}`, String(value));
    return title.replace(/\{[^}]+\}/g, '').replace(/\s+/g, ' ').trim();
  }
}
