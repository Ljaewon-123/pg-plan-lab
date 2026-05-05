import { sql } from 'kysely'
import { DDL } from '../constants/timeseries.constants'

export default defineEventHandler(async () => {
  const db = useNitroApp().db
  const start = Date.now()

  try {
    await sql.raw(DDL.dropSchema).execute(db)
    return { ok: true, elapsedMs: Date.now() - start }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e)
    throw createError({ statusCode: 500, message })
  }
})
