import { DataSource } from 'typeorm';

export async function truncateTables(dataSource: DataSource): Promise<void> {
    const tables = dataSource.entityMetadatas.map(
        (metadata) => `"${metadata.tableName}"`,
    );

    if (tables.length === 0) {
        return;
    }

    await dataSource.query(
        `TRUNCATE TABLE ${tables.join(', ')} RESTART IDENTITY CASCADE`,
    );
}
