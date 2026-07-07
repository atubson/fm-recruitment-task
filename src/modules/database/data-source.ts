import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { resolve } from 'path';

const envPath = process.env.DOTENV_CONFIG_PATH ?? resolve(process.cwd(), '.env');

if (!process.env.DATABASE_HOST) {
    config({ path: envPath });
}

const runningFromDist = __filename.replace(/\\/g, '/').includes('/dist/');

export default new DataSource({
    type: 'postgres',
    host: process.env.DATABASE_HOST,
    port: Number(process.env.DATABASE_PORT),
    username: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    entities: [runningFromDist ? 'dist/**/*.entity.js' : 'src/**/*.entity.ts'],
    migrations: [
        runningFromDist
            ? 'dist/modules/database/migrations/*.js'
            : 'src/modules/database/migrations/*.ts',
    ],
});
