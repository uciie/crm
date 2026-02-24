import type { Config } from 'drizzle-kit'

export default {
  schema:    './src/database/schema.ts',
  out:       './drizzle/migrations',
  dialect:   'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
    ssl: { rejectUnauthorized: false },
  },
} satisfies Config