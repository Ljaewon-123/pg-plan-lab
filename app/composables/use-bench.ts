interface QueryResult {
  rows: Record<string, unknown>[]
  columns: string[]
  rowCount: number
  numAffectedRows: string | null
  executionTime: number
}

export interface BenchResult {
  rows: Record<string, unknown>[]
  columns: string[]
  rowCount: number
  executionTime: number
  error: string | null
}

interface BenchState {
  a: BenchResult | null
  b: BenchResult | null
  loading: boolean
  faster: 'a' | 'b' | null
  speedup: number | null
}

const empty: BenchState = {
  a: null,
  b: null,
  loading: false,
  faster: null,
  speedup: null,
}

async function runOne(query: string): Promise<BenchResult> {
  try {
    const r = await $fetch<QueryResult>('/api/query', {
      method: 'POST',
      body: { query },
    })
    return {
      rows: r.rows,
      columns: r.columns,
      rowCount: r.rowCount,
      executionTime: r.executionTime,
      error: null,
    }
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    return {
      rows: [],
      columns: [],
      rowCount: 0,
      executionTime: 0,
      error: err.data?.message ?? err.message ?? 'Unknown error',
    }
  }
}

export function useBench() {
  const state = ref<BenchState>({ ...empty })

  async function run(sqlA: string, sqlB: string) {
    state.value = { ...empty, loading: true }
    const [a, b] = await Promise.all([runOne(sqlA), runOne(sqlB)])
    const ok = !a.error && !b.error
    const faster = ok ? (a.executionTime < b.executionTime ? 'a' : 'b') : null
    const slower = faster === 'a' ? b.executionTime : a.executionTime
    const fasterTime = faster === 'a' ? a.executionTime : b.executionTime
    const speedup =
      ok && fasterTime > 0 ? Number((slower / fasterTime).toFixed(1)) : null
    state.value = { a, b, loading: false, faster, speedup }
  }

  function clear() {
    state.value = { ...empty }
  }

  return { state, run, clear }
}
