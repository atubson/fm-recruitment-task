import { DataSource } from 'typeorm';
import { config } from 'dotenv';

config();

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
