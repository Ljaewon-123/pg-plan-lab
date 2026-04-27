import { sql } from 'kysely'

export default defineEventHandler(async () => {
  const db = useNitroApp().db

  const result = await sql<{ table_schema: string; table_name: string }>`
    SELECT table_schema, table_name
    FROM information_schema.tables
    WHERE table_schema NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
    AND table_type = 'BASE TABLE'
    ORDER BY table_schema, table_name
  `.execute(db)

  return { tables: result.rows }
})
