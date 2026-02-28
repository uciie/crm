import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import * as dotenv from 'dotenv';

// Force le chargement du .env avant d'utiliser DATABASE_URL
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // TRÈS IMPORTANT : Supabase nécessite SSL pour les connexions externes
  ssl: {
    rejectUnauthorized: false,
  },
});

export const db = drizzle(pool, { schema });