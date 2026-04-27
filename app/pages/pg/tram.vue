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

// ─── 테이블 목록 ───────────────────────────────────────────────
const { data: tableData } = await useFetch<{ tables: TableInfo[] }>('/api/tables')

const tableOptions = computed(() =>
  (tableData.value?.tables ?? []).map((t) => ({
    label: t.table_schema === 'public' ? t.table_name : `${t.table_schema}.${t.table_name}`,
    value: t.table_schema === 'public' ? `"${t.table_name}"` : `"${t.table_schema}"."${t.table_name}"`,
  })),
)

// ─── 상태 ─────────────────────────────────────────────────────
const selectedTable = ref('')
const tableRows = ref<Record<string, unknown>[]>([])
const tableColumns = ref<string[]>([])
const tableLoading = ref(false)
const tableError = ref('')

const searchQuery = ref('')
const threshold = ref(0.3)
const searchColumn = ref('')
const searchLoading = ref(false)
const searchError = ref('')
const searchResults = ref<Record<string, unknown>[]>([])
const searchColumns = ref<string[]>([])
const searchTime = ref<number | null>(null)

const showAddRow = ref(false)
const newRow = ref<Record<string, string>>({})
const addLoading = ref(false)

// ─── 테이블 로드 ───────────────────────────────────────────────
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
    searchColumn.value = result.columns[0] ?? ''
    newRow.value = Object.fromEntries(result.columns.map((c) => [c, '']))
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
  searchResults.value = []
  showAddRow.value = false
  loadTable()
})

// ─── 행 삭제 ───────────────────────────────────────────────────
async function deleteRow(row: Record<string, unknown>) {
  const firstCol = tableColumns.value[0]
  if (!firstCol) return
  const val = row[firstCol]
  const quoted = typeof val === 'string' ? `'${val.replace(/'/g, "''")}'` : String(val)
  await $fetch('/api/query', {
    method: 'POST',
    body: { query: `DELETE FROM ${selectedTable.value} WHERE "${firstCol}" = ${quoted}` },
  })
  await loadTable()
}

