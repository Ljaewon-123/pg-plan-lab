export const SCHEMA = 'metrics'
export const PARTITIONED = `${SCHEMA}.metrics_partitioned`
export const UNPARTITIONED = `${SCHEMA}.metrics_unpartitioned`
export const HOURLY_AVG_MV = `${SCHEMA}.metrics_hourly_avg`

export const SEED_START = '2026-04-05'
export const SEED_DAYS = 30
export const SEED_INTERVAL_MINUTES = 4
export const SEED_DEVICES = 30
export const SEED_METRICS = ['cpu', 'mem', 'net'] as const

export const SAMPLE_DAY = '2026-04-15'
export const SAMPLE_RANGE_START = '2026-04-15'
export const SAMPLE_RANGE_END = '2026-04-22'

export const DDL = {
  createSchema: `CREATE SCHEMA IF NOT EXISTS ${SCHEMA}`,

  createPartitioned: `
    CREATE TABLE IF NOT EXISTS ${PARTITIONED} (
      id          char(26)      NOT NULL,
      device_id   text          NOT NULL,
      metric_name text          NOT NULL,
      value       numeric(10,4) NOT NULL,
      recorded_at timestamptz   NOT NULL,
      PRIMARY KEY (recorded_at, id)
    ) PARTITION BY RANGE (recorded_at)
  `,

  createUnpartitioned: `
    CREATE TABLE IF NOT EXISTS ${UNPARTITIONED} (
      id          char(26)      NOT NULL,
      device_id   text          NOT NULL,
      metric_name text          NOT NULL,
      value       numeric(10,4) NOT NULL,
      recorded_at timestamptz   NOT NULL,
      PRIMARY KEY (id)
    )
  `,

  indexes: [
    `CREATE INDEX IF NOT EXISTS idx_part_btree_recorded_at
       ON ${PARTITIONED} USING BTREE (recorded_at)`,
    `CREATE INDEX IF NOT EXISTS idx_part_brin_recorded_at
       ON ${PARTITIONED} USING BRIN (recorded_at) WITH (pages_per_range = 32)`,
    `CREATE INDEX IF NOT EXISTS idx_unpart_btree_recorded_at
       ON ${UNPARTITIONED} USING BTREE (recorded_at)`,
    `CREATE INDEX IF NOT EXISTS idx_unpart_brin_recorded_at
       ON ${UNPARTITIONED} USING BRIN (recorded_at) WITH (pages_per_range = 32)`,
  ],

  createHourlyAvgMv: `
    CREATE MATERIALIZED VIEW IF NOT EXISTS ${HOURLY_AVG_MV} AS
    SELECT date_trunc('hour', recorded_at) AS hour,
           device_id,
           metric_name,
           avg(value)::numeric(10,4) AS avg_value,
           count(*)                  AS sample_count
    FROM   ${PARTITIONED}
    GROUP  BY 1, 2, 3
  `,

  refreshHourlyAvgMv: `REFRESH MATERIALIZED VIEW ${HOURLY_AVG_MV}`,

  dropSchema: `DROP SCHEMA IF EXISTS ${SCHEMA} CASCADE`,
} as const

export function buildPartitionDDLs(): string[] {
  const start = new Date(`${SEED_START}T00:00:00Z`)
  const ddls: string[] = []
  for (let i = 0; i < SEED_DAYS; i++) {
    const from = new Date(start)
    from.setUTCDate(start.getUTCDate() + i)
    const to = new Date(start)
    to.setUTCDate(start.getUTCDate() + i + 1)
    const fromStr = from.toISOString().slice(0, 10)
    const toStr = to.toISOString().slice(0, 10)
    const partName = `metrics_partitioned_${fromStr.replace(/-/g, '_')}`
    ddls.push(
      `CREATE TABLE IF NOT EXISTS ${SCHEMA}.${partName}
         PARTITION OF ${PARTITIONED}
         FOR VALUES FROM ('${fromStr}') TO ('${toStr}')`
    )
  }
  return ddls
}

export const SEED_PARTITIONED_SQL = `
  INSERT INTO ${PARTITIONED} (id, device_id, metric_name, value, recorded_at)
  SELECT
    substr(md5(random()::text || clock_timestamp()::text || ts::text || d::text || m.metric), 1, 26),
    'device-' || lpad(d::text, 3, '0'),
    m.metric,
    (50 + 30 * sin(extract(epoch FROM ts) / 3600.0) + (random() * 10))::numeric(10,4),
    ts
  FROM generate_series(
    '${SEED_START} 00:00:00+00'::timestamptz,
    '${SEED_START} 00:00:00+00'::timestamptz + interval '${SEED_DAYS} days' - interval '${SEED_INTERVAL_MINUTES} minutes',
    interval '${SEED_INTERVAL_MINUTES} minutes'
  ) ts
  CROSS JOIN generate_series(1, ${SEED_DEVICES}) d
  CROSS JOIN (VALUES ${SEED_METRICS.map((m) => `('${m}')`).join(', ')}) AS m(metric)
`

export const SEED_UNPARTITIONED_SQL = `
  INSERT INTO ${UNPARTITIONED} (id, device_id, metric_name, value, recorded_at)
  SELECT id, device_id, metric_name, value, recorded_at
  FROM ${PARTITIONED}
`

