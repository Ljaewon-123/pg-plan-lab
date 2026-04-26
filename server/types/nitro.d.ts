import type { Kysely } from 'kysely'
import type { Database } from '../plugins/db'

declare module 'nitropack' {
  interface NitroApp {
    db: Kysely<Database>
  }
}