// ─── 행 추가 ───────────────────────────────────────────────────
async function addRow() {
  const cols = tableColumns.value.filter((c) => newRow.value[c] !== '')
  if (!cols.length) return
  addLoading.value = true
  try {
    const colList = cols.map((c) => `"${c}"`).join(', ')
    const valList = cols.map((c) => `'${newRow.value[c]!.replace(/'/g, "''")}'`).join(', ')
    await $fetch('/api/query', {
      method: 'POST',
      body: { query: `INSERT INTO ${selectedTable.value} (${colList}) VALUES (${valList})` },
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

// ─── 유사 검색 (pg_trgm) ──────────────────────────────────────
// 이 함수를 직접 채워서 사용하세요
async function runSearch() {
  if (!selectedTable.value || !searchQuery.value.trim() || !searchColumn.value) return
  searchError.value = ''
  searchResults.value = []
  searchTime.value = null
  searchLoading.value = true
  try {
    const query = `
      SELECT *, similarity("${searchColumn.value}", '${searchQuery.value.replace(/'/g, "''")}') AS _similarity
      FROM ${selectedTable.value}
      WHERE similarity("${searchColumn.value}", '${searchQuery.value.replace(/'/g, "''")}') >= ${threshold.value}
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

function similarityColor(val: unknown): string {
  const n = Number(val)
  if (n >= 0.7) return 'text-green-600 dark:text-green-400'
  if (n >= 0.4) return 'text-yellow-600 dark:text-yellow-400'
  return 'text-red-500 dark:text-red-400'
}

function formatCell(val: unknown): string {
  if (val === null || val === undefined) return 'NULL'
  if (typeof val === 'object') return JSON.stringify(val)
  if (typeof val === 'number') return Number(val).toFixed(4).replace(/\.?0+$/, '')
  return String(val)
}
</script>

<template>
  <div class="flex-1 flex flex-col overflow-hidden">

    <!-- ── 툴바 ──────────────────────────────────────────────── -->
    <div class="flex items-center gap-3 px-6 py-3 border-b border-(--ui-border) bg-gray-50 dark:bg-gray-900/50">
      <UIcon name="i-heroicons-magnifying-glass-circle" class="w-5 h-5 text-primary-500" />
      <span class="font-semibold text-sm">pg_trgm 유사 검색</span>
      <UBadge label="Fuzzy Match" color="primary" variant="subtle" size="sm" />

      <div class="ml-4 flex items-center gap-2">
        <span class="text-xs text-gray-500">테이블</span>
        <USelect
          v-model="selectedTable"
          :options="tableOptions"
          placeholder="선택..."
          class="w-52"
          size="sm"
        />
      </div>

      <div v-if="selectedTable" class="ml-auto flex gap-2">
        <UButton size="sm" variant="outline" icon="i-heroicons-arrow-path" :loading="tableLoading" @click="loadTable">
          새로고침
        </UButton>
        <UButton size="sm" icon="i-heroicons-plus" @click="showAddRow = !showAddRow">
          행 추가
        </UButton>
      </div>
    </div>

    <!-- ── 본문 2분할 ─────────────────────────────────────────── -->
    <div class="flex-1 flex overflow-hidden">

      <!-- ◀ 왼쪽: 데이터 테이블 (CRUD) ──────────────────────── -->
      <div class="flex flex-col w-1/2 border-r border-(--ui-border) overflow-hidden">
        <div class="px-4 py-2 border-b border-(--ui-border) bg-white dark:bg-gray-950 flex items-center gap-2">
          <span class="text-xs font-medium text-gray-500 uppercase tracking-wider">데이터</span>
          <UBadge v-if="tableRows.length" :label="`${tableRows.length}행`" color="neutral" variant="subtle" size="sm" />
        </div>

        <!-- 에러 -->
        <div v-if="tableError" class="m-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex gap-2">
          <UIcon name="i-heroicons-exclamation-triangle" class="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <pre class="text-red-600 dark:text-red-400 text-xs whitespace-pre-wrap break-all">{{ tableError }}</pre>
        </div>

        <!-- 행 추가 폼 -->
        <div v-if="showAddRow && tableColumns.length" class="p-3 border-b border-(--ui-border) bg-blue-50 dark:bg-blue-900/10 space-y-2">
          <div class="text-xs font-medium text-blue-600 dark:text-blue-400 mb-2">새 행 입력</div>
          <div class="grid grid-cols-2 gap-2">
            <div v-for="col in tableColumns" :key="col" class="flex flex-col gap-1">
              <label class="text-xs text-gray-500 font-mono">{{ col }}</label>
              <UInput v-model="newRow[col]" :placeholder="col" size="sm" class="font-mono" />
            </div>
          </div>
          <div class="flex gap-2 pt-1">
            <UButton size="sm" :loading="addLoading" @click="addRow">저장</UButton>
            <UButton size="sm" color="neutral" variant="ghost" @click="showAddRow = false">취소</UButton>
          </div>
        </div>

        <!-- 로딩 -->
        <div v-if="tableLoading" class="flex-1 flex items-center justify-center">
          <UIcon name="i-heroicons-arrow-path" class="w-6 h-6 text-gray-300 animate-spin" />
        </div>

        <!-- 빈 상태 -->
        <div v-else-if="!selectedTable" class="flex-1 flex items-center justify-center text-gray-300 dark:text-gray-700 text-sm">
          테이블을 선택하세요
        </div>

        <!-- 데이터 없음 -->
        <div v-else-if="!tableRows.length && !tableLoading" class="flex-1 flex items-center justify-center text-gray-400 text-sm">
          데이터가 없습니다
        </div>

        <!-- 테이블 -->
        <div v-else class="overflow-auto flex-1">
          <table class="w-full text-sm border-collapse">
            <thead>
              <tr>
                <th
                  v-for="col in tableColumns"
                  :key="col"
                  class="sticky top-0 z-10 px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 border-b border-(--ui-border) whitespace-nowrap"
                >
                  {{ col }}
                </th>
                <th class="sticky top-0 z-10 px-2 py-2 bg-gray-50 dark:bg-gray-900 border-b border-(--ui-border) w-10" />
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(row, i) in tableRows"
                :key="i"
                class="group hover:bg-gray-50 dark:hover:bg-gray-800/50 border-b border-(--ui-border) last:border-0"
              >
                <td
                  v-for="col in tableColumns"
                  :key="col"
                  class="px-3 py-1.5 font-mono text-xs max-w-[180px] truncate"
                  :class="row[col] === null ? 'text-gray-400 italic' : ''"
                  :title="formatCell(row[col])"
                >
                  {{ formatCell(row[col]) }}
                </td>
                <td class="px-2 py-1.5">
                  <UButton
                    size="xs"
                    color="error"
                    variant="ghost"
                    icon="i-heroicons-trash"
                    class="opacity-0 group-hover:opacity-100 transition-opacity"
                    @click="deleteRow(row)"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ▶ 오른쪽: 검색 패널 ─────────────────────────────────── -->
      <div class="flex flex-col w-1/2 overflow-hidden">
        <div class="px-4 py-2 border-b border-(--ui-border) bg-white dark:bg-gray-950 flex items-center gap-2">
          <span class="text-xs font-medium text-gray-500 uppercase tracking-wider">유사 검색</span>
          <UBadge label="pg_trgm" color="violet" variant="subtle" size="sm" />
        </div>

        <!-- 검색 설정 -->
        <div class="p-4 border-b border-(--ui-border) space-y-4 bg-white dark:bg-gray-950">

          <!-- 검색 대상 컬럼 -->
          <div v-if="tableColumns.length" class="flex items-center gap-3">
            <span class="text-xs text-gray-500 w-24 shrink-0">검색 컬럼</span>
            <USelect
              v-model="searchColumn"
              :options="tableColumns.map((c) => ({ label: c, value: c }))"
              size="sm"
              class="flex-1"
            />
          </div>

          <!-- 검색어 입력 -->
          <div class="flex gap-2">
            <UInput
              v-model="searchQuery"
              placeholder="검색어 입력..."
              class="flex-1 font-mono"
              @keydown.enter="runSearch"
            >
              <template #leading>
                <UIcon name="i-heroicons-magnifying-glass" class="w-4 h-4 text-gray-400" />
              </template>
            </UInput>
            <UButton :loading="searchLoading" icon="i-heroicons-play" @click="runSearch">
              실행
            </UButton>
          </div>

          <!-- 유사도 임계값 슬라이더 -->
          <div class="flex items-center gap-3">
            <span class="text-xs text-gray-500 w-24 shrink-0">유사도 임계값</span>
            <input
              v-model="threshold"
              type="range"
              min="0"
              max="1"
              step="0.05"
              class="flex-1 accent-violet-500"
            >
            <span class="text-xs font-mono font-medium text-violet-600 dark:text-violet-400 w-8 text-right">
              {{ threshold }}
            </span>
          </div>
        </div>

        <!-- 검색 에러 -->
        <div v-if="searchError" class="m-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex gap-2">
          <UIcon name="i-heroicons-exclamation-triangle" class="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <pre class="text-red-600 dark:text-red-400 text-xs whitespace-pre-wrap break-all">{{ searchError }}</pre>
        </div>

        <!-- 결과 헤더 -->
        <div v-if="searchResults.length || searchTime !== null" class="flex items-center gap-3 px-4 py-2 border-b border-(--ui-border) bg-gray-50 dark:bg-gray-900/50">
          <UBadge v-if="searchTime !== null" color="success" variant="subtle" class="font-mono">
            {{ searchTime }}ms
          </UBadge>
          <UBadge v-if="searchResults.length" color="neutral" variant="subtle">
            {{ searchResults.length }}건
          </UBadge>
          <span v-else-if="searchTime !== null" class="text-xs text-gray-400">결과 없음</span>
        </div>

        <!-- 검색 로딩 -->
        <div v-if="searchLoading" class="flex-1 flex items-center justify-center">
          <UIcon name="i-heroicons-arrow-path" class="w-6 h-6 text-gray-300 animate-spin" />
        </div>

        <!-- 검색 결과 테이블 -->
        <div v-else-if="searchResults.length" class="overflow-auto flex-1">
          <table class="w-full text-sm border-collapse">
            <thead>
              <tr>
                <th class="sticky top-0 z-10 px-3 py-2 text-left text-xs font-medium text-violet-600 dark:text-violet-400 bg-gray-50 dark:bg-gray-900 border-b border-(--ui-border) w-20">
                  유사도
                </th>
                <th
                  v-for="col in searchColumns.filter((c) => c !== '_similarity')"
                  :key="col"
                  class="sticky top-0 z-10 px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 border-b border-(--ui-border) whitespace-nowrap"
                >
                  {{ col }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(row, i) in searchResults"
                :key="i"
                class="hover:bg-violet-50 dark:hover:bg-violet-900/10 border-b border-(--ui-border) last:border-0"
              >
                <td class="px-3 py-1.5 font-mono text-xs font-semibold" :class="similarityColor(row['_similarity'])">
                  {{ Number(row['_similarity']).toFixed(3) }}
                </td>
                <td
                  v-for="col in searchColumns.filter((c) => c !== '_similarity')"
                  :key="col"
                  class="px-3 py-1.5 font-mono text-xs max-w-[200px] truncate"
                  :class="row[col] === null ? 'text-gray-400 italic' : ''"
                  :title="formatCell(row[col])"
                >
                  {{ formatCell(row[col]) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 초기 / 빈 상태 -->
        <div v-else-if="!searchLoading && searchTime === null" class="flex-1 flex flex-col items-center justify-center gap-3 text-gray-300 dark:text-gray-700">
          <UIcon name="i-heroicons-magnifying-glass-circle" class="w-10 h-10" />
          <p class="text-sm">검색어를 입력하고 실행하세요</p>
          <p class="text-xs opacity-60">
            similarity(col, '검색어') &gt;= {{ threshold }}
          </p>
        </div>
      </div>

    </div>
  </div>
</template>
