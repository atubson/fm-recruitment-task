export default () => ({
    database: {
        host: process.env.DATABASE_HOST || 'localhost',
        port: process.env.DATABASE_PORT || 5432,
        user: process.env.DATABASE_USER || 'nest',
        password: process.env.DATABASE_PASSWORD || 'nest',
        database: process.env.DATABASE_NAME || 'nest',
    }
});