export const SAMPLE_QUERIES = {
  partitionPrune: {
    title: '하루치 SELECT (파티션 프루닝)',
    description:
      '같은 WHERE 조건으로 두 테이블을 조회. 파티션 테이블은 해당 일자의 단일 파티션만 스캔하고, 비파티션 테이블은 전체를 본다.',
    partitioned: `
      SELECT count(*) AS rows, avg(value) AS avg_value
      FROM ${PARTITIONED}
      WHERE recorded_at >= '${SAMPLE_DAY}' AND recorded_at < '${SAMPLE_DAY}'::date + 1
    `,
    unpartitioned: `
      SELECT count(*) AS rows, avg(value) AS avg_value
      FROM ${UNPARTITIONED}
      WHERE recorded_at >= '${SAMPLE_DAY}' AND recorded_at < '${SAMPLE_DAY}'::date + 1
    `,
  },

  brinRange: {
    title: '7일 범위 집계 (BRIN vs BTREE)',
    description:
      '인덱스 사이즈는 BRIN이 압도적으로 작다. 같은 테이블에 두 인덱스를 모두 두고 옵티마이저 선택을 EXPLAIN으로 확인한다.',
    btree: `
      /* enable_indexscan=on, enable_bitmapscan=off → BTREE 우선 */
      SET LOCAL enable_bitmapscan = off;
      EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
      SELECT count(*) FROM ${PARTITIONED}
      WHERE recorded_at >= '${SAMPLE_RANGE_START}' AND recorded_at < '${SAMPLE_RANGE_END}'
    `,
    brin: `
      /* indexscan 끄고 bitmap만 → BRIN bitmap heap scan 강제 */
      SET LOCAL enable_indexscan = off;
      SET LOCAL enable_seqscan = off;
      EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
      SELECT count(*) FROM ${PARTITIONED}
      WHERE recorded_at >= '${SAMPLE_RANGE_START}' AND recorded_at < '${SAMPLE_RANGE_END}'
    `,
  },

  matview: {
    title: '시간 단위 집계 (MV vs Raw)',
    description:
      '동일 결과를 raw 테이블 GROUP BY와 사전 집계된 MV 조회로 비교. MV가 압도적으로 빠르다.',
    raw: `
      SELECT date_trunc('hour', recorded_at) AS hour,
             device_id,
             metric_name,
             avg(value)::numeric(10,4) AS avg_value
      FROM   ${PARTITIONED}
      WHERE  recorded_at >= '${SAMPLE_RANGE_START}' AND recorded_at < '${SAMPLE_RANGE_END}'
      GROUP  BY 1, 2, 3
      ORDER  BY 1, 2, 3
    `,
    mv: `
      SELECT hour, device_id, metric_name, avg_value
      FROM   ${HOURLY_AVG_MV}
      WHERE  hour >= '${SAMPLE_RANGE_START}' AND hour < '${SAMPLE_RANGE_END}'
      ORDER  BY 1, 2, 3
    `,
  },
} as const

export const STATS_SQL = {
  schemaExists: `SELECT 1 FROM pg_namespace WHERE nspname = '${SCHEMA}'`,

  partitions: `
    SELECT child.relname AS partition_name,
           pg_size_pretty(pg_total_relation_size(child.oid)) AS size,
           pg_total_relation_size(child.oid) AS size_bytes,
           (SELECT reltuples::bigint FROM pg_class WHERE oid = child.oid) AS approx_rows
    FROM pg_inherits i
    JOIN pg_class parent ON parent.oid = i.inhparent
    JOIN pg_class child  ON child.oid  = i.inhrelid
    JOIN pg_namespace ns ON ns.oid     = parent.relnamespace
    WHERE ns.nspname = '${SCHEMA}'
      AND parent.relname = 'metrics_partitioned'
    ORDER BY child.relname
  `,

  indexes: `
    SELECT i.indexrelname AS index_name,
           c.relname       AS table_name,
           am.amname       AS index_type,
           pg_size_pretty(pg_relation_size(i.indexrelid)) AS size,
           pg_relation_size(i.indexrelid) AS size_bytes
    FROM pg_stat_user_indexes i
    JOIN pg_class c     ON c.oid     = i.relid
    JOIN pg_index idx   ON idx.indexrelid = i.indexrelid
    JOIN pg_class ic    ON ic.oid    = i.indexrelid
    JOIN pg_am am       ON am.oid    = ic.relam
    WHERE i.schemaname = '${SCHEMA}'
      AND c.relname IN ('metrics_partitioned', 'metrics_unpartitioned')
    ORDER BY c.relname, am.amname
  `,

  tableSizes: `
    SELECT relname AS table_name,
           pg_size_pretty(pg_total_relation_size(c.oid)) AS total_size,
           pg_total_relation_size(c.oid) AS total_bytes,
           c.reltuples::bigint AS approx_rows
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = '${SCHEMA}'
      AND c.relname IN ('metrics_partitioned', 'metrics_unpartitioned')
    ORDER BY relname
  `,

  matview: `
    SELECT matviewname AS name,
           pg_size_pretty(pg_total_relation_size((schemaname || '.' || matviewname)::regclass)) AS size,
           definition
    FROM pg_matviews
    WHERE schemaname = '${SCHEMA}'
  `,
} as const
