import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { access, mkdir, rename, rm, writeFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import { ILike, In, Repository } from 'typeorm';
import {
  Product,
  AuditLog,
  ProductAttributeDefinition,
  ProductAttributeOption,
  ProductType,
  ServiceCatalog,
  ShopProduct,
  ShopService,
  VehicleBrand,
  Vehicle,
  VehicleModel,
  ProductVehicleCompatibility,
} from '../database/entities';
import {
  ConfigureShopProductDto,
  ConfigureShopServiceDto,
  CreateAttributeDto,
  CreateAttributeOptionDto,
  CreateProductDto,
  CreateProductTypeDto,
  CreateServiceCatalogDto,
  CreateVehicleBrandDto,
  CreateVehicleModelDto,
  UpdateProductDto,
} from './dto';
import { RecordStatus } from '../common/enums';

@Injectable()
export class CatalogService {
  private readonly productImageDirectory = resolve(
    process.env.PRODUCT_IMAGE_DIR ?? join(process.cwd(), 'uploads/products'),
  );

  constructor(
    @InjectRepository(VehicleBrand) private readonly brands: Repository<VehicleBrand>,
    @InjectRepository(VehicleModel) private readonly models: Repository<VehicleModel>,
    @InjectRepository(Vehicle) private readonly vehicles: Repository<Vehicle>,
    @InjectRepository(ProductType) private readonly types: Repository<ProductType>,
    @InjectRepository(ProductAttributeDefinition) private readonly attributes: Repository<ProductAttributeDefinition>,
    @InjectRepository(ProductAttributeOption) private readonly attributeOptions: Repository<ProductAttributeOption>,
    @InjectRepository(Product) private readonly products: Repository<Product>,
    @InjectRepository(ProductVehicleCompatibility) private readonly compatibilities: Repository<ProductVehicleCompatibility>,
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
    return this.models.find({
      where: { status: RecordStatus.ACTIVE, ...(brandId ? { brandId } : {}) },
      relations: { brand: true },
      order: { nameFa: 'ASC' },
    });
  }
  createModel(dto: CreateVehicleModelDto) { return this.models.save(this.models.create(dto)); }
  async setModelPopularity(id: string, isPopular: boolean) {
    const model = await this.models.findOneBy({ id });
    if (!model) throw new NotFoundException('مدل خودرو یافت نشد.');
    model.isPopular = isPopular;
    return this.models.save(model);
  }
  createType(dto: CreateProductTypeDto) { return this.types.save(this.types.create(dto)); }
  listTypes() { return this.types.find({ where: { status: RecordStatus.ACTIVE }, order: { title: 'ASC' } }); }

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
    const product = await this.products.save(this.products.create({
      productTypeId: dto.productTypeId,
      name: dto.name,
      attributes: dto.attributes,
      displayName,
      schemaVersion: type.currentSchemaVersion,
    }));
    if (dto.vehicleModelIds?.length) await this.setProductVehicleModels(product.id, dto.vehicleModelIds);
    return this.presentProduct(product);
  }

  async updateProduct(id: string, dto: UpdateProductDto) {
    const [product, type] = await Promise.all([
      this.products.findOneBy({ id, status: RecordStatus.ACTIVE }),
      this.types.findOneBy({ id: dto.productTypeId, status: RecordStatus.ACTIVE }),
    ]);
    if (!product) throw new NotFoundException('محصول یافت نشد.');
    if (!type) throw new NotFoundException('نوع محصول یافت نشد.');
    const definitions = await this.attributes.findBy({
      productTypeId: type.id,
      schemaVersion: type.currentSchemaVersion,
      status: RecordStatus.ACTIVE,
    });
    await this.validateAttributes(dto.attributes, definitions);
    product.productTypeId = type.id;
    product.name = dto.name.trim();
    product.attributes = dto.attributes;
    product.schemaVersion = type.currentSchemaVersion;
    product.displayName = this.renderTitle(type, product.name, dto.attributes, definitions);
    const result = await this.products.save(product);
    await this.setProductVehicleModels(result.id, dto.vehicleModelIds);
    return this.presentProduct(result);
  }

  async createSuggestedProduct(name: string, details?: {
    productTypeId?: string;
    attributes?: Record<string, unknown>;
    vehicleModelIds?: string[];
  }) {
    if (details?.productTypeId) {
      return this.createProduct({
        productTypeId: details.productTypeId,
        name,
        attributes: details.attributes ?? {},
        vehicleModelIds: details.vehicleModelIds ?? [],
      });
    }
    const key = 'uncategorized';
    let type = await this.types.findOneBy({ key });
    if (!type) {
      await this.types.upsert({
        key,
        title: 'سایر محصولات',
        currentSchemaVersion: 1,
        status: RecordStatus.ACTIVE,
      }, ['key']);
      type = await this.types.findOneBy({ key });
    }
    if (!type) throw new BadRequestException('امکان ایجاد دسته پیش‌فرض محصولات وجود ندارد.');
    return this.createProduct({ productTypeId: type.id, name, attributes: {} });
  }

  async listProducts(
    shopId?: string,
    search?: string,
    productTypeId?: string,
    attributesJson?: string,
    activeOnly = false,
    vehicleId?: string,
  ) {
    const qb = this.products.createQueryBuilder('product')
      .leftJoinAndSelect('product.productType', 'productType');
    if (shopId) {
      qb.leftJoinAndMapOne(
        'product.shopConfiguration',
        ShopProduct,
        'shopConfiguration',
        'shopConfiguration.productId = product.id AND shopConfiguration.shopId = :shopId',
        { shopId },
      );
    }
    qb.where('product.status = :status', { status: RecordStatus.ACTIVE });
    if (shopId && activeOnly) qb.andWhere('shopConfiguration.isActive = true');
    if (search) {
      const searchValue = `%${search}%`;
      qb.andWhere(`(
        product.displayName ILIKE :search
        OR CAST(product.attributes AS text) ILIKE :search
      )`, { search: searchValue });
    }
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
    if (shopId) {
      qb.orderBy('shopConfiguration.favorite', 'DESC', 'NULLS LAST')
        .addOrderBy('shopConfiguration.sortOrder', 'ASC', 'NULLS LAST');
    }
    const rows = await qb.addOrderBy('product.displayName', 'ASC').take(100).getMany();
    if (!vehicleId || !shopId || !rows.length) return rows.map((product) => this.presentProduct(product));

    const vehicle = await this.vehicles.findOneBy({ id: vehicleId, shopId });
    if (!vehicle) throw new NotFoundException('خودرو در این فروشگاه یافت نشد.');
    const rules = await this.compatibilities.find({
      where: { productId: In(rows.map((row) => row.id)) },
    });
    const priority = { compatible: 0, universal: 1, incompatible: 2 } as const;
    return rows.map((product) => {
      const productRules = rules.filter((rule) => rule.productId === product.id);
      const modelRules = productRules.filter((rule) => rule.vehicleModelId === vehicle.modelId);
      const rule = modelRules[0];
      const status = rule ? 'compatible' : productRules.length ? 'incompatible' : 'universal';
      return {
        ...this.presentProduct(product),
        compatibility: {
          status,
          matchLevel: rule ? 'model' : undefined,
        },
      };
    }).sort((a, b) => priority[a.compatibility.status] - priority[b.compatibility.status]);
  }

  async setProductImage(productId: string, file?: { buffer?: Buffer; size?: number }) {
    const product = await this.products.findOneBy({ id: productId });
    if (!product) throw new NotFoundException('محصول یافت نشد.');
    if (!file?.buffer?.length || !file.size) throw new BadRequestException('فایل تصویر ارسال نشده است.');
    if (file.size > 3 * 1024 * 1024) throw new BadRequestException('حجم تصویر نباید بیشتر از ۳ مگابایت باشد.');

    const extension = this.detectImageExtension(file.buffer);
    if (!extension) throw new BadRequestException('فقط تصویر JPEG، PNG یا WebP قابل استفاده است.');

    await mkdir(this.productImageDirectory, { recursive: true });
    const fileName = `${product.id}-${Date.now()}.${extension}`;
    const temporaryPath = join(this.productImageDirectory, `${fileName}.tmp`);
    const finalPath = join(this.productImageDirectory, fileName);
    const previousFileName = product.imageFileName;
    let movedToFinalPath = false;
    let saved: Product;
    try {
      await writeFile(temporaryPath, file.buffer, { flag: 'wx' });
      await rename(temporaryPath, finalPath);
      movedToFinalPath = true;
      product.imageFileName = fileName;
      saved = await this.products.save(product);
    } catch (error) {
      await rm(temporaryPath, { force: true });
      if (movedToFinalPath) await rm(finalPath, { force: true });
      throw error;
    }
    if (previousFileName) await this.removeStoredProductImage(previousFileName).catch(() => undefined);
    return this.presentProduct(saved);
  }

  async removeProductImage(productId: string) {
    const product = await this.products.findOneBy({ id: productId });
    if (!product) throw new NotFoundException('محصول یافت نشد.');
    const previousFileName = product.imageFileName;
    product.imageFileName = undefined;
    const saved = await this.products.save(product);
    if (previousFileName) await this.removeStoredProductImage(previousFileName).catch(() => undefined);
    return this.presentProduct(saved);
  }

  async getProductImage(productId: string) {
    const product = await this.products.findOneBy({ id: productId, status: RecordStatus.ACTIVE });
    if (!product?.imageFileName) throw new NotFoundException('تصویر محصول یافت نشد.');
    const fileName = basename(product.imageFileName);
    if (fileName !== product.imageFileName) throw new NotFoundException('تصویر محصول یافت نشد.');
    const filePath = join(this.productImageDirectory, fileName);
    try {
      await access(filePath);
    } catch {
      throw new NotFoundException('تصویر محصول یافت نشد.');
    }
    return {
      filePath,
      contentType: fileName.endsWith('.png')
        ? 'image/png'
        : fileName.endsWith('.webp') ? 'image/webp' : 'image/jpeg',
    };
  }

  listCompatibilities(productId?: string, modelId?: string) {
    return this.compatibilities.find({
      where: {
        ...(productId ? { productId } : {}),
        ...(modelId ? { vehicleModelId: modelId } : {}),
      },
      relations: { product: true, vehicleModel: { brand: true } },
      order: { createdAt: 'DESC' },
    });
  }

  async setProductVehicleModels(productId: string, vehicleModelIds: string[]) {
    if (!await this.products.existsBy({ id: productId, status: RecordStatus.ACTIVE })) {
      throw new NotFoundException('محصول یافت نشد.');
    }
    const ids = [...new Set(vehicleModelIds.filter(Boolean))];
    if (ids.length) {
      const count = await this.models.countBy({ id: In(ids), status: RecordStatus.ACTIVE });
      if (count !== ids.length) throw new BadRequestException('یکی از مدل‌های خودرو معتبر نیست.');
    }
    await this.compatibilities.delete({ productId });
    if (ids.length) {
      await this.compatibilities.save(ids.map((vehicleModelId) => this.compatibilities.create({
        productId,
        vehicleModelId,
      })));
    }
    return { productId, vehicleModelIds: ids, appliesToAllVehicles: ids.length === 0 };
  }

  async configureProduct(shopId: string, actorId: string, productId: string, dto: ConfigureShopProductDto) {
    if (!await this.products.existsBy({ id: productId })) throw new NotFoundException('محصول یافت نشد.');
    const existingSetting = await this.shopProducts.findOneBy({ shopId, productId });
    const before = existingSetting ? { ...existingSetting } : undefined;
    const setting = existingSetting ?? this.shopProducts.create({ shopId, productId });
    if (dto.salePrice !== undefined) setting.salePrice = String(dto.salePrice);
    const override = { ...(setting.override ?? {}), ...(dto.override ?? {}) };
    if (dto.defaultIntervalKm !== undefined) override.intervalKm = dto.defaultIntervalKm;
    setting.override = override;
    if (dto.isActive !== undefined) setting.isActive = dto.isActive;
    if (dto.favorite !== undefined) setting.favorite = dto.favorite;
    if (dto.sortOrder !== undefined) setting.sortOrder = dto.sortOrder;
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

  private presentProduct(product: Product) {
    const { imageFileName, ...result } = product;
    const updatedAt = product.updatedAt instanceof Date
      ? product.updatedAt.getTime()
      : new Date(product.updatedAt).getTime();
    return {
      ...result,
      imageUrl: imageFileName
        ? `/catalog/products/${product.id}/image?v=${updatedAt}`
        : undefined,
    };
  }

  private detectImageExtension(buffer: Buffer): 'jpg' | 'png' | 'webp' | null {
    if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpg';
    if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
    if (buffer.length >= 12 && buffer.subarray(0, 4).toString('ascii') === 'RIFF'
      && buffer.subarray(8, 12).toString('ascii') === 'WEBP') return 'webp';
    return null;
  }

  private async removeStoredProductImage(fileName: string) {
    const safeFileName = basename(fileName);
    if (safeFileName !== fileName) return;
    await rm(join(this.productImageDirectory, safeFileName), { force: true });
  }

  private async validateAttributes(values: Record<string, unknown>, definitions: ProductAttributeDefinition[]) {
    const allowed = new Set([
      ...definitions.map((item) => item.key),
      'model', 'package_volume',
    ]);
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
