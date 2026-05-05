<script setup lang="ts">
interface PartitionRow {
  partition_name: string
  size: string
  approx_rows: string
}

const props = defineProps<{
  partitions: PartitionRow[]
  initialized: boolean
}>()

const { state, run } = useBench()

const SQL = {
  partitioned: `
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT count(*) AS rows, avg(value) AS avg_value
FROM metrics.metrics_partitioned
WHERE recorded_at >= '2026-04-15' AND recorded_at < '2026-04-16'
  `.trim(),
  unpartitioned: `
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT count(*) AS rows, avg(value) AS avg_value
FROM metrics.metrics_unpartitioned
WHERE recorded_at >= '2026-04-15' AND recorded_at < '2026-04-16'
  `.trim(),
}

async function runCompare() {
  await run(SQL.partitioned, SQL.unpartitioned)
}

const totalRows = computed(() =>
  props.partitions
    .reduce((acc, p) => acc + Number(p.approx_rows ?? 0), 0)
    .toLocaleString()
)
</script>

<template>
  <section class="border border-(--ui-border) rounded-lg overflow-hidden bg-white dark:bg-gray-950">
    <header class="px-4 py-3 border-b border-(--ui-border) bg-gray-50 dark:bg-gray-900">
      <div class="flex items-center gap-2">
        <UIcon name="i-heroicons-squares-2x2" class="w-5 h-5 text-primary" />
        <h2 class="text-sm font-semibold text-gray-900 dark:text-white">
          1. 선언적 파티셔닝
        </h2>
        <UBadge label="RANGE / Daily" color="primary" variant="subtle" size="sm" />
      </div>
      <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
        같은 WHERE 조건의 1일치 집계를 두 테이블에서 실행. 파티션 테이블은 해당 일자의 단일 자식만 스캔(파티션 프루닝),
        비파티션 테이블은 전체를 본다.
      </p>
    </header>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4">
      <!-- 좌: 파티션 목록 -->
      <div class="border border-(--ui-border) rounded-lg overflow-hidden bg-white dark:bg-gray-950 flex flex-col">
        <div class="px-3 py-2 border-b border-(--ui-border) bg-gray-50 dark:bg-gray-900 flex items-center justify-between">
          <span class="text-xs font-medium text-gray-700 dark:text-gray-200">
            파티션 목록
          </span>
          <div class="flex items-center gap-2">
            <UBadge :label="`${partitions.length}개`" variant="subtle" size="sm" />
            <UBadge :label="`${totalRows} 행`" color="neutral" variant="subtle" size="sm" />
          </div>
        </div>
        <div v-if="!initialized" class="p-6 text-center text-xs text-gray-400">
          데이터 시드 후 표시됩니다
        </div>
        <div v-else-if="!partitions.length" class="p-6 text-center text-xs text-gray-400">
          파티션이 없습니다
        </div>
        <div v-else class="overflow-auto max-h-[320px]">
          <table class="w-full text-xs border-collapse">
            <thead>
              <tr>
                <th class="sticky top-0 z-10 px-3 py-1.5 text-left font-medium text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 border-b border-(--ui-border)">
                  partition
                </th>
                <th class="sticky top-0 z-10 px-3 py-1.5 text-right font-medium text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 border-b border-(--ui-border)">
                  rows
                </th>
                <th class="sticky top-0 z-10 px-3 py-1.5 text-right font-medium text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 border-b border-(--ui-border)">
                  size
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="p in partitions"
                :key="p.partition_name"
                class="hover:bg-gray-50 dark:hover:bg-gray-800/50 border-b border-(--ui-border) last:border-0"
              >
                <td class="px-3 py-1 font-mono text-[11px]">{{ p.partition_name }}</td>
                <td class="px-3 py-1 font-mono text-[11px] text-right">
                  {{ Number(p.approx_rows).toLocaleString() }}
                </td>
                <td class="px-3 py-1 font-mono text-[11px] text-right">{{ p.size }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 우: 실행 비교 -->
      <div class="flex flex-col gap-3">
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium text-gray-700 dark:text-gray-200">
            EXPLAIN ANALYZE 비교
          </span>
          <UButton
            size="sm"
            icon="i-heroicons-play"
            :loading="state.loading"
            :disabled="!initialized"
            @click="runCompare"
          >
            실행
          </UButton>
        </div>

        <TimeseriesBenchCard
          title="Partitioned"
          :sql="SQL.partitioned"
          :result="state.a"
          :loading="state.loading"
          :is-faster="state.faster === 'a'"
        />
        <TimeseriesBenchCard
          title="Unpartitioned"
          :sql="SQL.unpartitioned"
          :result="state.b"
          :loading="state.loading"
          :is-faster="state.faster === 'b'"
        />

        <div
          v-if="state.speedup"
          class="px-3 py-2 rounded-md bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-xs text-green-700 dark:text-green-300"
        >
          파티션 프루닝으로 약 <b>{{ state.speedup }}배</b> 빠름
        </div>
      </div>
    </div>
  </section>
</template>
