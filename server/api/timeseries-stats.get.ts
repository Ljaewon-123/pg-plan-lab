import { sql } from 'kysely'
import { STATS_SQL } from '../constants/timeseries.constants'

export interface PartitionRow {
  partition_name: string
  size: string
  size_bytes: string
  approx_rows: string
}

export interface IndexRow {
  index_name: string
  table_name: string
  index_type: string
  size: string
  size_bytes: string
}

export interface TableSizeRow {
  table_name: string
  total_size: string
  total_bytes: string
  approx_rows: string
}

export interface MatviewRow {
  name: string
  size: string
  definition: string
}

export interface TimeseriesStats {
  initialized: boolean
  partitions: PartitionRow[]
  indexes: IndexRow[]
  tableSizes: TableSizeRow[]
  matview: MatviewRow | null
}

export default defineEventHandler(async (): Promise<TimeseriesStats> => {
  const db = useNitroApp().db

  const exists = await sql.raw(STATS_SQL.schemaExists).execute(db)
  if (exists.rows.length === 0) {
    return {
      initialized: false,
      partitions: [],
      indexes: [],
      tableSizes: [],
      matview: null,
    }
  }

  const [partitions, indexes, tableSizes, matview] = await Promise.all([
    sql.raw(STATS_SQL.partitions).execute(db),
    sql.raw(STATS_SQL.indexes).execute(db),
    sql.raw(STATS_SQL.tableSizes).execute(db),
    sql.raw(STATS_SQL.matview).execute(db),
  ])

  return {
    initialized: true,
    partitions: partitions.rows as PartitionRow[],
    indexes: indexes.rows as IndexRow[],
    tableSizes: tableSizes.rows as TableSizeRow[],
    matview: (matview.rows[0] as MatviewRow | undefined) ?? null,
  }
})
