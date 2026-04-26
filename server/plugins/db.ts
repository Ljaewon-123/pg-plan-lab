import { Kysely, PostgresDialect } from 'kysely'
import pg from 'pg'
import { EXTENSIONS } from '../constants/extensions.constants'

export interface Database {
  none: never
  // 예: users: { id: number; name: string; email: string }
}

export default defineNitroPlugin(async (nitroApp) => {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
  })
  const client = await pool.connect()
  try {
    for (const ext of EXTENSIONS) {
      await client.query(`CREATE EXTENSION IF NOT EXISTS "${ext}"`)
    }
  } finally {
    client.release()
  }
  nitroApp.db = new Kysely<Database>({
    dialect: new PostgresDialect({ pool }),
  })
  nitroApp.hooks.hook('close', async () => {
    await nitroApp.db.destroy()
  })
})
