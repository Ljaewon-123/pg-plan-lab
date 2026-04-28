import type { Kysely } from 'kysely'
import type { Database } from '../utils/db'

declare module 'nitropack' {
  interface NitroApp {
    db: Kysely<Database>
  }
}
