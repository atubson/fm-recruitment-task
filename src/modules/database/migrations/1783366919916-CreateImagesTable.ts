import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateImagesTable1783366919916 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: 'image',
                columns: [
                    {
                        name: 'id',
                        type: 'int',
                        isPrimary: true,
                        isGenerated: true,
                        generationStrategy: 'increment',
                    },
                    { name: 'path', type: 'varchar', length: '1024' },
                    { name: 'original_name', type: 'varchar', length: '255' },
                    { name: 'title', type: 'varchar', length: '255' },
                    { name: 'mimetype', type: 'varchar', length: '50' },
                    { name: 'width', type: 'int' },
                    { name: 'height', type: 'int' },
                    {
                        name: 'created_at',
                        type: 'timestamp',
                        default: 'CURRENT_TIMESTAMP',
                    },
                ],
            }),
            true,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable('image');
    }
}
