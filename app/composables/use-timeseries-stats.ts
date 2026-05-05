interface PartitionRow {
  partition_name: string
  size: string
  size_bytes: string
  approx_rows: string
}

interface IndexRow {
  index_name: string
  table_name: string
  index_type: string
  size: string
  size_bytes: string
}

interface TableSizeRow {
  table_name: string
  total_size: string
  total_bytes: string
  approx_rows: string
}

interface MatviewRow {
  name: string
  size: string
  definition: string
}

interface TimeseriesStats {
  initialized: boolean
  partitions: PartitionRow[]
  indexes: IndexRow[]
  tableSizes: TableSizeRow[]
  matview: MatviewRow | null
}

const empty: TimeseriesStats = {
  initialized: false,
  partitions: [],
  indexes: [],
  tableSizes: [],
  matview: null,
}

export function useTimeseriesStats() {
  const stats = ref<TimeseriesStats>(empty)
  const loading = ref(false)
  const error = ref('')

  async function loadStats() {
    loading.value = true
    error.value = ''
    try {
      stats.value = await $fetch<TimeseriesStats>('/api/timeseries-stats')
    } catch (e: unknown) {
      const err = e as { data?: { message?: string }; message?: string }
      error.value = err.data?.message ?? err.message ?? 'Unknown error'
    } finally {
      loading.value = false
    }
  }

  return { stats, loading, error, loadStats }
}
