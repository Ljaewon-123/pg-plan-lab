<script setup lang="ts">
import type { BenchResult } from '~/composables/use-bench'

const props = defineProps<{
  title: string
  sql: string
  result: BenchResult | null
  loading: boolean
  isFaster: boolean
}>()

const formattedSql = computed(() => props.sql.trim())
</script>

<template>
  <div
    class="flex flex-col rounded-lg border bg-white dark:bg-gray-950 overflow-hidden transition-colors"
    :class="
      isFaster
        ? 'border-green-400 dark:border-green-600 ring-1 ring-green-400/40'
        : 'border-(--ui-border)'
    "
  >
    <!-- 헤더 -->
    <div
      class="flex items-center justify-between px-3 py-2 border-b border-(--ui-border) bg-gray-50 dark:bg-gray-900"
    >
      <div class="flex items-center gap-2">
        <span class="text-xs font-medium text-gray-700 dark:text-gray-200">
          {{ title }}
        </span>
        <UBadge
          v-if="isFaster"
          label="Faster"
          color="success"
          variant="subtle"
          size="sm"
        />
      </div>
      <div v-if="result && !result.error" class="flex items-center gap-2">
        <UBadge
          :label="`${result.executionTime} ms`"
          :color="isFaster ? 'success' : 'neutral'"
          variant="subtle"
          size="sm"
        />
        <UBadge
          :label="`${result.rowCount}행`"
          color="neutral"
          variant="subtle"
          size="sm"
        />
      </div>
    </div>

    <!-- SQL 코드블록 -->
    <pre
      class="px-3 py-2 text-[11px] font-mono text-gray-700 dark:text-gray-300 bg-gray-50/40 dark:bg-gray-900/40 border-b border-(--ui-border) whitespace-pre-wrap overflow-x-auto"
    >{{ formattedSql }}</pre>

    <!-- 본문 -->
    <div class="flex-1 min-h-[120px]">
      <div
        v-if="loading"
        class="h-full flex items-center justify-center py-6"
      >
        <UIcon
          name="i-heroicons-arrow-path"
          class="w-5 h-5 text-gray-300 animate-spin"
        />
      </div>

      <div
        v-else-if="!result"
        class="h-full flex items-center justify-center py-6 text-xs text-gray-400"
      >
        실행 대기
      </div>

      <div
        v-else-if="result.error"
        class="m-3 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-xs text-red-600 dark:text-red-400 whitespace-pre-wrap break-all"
      >
        {{ result.error }}
      </div>

      <div v-else-if="!result.rows.length" class="p-3 text-xs text-gray-400">
        결과 행 없음
      </div>

      <div v-else class="overflow-auto max-h-[280px]">
        <table class="w-full text-xs border-collapse">
          <thead>
            <tr>
              <th
                v-for="col in result.columns"
                :key="col"
                class="sticky top-0 z-10 px-2 py-1.5 text-left font-medium text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 border-b border-(--ui-border) whitespace-nowrap"
              >
                {{ col }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(row, i) in result.rows.slice(0, 50)"
              :key="i"
              class="hover:bg-gray-50 dark:hover:bg-gray-800/50 border-b border-(--ui-border) last:border-0"
            >
              <td
                v-for="col in result.columns"
                :key="col"
                class="px-2 py-1 font-mono max-w-[260px] truncate"
                :title="formatCell(row[col])"
              >
                {{ formatCell(row[col]) }}
              </td>
            </tr>
          </tbody>
        </table>
        <div
          v-if="result.rows.length > 50"
          class="px-3 py-1.5 text-[10px] text-gray-400 border-t border-(--ui-border)"
        >
          상위 50행만 표시 ({{ result.rows.length }}행 중)
        </div>
      </div>
    </div>
  </div>
</template>
