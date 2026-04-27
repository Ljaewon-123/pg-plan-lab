<script setup lang="ts">
const props = defineProps<{
  selectedTable: string
  tableColumns: string[]
}>()

const selectedTableRef = toRef(props, 'selectedTable')
const { searchQuery, searchLoading, searchError, searchResults, searchColumns, searchTime, runSearch } =
  useTramSearch(selectedTableRef)

const searchColumn = ref('')
const threshold = ref(0.3)

watch(
  () => props.tableColumns,
  (cols) => {
    searchColumn.value = cols[0] ?? ''
  }
)

function handleSearch() {
  runSearch(searchColumn.value, threshold.value)
}
</script>

<template>
  <div class="flex flex-col w-1/2 overflow-hidden">
    <!-- 헤더 -->
    <div
      class="px-4 py-2 border-b border-(--ui-border) bg-white dark:bg-gray-950 flex items-center gap-2"
    >
      <span class="text-xs font-medium text-gray-500 uppercase tracking-wider">
        유사 검색
      </span>
      <UBadge label="pg_trgm" color="primary" variant="subtle" size="sm" />
    </div>

    <!-- 검색 설정 -->
    <div
      class="p-4 border-b border-(--ui-border) space-y-4 bg-white dark:bg-gray-950"
    >
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
          @keydown.enter="handleSearch"
        >
          <template #leading>
            <UIcon
              name="i-heroicons-magnifying-glass"
              class="w-4 h-4 text-gray-400"
            />
          </template>
        </UInput>
        <UButton :loading="searchLoading" icon="i-heroicons-play" @click="handleSearch">
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
        />
        <span
          class="text-xs font-mono font-medium text-violet-600 dark:text-violet-400 w-8 text-right"
        >
          {{ threshold }}
        </span>
      </div>
    </div>

    <!-- 검색 에러 -->
    <div
      v-if="searchError"
      class="m-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex gap-2"
    >
      <UIcon
        name="i-heroicons-exclamation-triangle"
        class="w-4 h-4 text-red-500 shrink-0 mt-0.5"
      />
      <pre class="text-red-600 dark:text-red-400 text-xs whitespace-pre-wrap break-all">{{ searchError }}</pre>
    </div>

    <!-- 결과 헤더 -->
    <div
      v-if="searchResults.length || searchTime !== null"
      class="flex items-center gap-3 px-4 py-2 border-b border-(--ui-border) bg-gray-50 dark:bg-gray-900/50"
    >
      <UBadge
        v-if="searchTime !== null"
        color="success"
        variant="subtle"
        class="font-mono"
      >
        {{ searchTime }}ms
      </UBadge>
      <UBadge v-if="searchResults.length" color="neutral" variant="subtle">
        {{ searchResults.length }}건
      </UBadge>
      <span v-else-if="searchTime !== null" class="text-xs text-gray-400">
        결과 없음
      </span>
    </div>

    <!-- 검색 로딩 -->
    <div
      v-if="searchLoading"
      class="flex-1 flex items-center justify-center"
    >
      <UIcon
        name="i-heroicons-arrow-path"
        class="w-6 h-6 text-gray-300 animate-spin"
      />
    </div>

    <!-- 검색 결과 테이블 -->
    <div v-else-if="searchResults.length" class="overflow-auto flex-1">
      <table class="w-full text-sm border-collapse">
        <thead>
          <tr>
            <th
              class="sticky top-0 z-10 px-3 py-2 text-left text-xs font-medium text-violet-600 dark:text-violet-400 bg-gray-50 dark:bg-gray-900 border-b border-(--ui-border) w-20"
            >
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
            <td
              class="px-3 py-1.5 font-mono text-xs font-semibold"
              :class="similarityColor(row['_similarity'])"
            >
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
    <div
      v-else-if="!searchLoading && searchTime === null"
      class="flex-1 flex flex-col items-center justify-center gap-3 text-gray-300 dark:text-gray-700"
    >
      <UIcon name="i-heroicons-magnifying-glass-circle" class="w-10 h-10" />
      <p class="text-sm">검색어를 입력하고 실행하세요</p>
      <p class="text-xs opacity-60">
        similarity(col, '검색어') &gt;= {{ threshold }}
      </p>
    </div>
  </div>
</template>
