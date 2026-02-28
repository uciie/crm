import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import * as dotenv from 'dotenv';

dotenv.config();

// AJOUTEZ CES LOGS POUR LE DEBUG
console.log('--- DB CONFIG CHECK ---');
console.log('DATABASE_URL définie ?', !!process.env.DATABASE_URL);
if (process.env.DATABASE_URL) {
  console.log('Début de l URL:', process.env.DATABASE_URL.substring(0, 25));
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

// Test immédiat de la connexion
pool.on('error', (err) => {
  console.error('[Pool Error] Erreur de connexion à Supabase:', err.message);
});

export const db = drizzle(pool, { schema });