import { sql } from 'kysely'

export default defineEventHandler(async (event) => {
  const { schema, table } = getQuery<{ schema: string; table: string }>(event)

  if (!schema || !table) {
    throw createError({
      statusCode: 400,
      message: 'schema and table are required',
    })
  }

  const db = useNitroApp().db

  const result = await sql<{
    column_name: string
    data_type: string
    is_nullable: string
    column_default: string | null
  }>`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = ${schema} AND table_name = ${table}
    ORDER BY ordinal_position
  `.execute(db)

  return { columns: result.rows }
})
