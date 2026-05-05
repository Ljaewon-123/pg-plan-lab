import { sql } from 'kysely'
import {
  DDL,
  SEED_PARTITIONED_SQL,
  SEED_UNPARTITIONED_SQL,
  buildPartitionDDLs,
  PARTITIONED,
  UNPARTITIONED,
} from '../constants/timeseries.constants'

export default defineEventHandler(async () => {
  const db = useNitroApp().db
  const start = Date.now()

  try {
    await sql.raw(DDL.createSchema).execute(db)
    await sql.raw(DDL.createPartitioned).execute(db)
    await sql.raw(DDL.createUnpartitioned).execute(db)

    for (const ddl of buildPartitionDDLs()) {
      await sql.raw(ddl).execute(db)
    }

    for (const idx of DDL.indexes) {
      await sql.raw(idx).execute(db)
    }

    const insertStart = Date.now()
    await sql.raw(SEED_PARTITIONED_SQL).execute(db)
    await sql.raw(SEED_UNPARTITIONED_SQL).execute(db)
    const insertMs = Date.now() - insertStart

    await sql.raw(`ANALYZE ${PARTITIONED}`).execute(db)
    await sql.raw(`ANALYZE ${UNPARTITIONED}`).execute(db)

    await sql.raw(DDL.createHourlyAvgMv).execute(db)
    await sql.raw(DDL.refreshHourlyAvgMv).execute(db)

    const countResult = await sql<{ count: string }>`
      SELECT count(*)::text AS count FROM ${sql.raw(PARTITIONED)}
    `.execute(db)
    const totalRows = Number(countResult.rows[0]?.count ?? 0)

    return {
      totalRows,
      insertMs,
      elapsedMs: Date.now() - start,
    }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e)
    throw createError({ statusCode: 500, message })
  }
})
