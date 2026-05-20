import 'dotenv/config';
import { resolve } from 'path';
import fs from 'fs';
import { pool } from '../shared/db.js';
import { logger } from '../utils/logger.js';

const runMigration = async (): Promise<void> => {
  const legacyPath = resolve(__dirname, '../../db/migrate.sql');
  if (fs.existsSync(legacyPath)) {
    const checkResult = await pool.query(
      `SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'guest_rut')`
    );
    if (!checkResult.rows[0].exists) {
      const sql = fs.readFileSync(legacyPath, 'utf-8');
      await pool.query(sql);
      logger.info('Migración legacy aplicada');
    }
  }

  const migrationsDir = resolve(__dirname, '../../db/migrations');
  if (!fs.existsSync(migrationsDir)) {
    logger.info('No hay migraciones pendientes');
    return;
  }

  await pool.query(
    `CREATE TABLE IF NOT EXISTS _migrations (id SERIAL PRIMARY KEY, name VARCHAR(255) UNIQUE NOT NULL, applied_at TIMESTAMP DEFAULT NOW())`
  );

  const { rows: [{ exists }] } = await pool.query(
    `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users')`
  );
  if (!exists) {
    const initPath = resolve(__dirname, '../../db/init.sql');
    if (fs.existsSync(initPath)) {
      const initSql = fs.readFileSync(initPath, 'utf-8');
      await pool.query(initSql);
      logger.info('Esquema inicial (init.sql) aplicado');
    }
    await pool.query('DELETE FROM _migrations');
    logger.info('Migraciones previas limpiadas para re-ejecución');
  }

  const migrationFiles = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  for (const file of migrationFiles) {
    const already = await pool.query('SELECT 1 FROM _migrations WHERE name = $1', [file]);
    if (already.rows.length > 0) continue;

    const sql = fs.readFileSync(resolve(migrationsDir, file), 'utf-8');
    await pool.query(sql);
    await pool.query('INSERT INTO _migrations (name) VALUES ($1)', [file]);
    logger.info(`Migración ${file} aplicada`);
  }
};

const main = async (): Promise<void> => {
  try {
    await pool.query('SELECT 1');
    logger.info('DB conectada');
    await runMigration();
    logger.info('Migraciones completadas');
  } catch (error) {
    logger.error('Error ejecutando migraciones', { error: (error as Error).message });
    process.exit(1);
  } finally {
    await pool.end();
  }
};

main();
