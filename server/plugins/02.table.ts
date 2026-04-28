import { db } from '../utils/db'

export default defineNitroPlugin(async () => {
  await db.init()
  await db.pg.schema
    .createTable('tram')
    .ifNotExists()
    .addColumn('id', 'char(26)', (col) => col.primaryKey())
    .addColumn('text', 'text', (col) => col.notNull())
    .execute()
})
