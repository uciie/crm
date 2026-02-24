import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool }    from 'pg'
import * as schema from './schema'

// Supabase fournit une DATABASE_URL au format :
// postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // requis pour Supabase
  max: 10,
  idleTimeoutMillis: 30000,
})

export const db = drizzle(pool, { schema })