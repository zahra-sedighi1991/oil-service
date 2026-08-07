import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1786128814662 implements MigrationInterface {
  name = 'InitialSchema1786128814662';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."shops_status_enum" AS ENUM('pending', 'active', 'suspended', 'closed')`,
    );
    await queryRunner.query(
      `CREATE TABLE "shops" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "name" character varying NOT NULL, "ownerName" character varying NOT NULL, "publicPhone" character varying NOT NULL, "city" character varying NOT NULL, "address" character varying, "currency" character varying NOT NULL DEFAULT 'TOMAN', "timezone" character varying NOT NULL DEFAULT 'Asia/Tehran', "invoiceNumberTemplate" character varying NOT NULL DEFAULT 'INV-{year}-{sequence}', "status" "public"."shops_status_enum" NOT NULL DEFAULT 'pending', CONSTRAINT "PK_3c6aaa6607d287de99815e60b96" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."users_role_enum" AS ENUM('super_admin', 'shop_owner')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."users_status_enum" AS ENUM('active', 'inactive', 'pending_review')`,
    );
    await queryRunner.query(
      `CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "shopId" uuid, "name" character varying NOT NULL, "mobile" character varying NOT NULL, "passwordHash" character varying, "role" "public"."users_role_enum" NOT NULL DEFAULT 'shop_owner', "status" "public"."users_status_enum" NOT NULL DEFAULT 'active', CONSTRAINT "UQ_d376a9f93bba651f32a2c03a7d3" UNIQUE ("mobile"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."vehicle_brands_status_enum" AS ENUM('active', 'inactive', 'pending_review')`,
    );
    await queryRunner.query(
      `CREATE TABLE "vehicle_brands" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "nameFa" character varying NOT NULL, "nameEn" character varying, "slug" character varying NOT NULL, "status" "public"."vehicle_brands_status_enum" NOT NULL DEFAULT 'active', CONSTRAINT "UQ_da19e7b886c6bc744c6d2bf1f0f" UNIQUE ("slug"), CONSTRAINT "PK_3ede5be03b371734e1d8aa257c9" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."vehicle_models_status_enum" AS ENUM('active', 'inactive', 'pending_review')`,
    );
    await queryRunner.query(
      `CREATE TABLE "vehicle_models" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "brandId" uuid NOT NULL, "nameFa" character varying NOT NULL, "nameEn" character varying, "slug" character varying NOT NULL, "isPopular" boolean NOT NULL DEFAULT false, "status" "public"."vehicle_models_status_enum" NOT NULL DEFAULT 'active', CONSTRAINT "UQ_0cafeeeac02aa3b1077bedf70e2" UNIQUE ("brandId", "slug"), CONSTRAINT "PK_1c01752184334fdbcae9bbaa67f" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."product_types_status_enum" AS ENUM('active', 'inactive', 'pending_review')`,
    );
    await queryRunner.query(
      `CREATE TABLE "product_types" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "key" character varying NOT NULL, "title" character varying NOT NULL, "titleTemplate" character varying, "currentSchemaVersion" integer NOT NULL DEFAULT '1', "status" "public"."product_types_status_enum" NOT NULL DEFAULT 'active', CONSTRAINT "UQ_97964de1541fff180dcfcb6786b" UNIQUE ("key"), CONSTRAINT "PK_6ad7b08e6491a02ebc9ed82019d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."product_attribute_definitions_status_enum" AS ENUM('active', 'inactive', 'pending_review')`,
    );
    await queryRunner.query(
      `CREATE TABLE "product_attribute_definitions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "productTypeId" uuid NOT NULL, "schemaVersion" integer NOT NULL, "key" character varying NOT NULL, "labelFa" character varying NOT NULL, "labelEn" character varying, "dataType" character varying NOT NULL, "required" boolean NOT NULL DEFAULT false, "config" jsonb NOT NULL DEFAULT '{}', "searchable" boolean NOT NULL DEFAULT false, "filterable" boolean NOT NULL DEFAULT false, "showInTitle" boolean NOT NULL DEFAULT false, "showOnInvoice" boolean NOT NULL DEFAULT true, "sortOrder" integer NOT NULL DEFAULT '0', "status" "public"."product_attribute_definitions_status_enum" NOT NULL DEFAULT 'active', CONSTRAINT "UQ_2cbcc1b2b20276ccc4df486e0df" UNIQUE ("productTypeId", "schemaVersion", "key"), CONSTRAINT "PK_78c40fd4ed4f7e5596814eb4b92" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."product_attribute_options_status_enum" AS ENUM('active', 'inactive', 'pending_review')`,
    );
    await queryRunner.query(
      `CREATE TABLE "product_attribute_options" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "attributeDefinitionId" uuid NOT NULL, "value" character varying NOT NULL, "label" character varying NOT NULL, "sortOrder" integer NOT NULL DEFAULT '0', "status" "public"."product_attribute_options_status_enum" NOT NULL DEFAULT 'active', CONSTRAINT "PK_25e4937ac144e83cc10a39947cf" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."products_status_enum" AS ENUM('active', 'inactive', 'pending_review')`,
    );
    await queryRunner.query(
      `CREATE TABLE "products" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "productTypeId" uuid NOT NULL, "name" character varying, "displayName" character varying NOT NULL, "attributes" jsonb NOT NULL DEFAULT '{}', "schemaVersion" integer NOT NULL, "status" "public"."products_status_enum" NOT NULL DEFAULT 'active', CONSTRAINT "PK_0806c755e0aca124e67c0cf6d7d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "product_vehicle_compatibilities" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "productId" uuid NOT NULL, "vehicleModelId" uuid NOT NULL, CONSTRAINT "PK_4191158cb495700f10fb8592ce1" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_4d5f899fd7b5207f9fda4f483d" ON "product_vehicle_compatibilities"  ("productId", "vehicleModelId") `,
    );
    await queryRunner.query(
      `CREATE TABLE "shop_products" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "shopId" character varying NOT NULL, "productId" uuid NOT NULL, "salePrice" bigint, "isActive" boolean NOT NULL DEFAULT true, "favorite" boolean NOT NULL DEFAULT false, "sortOrder" integer NOT NULL DEFAULT '0', "override" jsonb NOT NULL DEFAULT '{}', CONSTRAINT "UQ_51f059443ae0eb5eb6659d14f9a" UNIQUE ("shopId", "productId"), CONSTRAINT "PK_bc7b9a757fadb6a6b0e5cc4bf7e" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."service_catalog_status_enum" AS ENUM('active', 'inactive', 'pending_review')`,
    );
    await queryRunner.query(
      `CREATE TABLE "service_catalog" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "name" character varying NOT NULL, "category" character varying, "description" character varying, "status" "public"."service_catalog_status_enum" NOT NULL DEFAULT 'active', CONSTRAINT "PK_f2ba61b59fc13ea8e34acc75aa5" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "shop_services" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "shopId" character varying NOT NULL, "serviceId" uuid NOT NULL, "fee" bigint, "isActive" boolean NOT NULL DEFAULT true, "favorite" boolean NOT NULL DEFAULT false, "sortOrder" integer NOT NULL DEFAULT '0', CONSTRAINT "UQ_088ed76ac7d449309f9701abbc0" UNIQUE ("shopId", "serviceId"), CONSTRAINT "PK_8757a93a387d7d1f19b31dac0cb" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."customers_status_enum" AS ENUM('active', 'inactive', 'pending_review')`,
    );
    await queryRunner.query(
      `CREATE TABLE "customers" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "shopId" character varying NOT NULL, "name" character varying NOT NULL, "gender" character varying NOT NULL DEFAULT 'male', "mobileNormalized" character varying NOT NULL, "mobileDisplay" character varying NOT NULL, "note" character varying, "status" "public"."customers_status_enum" NOT NULL DEFAULT 'active', CONSTRAINT "UQ_57bd95cbfc3d41d3e18e2248e39" UNIQUE ("shopId", "mobileNormalized"), CONSTRAINT "PK_133ec679a801fab5e070f73d3ea" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "vehicles" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "shopId" character varying NOT NULL, "ownerCustomerId" uuid NOT NULL, "brandId" uuid NOT NULL, "modelId" uuid NOT NULL, "plateNormalized" character varying, "plateDisplay" character varying, "temporaryIdentifier" character varying, "year" integer, "lastOdometer" integer, CONSTRAINT "PK_18d8646b59304dce4af3a9e35b6" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_3a95a4a091eaac16ec4d570e64" ON "vehicles"  ("shopId", "plateNormalized") WHERE "plateNormalized" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."service_orders_status_enum" AS ENUM('draft', 'completed', 'canceled')`,
    );
    await queryRunner.query(
      `CREATE TABLE "service_orders" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "shopId" character varying NOT NULL, "customerId" uuid NOT NULL, "vehicleId" uuid NOT NULL, "serviceDate" TIMESTAMP WITH TIME ZONE NOT NULL, "odometer" integer NOT NULL, "status" "public"."service_orders_status_enum" NOT NULL DEFAULT 'draft', "note" character varying, "cancellationReason" character varying, "idempotencyKey" character varying, CONSTRAINT "PK_914aa74962ee83b10614ea2095d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_386d74af832b5f495f8109e665" ON "service_orders"  ("shopId", "idempotencyKey") WHERE "idempotencyKey" IS NOT NULL`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_dd7f8123ad7f0a89e0af01afbb" ON "service_orders"  ("vehicleId", "serviceDate") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_1e9e85d33fd345143adc39ffb4" ON "service_orders"  ("shopId", "serviceDate", "status") `,
    );
    await queryRunner.query(
      `CREATE TABLE "service_product_lines" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "orderId" uuid NOT NULL, "productId" character varying, "snapshot" jsonb NOT NULL, "quantity" numeric(12,3) NOT NULL, "unitPrice" bigint NOT NULL, "total" bigint NOT NULL, "intervalKm" integer, "intervalMonths" integer, "dueOdometer" integer, "dueDate" date, "temporary" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_779c7bb17258d4ea7fb9c48306a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "service_labor_lines" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "orderId" uuid NOT NULL, "serviceId" character varying, "snapshot" jsonb NOT NULL, "quantity" numeric(12,3) NOT NULL, "unitFee" bigint NOT NULL, "total" bigint NOT NULL, CONSTRAINT "PK_4c95118e3e02bab9a0998dd8ed8" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."invoices_status_enum" AS ENUM('issued', 'void')`,
    );
    await queryRunner.query(
      `CREATE TABLE "invoices" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "orderId" uuid NOT NULL, "shopId" character varying NOT NULL, "invoiceNo" character varying NOT NULL, "productsTotal" bigint NOT NULL, "servicesTotal" bigint NOT NULL, "discountAmount" bigint NOT NULL DEFAULT '0', "totalAmount" bigint NOT NULL, "currency" character varying NOT NULL, "status" "public"."invoices_status_enum" NOT NULL DEFAULT 'issued', "issuedAt" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "UQ_f8095c1c4e1d2044c4021d0d9da" UNIQUE ("shopId", "invoiceNo"), CONSTRAINT "REL_a58a78a0e0031dd93a2f56f1e8" UNIQUE ("orderId"), CONSTRAINT "PK_668cef7c22a427fd822cc1be3ce" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "invoice_lines" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "invoiceId" uuid NOT NULL, "itemType" character varying(20) NOT NULL, "sourceId" character varying, "descriptionSnapshot" character varying NOT NULL, "attributesSnapshot" jsonb NOT NULL DEFAULT '{}', "quantity" numeric(12,3) NOT NULL, "unitPrice" bigint NOT NULL, "total" bigint NOT NULL, CONSTRAINT "PK_3d18eb48142b916f581f0c21a65" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."vehicle_public_links_status_enum" AS ENUM('active', 'revoked')`,
    );
    await queryRunner.query(
      `CREATE TABLE "vehicle_public_links" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "shopId" character varying NOT NULL, "vehicleId" uuid NOT NULL, "tokenHash" character varying NOT NULL, "status" "public"."vehicle_public_links_status_enum" NOT NULL DEFAULT 'active', "expiresAt" TIMESTAMP WITH TIME ZONE, "revokedAt" TIMESTAMP WITH TIME ZONE, "lastAccessAt" TIMESTAMP WITH TIME ZONE, CONSTRAINT "UQ_d6c8bc8750f44481f219f66b4fa" UNIQUE ("tokenHash"), CONSTRAINT "PK_f33318f1c78952b4ea08bfa1777" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."suggestions_status_enum" AS ENUM('pending', 'approved', 'rejected', 'merged')`,
    );
    await queryRunner.query(
      `CREATE TABLE "suggestions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "shopId" character varying NOT NULL, "entityType" character varying NOT NULL, "payload" jsonb NOT NULL, "status" "public"."suggestions_status_enum" NOT NULL DEFAULT 'pending', "decisionNote" character varying, "mappedEntityId" character varying, CONSTRAINT "PK_745bbcb037ac379969b5fc7b352" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "audit_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "actorId" character varying, "shopId" character varying, "action" character varying NOT NULL, "entityType" character varying NOT NULL, "entityId" character varying, "before" jsonb, "after" jsonb, CONSTRAINT "PK_1bb179d048bbc581caa3b013439" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "FK_7680babafb8b9ca907bfbd142c5" FOREIGN KEY ("shopId") REFERENCES "shops"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "vehicle_models" ADD CONSTRAINT "FK_4cdf0d66d175c8ddcb85851201e" FOREIGN KEY ("brandId") REFERENCES "vehicle_brands"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_attribute_definitions" ADD CONSTRAINT "FK_22734cecaa8ff9705a675026b45" FOREIGN KEY ("productTypeId") REFERENCES "product_types"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_attribute_options" ADD CONSTRAINT "FK_a9290931db65ce43bc74e7952de" FOREIGN KEY ("attributeDefinitionId") REFERENCES "product_attribute_definitions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" ADD CONSTRAINT "FK_fed065ae1a8b80a37a9230da1fa" FOREIGN KEY ("productTypeId") REFERENCES "product_types"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_vehicle_compatibilities" ADD CONSTRAINT "FK_86f7703229bdab90dbcf24b2757" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_vehicle_compatibilities" ADD CONSTRAINT "FK_b69de6393f753ebef7dd38f0af6" FOREIGN KEY ("vehicleModelId") REFERENCES "vehicle_models"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "shop_products" ADD CONSTRAINT "FK_ea91320cac7908867e288ac7a81" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "shop_services" ADD CONSTRAINT "FK_6d716ff246960245e56317f6ffe" FOREIGN KEY ("serviceId") REFERENCES "service_catalog"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "vehicles" ADD CONSTRAINT "FK_ce1e1a62be3fb0b2bba711045e5" FOREIGN KEY ("ownerCustomerId") REFERENCES "customers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "vehicles" ADD CONSTRAINT "FK_bf3f748c6c8ea63cf06eff70c67" FOREIGN KEY ("brandId") REFERENCES "vehicle_brands"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "vehicles" ADD CONSTRAINT "FK_5fe3e38b9bf4649e65fdfb04bdf" FOREIGN KEY ("modelId") REFERENCES "vehicle_models"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_orders" ADD CONSTRAINT "FK_0cacf2265c94bd0c900a028310d" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_orders" ADD CONSTRAINT "FK_0b9f8edfa56f9f5ea6443c6aa45" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_product_lines" ADD CONSTRAINT "FK_976a86b91ac3f43b82d23068cda" FOREIGN KEY ("orderId") REFERENCES "service_orders"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_labor_lines" ADD CONSTRAINT "FK_24e90e9a6fb9a9b186926442617" FOREIGN KEY ("orderId") REFERENCES "service_orders"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "invoices" ADD CONSTRAINT "FK_a58a78a0e0031dd93a2f56f1e8e" FOREIGN KEY ("orderId") REFERENCES "service_orders"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "invoice_lines" ADD CONSTRAINT "FK_9f57f31e620fe759b452feb776e" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "vehicle_public_links" ADD CONSTRAINT "FK_439cf305aeadf372c4b94e4781d" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "vehicle_public_links" DROP CONSTRAINT "FK_439cf305aeadf372c4b94e4781d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "invoice_lines" DROP CONSTRAINT "FK_9f57f31e620fe759b452feb776e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "invoices" DROP CONSTRAINT "FK_a58a78a0e0031dd93a2f56f1e8e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_labor_lines" DROP CONSTRAINT "FK_24e90e9a6fb9a9b186926442617"`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_product_lines" DROP CONSTRAINT "FK_976a86b91ac3f43b82d23068cda"`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_orders" DROP CONSTRAINT "FK_0b9f8edfa56f9f5ea6443c6aa45"`,
    );
    await queryRunner.query(
      `ALTER TABLE "service_orders" DROP CONSTRAINT "FK_0cacf2265c94bd0c900a028310d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "vehicles" DROP CONSTRAINT "FK_5fe3e38b9bf4649e65fdfb04bdf"`,
    );
    await queryRunner.query(
      `ALTER TABLE "vehicles" DROP CONSTRAINT "FK_bf3f748c6c8ea63cf06eff70c67"`,
    );
    await queryRunner.query(
      `ALTER TABLE "vehicles" DROP CONSTRAINT "FK_ce1e1a62be3fb0b2bba711045e5"`,
    );
    await queryRunner.query(
      `ALTER TABLE "shop_services" DROP CONSTRAINT "FK_6d716ff246960245e56317f6ffe"`,
    );
    await queryRunner.query(
      `ALTER TABLE "shop_products" DROP CONSTRAINT "FK_ea91320cac7908867e288ac7a81"`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_vehicle_compatibilities" DROP CONSTRAINT "FK_b69de6393f753ebef7dd38f0af6"`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_vehicle_compatibilities" DROP CONSTRAINT "FK_86f7703229bdab90dbcf24b2757"`,
    );
    await queryRunner.query(
      `ALTER TABLE "products" DROP CONSTRAINT "FK_fed065ae1a8b80a37a9230da1fa"`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_attribute_options" DROP CONSTRAINT "FK_a9290931db65ce43bc74e7952de"`,
    );
    await queryRunner.query(
      `ALTER TABLE "product_attribute_definitions" DROP CONSTRAINT "FK_22734cecaa8ff9705a675026b45"`,
    );
    await queryRunner.query(
      `ALTER TABLE "vehicle_models" DROP CONSTRAINT "FK_4cdf0d66d175c8ddcb85851201e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT "FK_7680babafb8b9ca907bfbd142c5"`,
    );
    await queryRunner.query(`DROP TABLE "audit_logs"`);
    await queryRunner.query(`DROP TABLE "suggestions"`);
    await queryRunner.query(`DROP TYPE "public"."suggestions_status_enum"`);
    await queryRunner.query(`DROP TABLE "vehicle_public_links"`);
    await queryRunner.query(
      `DROP TYPE "public"."vehicle_public_links_status_enum"`,
    );
    await queryRunner.query(`DROP TABLE "invoice_lines"`);
    await queryRunner.query(`DROP TABLE "invoices"`);
    await queryRunner.query(`DROP TYPE "public"."invoices_status_enum"`);
    await queryRunner.query(`DROP TABLE "service_labor_lines"`);
    await queryRunner.query(`DROP TABLE "service_product_lines"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_1e9e85d33fd345143adc39ffb4"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_dd7f8123ad7f0a89e0af01afbb"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_386d74af832b5f495f8109e665"`,
    );
    await queryRunner.query(`DROP TABLE "service_orders"`);
    await queryRunner.query(`DROP TYPE "public"."service_orders_status_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_3a95a4a091eaac16ec4d570e64"`,
    );
    await queryRunner.query(`DROP TABLE "vehicles"`);
    await queryRunner.query(`DROP TABLE "customers"`);
    await queryRunner.query(`DROP TYPE "public"."customers_status_enum"`);
    await queryRunner.query(`DROP TABLE "shop_services"`);
    await queryRunner.query(`DROP TABLE "service_catalog"`);
    await queryRunner.query(`DROP TYPE "public"."service_catalog_status_enum"`);
    await queryRunner.query(`DROP TABLE "shop_products"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_4d5f899fd7b5207f9fda4f483d"`,
    );
    await queryRunner.query(`DROP TABLE "product_vehicle_compatibilities"`);
    await queryRunner.query(`DROP TABLE "products"`);
    await queryRunner.query(`DROP TYPE "public"."products_status_enum"`);
    await queryRunner.query(`DROP TABLE "product_attribute_options"`);
    await queryRunner.query(
      `DROP TYPE "public"."product_attribute_options_status_enum"`,
    );
    await queryRunner.query(`DROP TABLE "product_attribute_definitions"`);
    await queryRunner.query(
      `DROP TYPE "public"."product_attribute_definitions_status_enum"`,
    );
    await queryRunner.query(`DROP TABLE "product_types"`);
    await queryRunner.query(`DROP TYPE "public"."product_types_status_enum"`);
    await queryRunner.query(`DROP TABLE "vehicle_models"`);
    await queryRunner.query(`DROP TYPE "public"."vehicle_models_status_enum"`);
    await queryRunner.query(`DROP TABLE "vehicle_brands"`);
    await queryRunner.query(`DROP TYPE "public"."vehicle_brands_status_enum"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "public"."users_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
    await queryRunner.query(`DROP TABLE "shops"`);
    await queryRunner.query(`DROP TYPE "public"."shops_status_enum"`);
  }
}
