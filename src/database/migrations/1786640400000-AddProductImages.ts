import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProductImages1786640400000 implements MigrationInterface {
  name = 'AddProductImages1786640400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "products" ADD "imageFileName" character varying`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "imageFileName"`);
  }
}
