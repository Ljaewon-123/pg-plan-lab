<script setup lang="ts">
interface IndexRow {
  index_name: string
  table_name: string
  index_type: string
  size: string
  size_bytes: string
}

const props = defineProps<{
  indexes: IndexRow[]
  initialized: boolean
}>()

const partIndexes = computed(() =>
  props.indexes.filter((i) => i.table_name === 'metrics_partitioned')
)

const maxBytes = computed(() =>
  partIndexes.value.reduce((m, i) => Math.max(m, Number(i.size_bytes ?? 0)), 1)
)

function widthPct(bytes: string): string {
  const v = Number(bytes ?? 0)
  return `${Math.max(2, (v / maxBytes.value) * 100).toFixed(1)}%`
}

const { state, run } = useBench()

const SQL = {
  btree: `
SET LOCAL enable_bitmapscan = off;
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT count(*) FROM metrics.metrics_partitioned
WHERE recorded_at >= '2026-04-15' AND recorded_at < '2026-04-22'
  `.trim(),
  brin: `
SET LOCAL enable_indexscan = off;
SET LOCAL enable_seqscan   = off;
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT count(*) FROM metrics.metrics_partitioned
WHERE recorded_at >= '2026-04-15' AND recorded_at < '2026-04-22'
  `.trim(),
}

async function runCompare() {
  await run(SQL.btree, SQL.brin)
}
</script>

<template>
  <section class="border border-(--ui-border) rounded-lg overflow-hidden bg-white dark:bg-gray-950">
    <header class="px-4 py-3 border-b border-(--ui-border) bg-gray-50 dark:bg-gray-900">
      <div class="flex items-center gap-2">
        <UIcon name="i-heroicons-bars-3-bottom-left" class="w-5 h-5 text-primary" />
        <h2 class="text-sm font-semibold text-gray-900 dark:text-white">
          2. BRIN 인덱스
        </h2>
        <UBadge label="Block Range" color="primary" variant="subtle" size="sm" />
      </div>
      <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
        시간순으로 누적되는 데이터처럼 <em>물리 정렬</em>이 자연스러운 컬럼에서, BRIN은 BTREE의 수십~수백 배 작은 인덱스로 충분한
        범위 스캔 성능을 낸다. 동일 테이블에 두 인덱스를 두고 사이즈와 강제 실행 계획을 비교한다.
      </p>
    </header>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4">
      <!-- 좌: 인덱스 사이즈 비교 -->
      <div class="border border-(--ui-border) rounded-lg overflow-hidden bg-white dark:bg-gray-950">
        <div class="px-3 py-2 border-b border-(--ui-border) bg-gray-50 dark:bg-gray-900">
          <span class="text-xs font-medium text-gray-700 dark:text-gray-200">
            인덱스 사이즈 (metrics_partitioned)
          </span>
        </div>
        <div v-if="!initialized" class="p-6 text-center text-xs text-gray-400">
          데이터 시드 후 표시됩니다
        </div>
        <div v-else-if="!partIndexes.length" class="p-6 text-center text-xs text-gray-400">
          인덱스가 없습니다
        </div>
        <ul v-else class="divide-y divide-(--ui-border)">
          <li v-for="i in partIndexes" :key="i.index_name" class="p-3">
            <div class="flex items-center justify-between text-xs mb-1.5">
              <div class="flex items-center gap-2 font-mono">
                <UBadge
                  :label="i.index_type.toUpperCase()"
                  :color="i.index_type === 'brin' ? 'success' : 'neutral'"
                  variant="subtle"
                  size="sm"
                />
                <span class="text-gray-700 dark:text-gray-300">{{ i.index_name }}</span>
              </div>
              <span class="font-mono font-medium text-gray-900 dark:text-white">
                {{ i.size }}
              </span>
            </div>
            <div class="h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
              <div
                class="h-full rounded-full"
                :class="
                  i.index_type === 'brin'
                    ? 'bg-green-500'
                    : 'bg-gray-400 dark:bg-gray-500'
                "
                :style="{ width: widthPct(i.size_bytes) }"
              />
            </div>
          </li>
        </ul>
      </div>

      <!-- 우: 실행 비교 -->
      <div class="flex flex-col gap-3">
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium text-gray-700 dark:text-gray-200">
            EXPLAIN ANALYZE — 7일 범위 (강제 실행 계획)
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
          title="BTREE forced"
          :sql="SQL.btree"
          :result="state.a"
          :loading="state.loading"
          :is-faster="state.faster === 'a'"
        />
        <TimeseriesBenchCard
          title="BRIN forced"
          :sql="SQL.brin"
          :result="state.b"
          :loading="state.loading"
          :is-faster="state.faster === 'b'"
        />
      </div>
    </div>
  </section>
</template>
