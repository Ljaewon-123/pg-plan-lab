import { sql } from 'kysely'

export default defineEventHandler(async (event) => {
  const { query } = await readBody<{ query: string }>(event)

  if (!query?.trim()) {
    throw createError({ statusCode: 400, message: 'query is required' })
  }

  const db = useNitroApp().db

  try {
    const start = Date.now()
    const result = await sql.raw(query).execute(db)
    const executionTime = Date.now() - start

    const rows = result.rows as Record<string, unknown>[]
    const columns = rows.length > 0 ? Object.keys(rows[0]) : []
    const numAffectedRows = result.numAffectedRows !== undefined
      ? String(result.numAffectedRows)
      : null

    return { rows, columns, rowCount: rows.length, numAffectedRows, executionTime }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e)
    throw createError({ statusCode: 500, message })
  }
})
