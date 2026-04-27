interface TableInfo {
  table_schema: string
  table_name: string
}

interface QueryResult {
  rows: Record<string, unknown>[]
  columns: string[]
  rowCount: number
  numAffectedRows: string | null
  executionTime: number
}

export function useTramTable() {
  const { data: tableData } = useFetch<{ tables: TableInfo[] }>('/api/tables')

  const tableOptions = computed(() =>
    (tableData.value?.tables ?? []).map((t) => ({
      label:
        t.table_schema === 'public'
          ? t.table_name
          : `${t.table_schema}.${t.table_name}`,
      value:
        t.table_schema === 'public'
          ? `"${t.table_name}"`
          : `"${t.table_schema}"."${t.table_name}"`,
    }))
  )

  const selectedTable = ref('')
  const tableRows = ref<Record<string, unknown>[]>([])
  const tableColumns = ref<string[]>([])
  const tableLoading = ref(false)
  const tableError = ref('')
  const showAddRow = ref(false)
  const addLoading = ref(false)

  async function loadTable() {
    if (!selectedTable.value) return
    tableError.value = ''
    tableLoading.value = true
    try {
      const result = await $fetch<QueryResult>('/api/query', {
        method: 'POST',
        body: { query: `SELECT * FROM ${selectedTable.value} LIMIT 100` },
      })
      tableRows.value = result.rows
      tableColumns.value = result.columns
    } catch (e: unknown) {
      const err = e as { data?: { message?: string }; message?: string }
      tableError.value = err.data?.message ?? err.message ?? 'Unknown error'
    } finally {
      tableLoading.value = false
    }
  }

  watch(selectedTable, () => {
    tableRows.value = []
    tableColumns.value = []
    showAddRow.value = false
    loadTable()
  })

  async function deleteRow(row: Record<string, unknown>) {
    const firstCol = tableColumns.value[0]
    if (!firstCol) return
    const val = row[firstCol]
    const quoted =
      typeof val === 'string' ? `'${val.replace(/'/g, "''")}'` : String(val)
    await $fetch('/api/query', {
      method: 'POST',
      body: {
        query: `DELETE FROM ${selectedTable.value} WHERE "${firstCol}" = ${quoted}`,
      },
    })
    await loadTable()
  }

  async function addRow(data: Record<string, string>) {
    const cols = Object.keys(data).filter((c) => data[c] !== '')
    if (!cols.length) return
    addLoading.value = true
    try {
      const colList = cols.map((c) => `"${c}"`).join(', ')
      const valList = cols
        .map((c) => `'${data[c]!.replace(/'/g, "''")}'`)
        .join(', ')
      await $fetch('/api/query', {
        method: 'POST',
        body: {
          query: `INSERT INTO ${selectedTable.value} (${colList}) VALUES (${valList})`,
        },
      })
      showAddRow.value = false
      await loadTable()
    } catch (e: unknown) {
      const err = e as { data?: { message?: string }; message?: string }
      tableError.value = err.data?.message ?? err.message ?? 'Unknown error'
    } finally {
      addLoading.value = false
    }
  }

  return {
    tableOptions,
    selectedTable,
    tableRows,
    tableColumns,
    tableLoading,
    tableError,
    showAddRow,
    addLoading,
    loadTable,
    deleteRow,
    addRow,
  }
}
