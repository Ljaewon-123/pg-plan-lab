import { Kysely, PostgresDialect } from 'kysely'
import pg from 'pg'
import { EXTENSIONS } from '../constants/extensions.constants'

export interface Database {
  tram: { id: string; text: string }
}

class DB {
  private db: Kysely<Database> | null = null
  private initPromise: Promise<void> | null = null

  init(): Promise<void> {
    if (!this.initPromise) {
      this.initPromise = this.#init()
    }
    return this.initPromise
  }

  async #init(): Promise<void> {
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

    this.db = new Kysely<Database>({
      dialect: new PostgresDialect({ pool }),
    })
  }

  get pg() {
    if (!this.db) {
      throw new Error('Database not initialized')
    }
    return this.db
  }

  async close() {
    return this.db?.destroy()
  }
}

export const db = new DB()
