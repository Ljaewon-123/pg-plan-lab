interface QueryResult {
  rows: Record<string, unknown>[]
  columns: string[]
  rowCount: number
  numAffectedRows: string | null
  executionTime: number
}

export function useTramSearch(selectedTable: Ref<string>) {
  const searchQuery = ref('')
  const searchLoading = ref(false)
  const searchError = ref('')
  const searchResults = ref<Record<string, unknown>[]>([])
  const searchColumns = ref<string[]>([])
  const searchTime = ref<number | null>(null)

  watch(selectedTable, () => {
    searchResults.value = []
    searchTime.value = null
    searchError.value = ''
  })

  async function runSearch(col: string, threshold: number) {
    if (!selectedTable.value || !searchQuery.value.trim() || !col) return
    searchError.value = ''
    searchResults.value = []
    searchTime.value = null
    searchLoading.value = true
    try {
      const escaped = searchQuery.value.replace(/'/g, "''")
      const query = `
        SELECT *, similarity("${col}", '${escaped}') AS _similarity
        FROM ${selectedTable.value}
        WHERE similarity("${col}", '${escaped}') >= ${threshold}
        ORDER BY _similarity DESC
      `
      const result = await $fetch<QueryResult>('/api/query', {
        method: 'POST',
        body: { query },
      })
      searchResults.value = result.rows
      searchColumns.value = result.columns
      searchTime.value = result.executionTime
    } catch (e: unknown) {
      const err = e as { data?: { message?: string }; message?: string }
      searchError.value = err.data?.message ?? err.message ?? 'Unknown error'
    } finally {
      searchLoading.value = false
    }
  }

  return {
    searchQuery,
    searchLoading,
    searchError,
    searchResults,
    searchColumns,
    searchTime,
    runSearch,
  }
}
