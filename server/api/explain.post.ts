import { sql } from 'kysely'

export default defineEventHandler(async (event) => {
  const { query } = await readBody<{ query: string }>(event)

  if (!query?.trim()) {
    throw createError({ statusCode: 400, message: 'query is required' })
  }

  const db = useNitroApp().db

  try {
    const result = await sql`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${sql.raw(query)}`.execute(db)
    const plan = result.rows[0] as { 'QUERY PLAN': unknown[] }
    return { plan: JSON.stringify(plan['QUERY PLAN']) }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e)
    throw createError({ statusCode: 500, message })
  }
})
