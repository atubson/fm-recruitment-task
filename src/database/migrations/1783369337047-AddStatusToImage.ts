import { MigrationInterface, QueryRunner } from "typeorm";

export class AddStatusToImage1783369337047 implements MigrationInterface {
    name = 'AddStatusToImage1783369337047'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "image" ADD "status" smallint NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "image" ALTER COLUMN "created_at" SET DEFAULT now()`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "image" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "image" DROP COLUMN "status"`);
    }

}
