import 'reflect-metadata';
import { join } from 'node:path';
import { DataSource, type DataSourceOptions } from 'typeorm';
import { ENTITIES } from './entities';

const databaseUrl = process.env.DATABASE_URL;

const options: DataSourceOptions = {
  type: 'postgres',
  ...(databaseUrl
    ? { url: databaseUrl }
    : {
        host: process.env.DB_HOST ?? 'localhost',
        port: Number(process.env.DB_PORT ?? 5432),
        username: process.env.DB_USER ?? 'postgres',
        password: process.env.DB_PASSWORD ?? 'postgres',
        database: process.env.DB_NAME ?? 'oil_service',
      }),
  entities: ENTITIES,
  migrations: [join(__dirname, 'migrations/*{.js,.ts}')],
  synchronize: false,
  logging: process.env.DB_LOGGING === 'true',
};

export default new DataSource(options);
