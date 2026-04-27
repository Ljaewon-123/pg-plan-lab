<script setup lang="ts">
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

const { data: tableData } = await useFetch<{ tables: TableInfo[] }>('/api/tables')

const tableOptions = computed(() =>
  (tableData.value?.tables ?? []).map((t) => ({
    label: t.table_schema === 'public' ? t.table_name : `${t.table_schema}.${t.table_name}`,
    value: t.table_schema === 'public' ? `"${t.table_name}"` : `"${t.table_schema}"."${t.table_name}"`,
  })),
)

const selectedTable = ref('')
const customQuery = ref('-- 왼쪽에서 테이블을 선택하거나 직접 SQL을 입력하세요\nSELECT * FROM pg_tables LIMIT 10')
const loading = ref(false)
const errorMsg = ref('')
const result = ref<QueryResult | null>(null)

watch(selectedTable, (val) => {
  if (val) customQuery.value = `SELECT * FROM ${val}\nLIMIT 50`
})

async function runQuery() {
  errorMsg.value = ''
  result.value = null
  loading.value = true
  try {
    result.value = await $fetch<QueryResult>('/api/query', {
      method: 'POST',
      body: { query: customQuery.value },
    })
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    errorMsg.value = err.data?.message ?? err.message ?? 'Unknown error'
  } finally {
    loading.value = false
  }
}

function insertTemplate(type: 'insert' | 'update' | 'delete') {
  if (!selectedTable.value) return
  const table = selectedTable.value
  const cols = result.value?.columns ?? []

  if (type === 'insert') {
    const colList = cols.length ? cols.join(', ') : 'col1, col2'
    const valList = cols.length ? cols.map(() => 'value').join(', ') : 'val1, val2'
    customQuery.value = `INSERT INTO ${table} (${colList})\nVALUES (${valList})\nRETURNING *`
  } else if (type === 'update') {
    const setClause = cols.length ? cols.map((c) => `${c} = value`).join(',\n  ') : 'col = value'
    customQuery.value = `UPDATE ${table}\nSET ${setClause}\nWHERE id = 1\nRETURNING *`
  } else {
    customQuery.value = `DELETE FROM ${table}\nWHERE id = 1\nRETURNING *`
  }
}

function formatCellValue(val: unknown): string {
  if (val === null || val === undefined) return 'NULL'
  if (typeof val === 'object') return JSON.stringify(val)
  return String(val)
}

function isCellNull(val: unknown): boolean {
  return val === null || val === undefined
}
</script>

<template>
  <div class="flex-1 flex flex-col overflow-hidden p-6 gap-4">
    <!-- 상단 컨트롤 바 -->
    <div class="flex items-center gap-3 flex-wrap">
      <USelect
        v-model="selectedTable"
        :options="tableOptions"
        placeholder="테이블 선택..."
        class="w-64"
      />

      <div v-if="selectedTable" class="flex gap-2">
        <UButton size="sm" color="neutral" variant="outline" @click="insertTemplate('insert')">
          INSERT
        </UButton>
        <UButton size="sm" color="neutral" variant="outline" @click="insertTemplate('update')">
          UPDATE
        </UButton>
        <UButton size="sm" color="error" variant="outline" @click="insertTemplate('delete')">
          DELETE
        </UButton>
      </div>

      <div class="ml-auto">
        <UButton :loading="loading" icon="i-heroicons-play" @click="runQuery">
          실행
        </UButton>
      </div>
    </div>

    <!-- SQL 에디터 -->
    <div class="relative">
      <textarea
        v-model="customQuery"
        class="w-full h-32 font-mono text-sm border border-(--ui-border) rounded-lg p-3 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
        placeholder="SQL 쿼리를 입력하세요..."
        spellcheck="false"
        @keydown.ctrl.enter.prevent="runQuery"
        @keydown.meta.enter.prevent="runQuery"
      />
      <span class="absolute bottom-2 right-3 text-xs text-gray-400 dark:text-gray-600 select-none">
        Ctrl+Enter
      </span>
    </div>

    <!-- 에러 -->
    <div v-if="errorMsg" class="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
      <UIcon name="i-heroicons-exclamation-triangle" class="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
      <pre class="text-red-600 dark:text-red-400 font-mono text-xs whitespace-pre-wrap break-all">{{ errorMsg }}</pre>
    </div>

    <!-- 결과 헤더 -->
    <div v-if="result" class="flex items-center gap-3 text-sm">
      <UBadge color="success" variant="subtle" class="font-mono">
        {{ result.executionTime }}ms
      </UBadge>
      <template v-if="result.rowCount > 0">
        <UBadge color="neutral" variant="subtle">
          {{ result.rowCount }}행 반환
        </UBadge>
      </template>
      <template v-else-if="result.numAffectedRows !== null && result.numAffectedRows !== '0'">
        <UBadge color="info" variant="subtle">
          {{ result.numAffectedRows }}행 영향받음
        </UBadge>
      </template>
      <template v-else>
        <span class="text-gray-400 text-xs">결과 없음</span>
      </template>
    </div>

    <!-- 결과 테이블 -->
    <div
      v-if="result && result.columns.length > 0"
      class="border border-(--ui-border) rounded-lg overflow-auto flex-1 min-h-0"
    >
      <table class="w-full text-sm border-collapse">
        <thead>
          <tr>
            <th
              v-for="col in result.columns"
              :key="col"
              class="sticky top-0 z-10 px-3 py-2 text-left font-medium text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 border-b border-(--ui-border) whitespace-nowrap text-xs"
            >
              {{ col }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, i) in result.rows"
            :key="i"
            class="hover:bg-gray-50 dark:hover:bg-gray-800/50 border-b border-(--ui-border) last:border-0"
          >
            <td
              v-for="col in result.columns"
              :key="col"
              class="px-3 py-1.5 font-mono text-xs max-w-xs truncate"
              :class="isCellNull(row[col]) ? 'text-gray-400 dark:text-gray-600 italic' : ''"
              :title="formatCellValue(row[col])"
            >
              {{ formatCellValue(row[col]) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 빈 결과 -->
    <div
      v-else-if="result && result.rowCount === 0 && (result.numAffectedRows === null || result.numAffectedRows === '0')"
      class="flex items-center justify-center py-12 text-gray-400 text-sm border border-(--ui-border) border-dashed rounded-lg"
    >
      반환된 행이 없습니다
    </div>

    <!-- 초기 상태 -->
    <div
      v-else-if="!result && !errorMsg"
      class="flex items-center justify-center py-12 text-gray-300 dark:text-gray-700 text-sm border border-(--ui-border) border-dashed rounded-lg flex-1"
    >
      테이블을 선택하거나 SQL을 실행하면 결과가 여기에 표시됩니다
    </div>
  </div>
</template>
