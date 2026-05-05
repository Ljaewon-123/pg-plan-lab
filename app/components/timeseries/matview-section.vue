<script setup lang="ts">
interface MatviewRow {
  name: string
  size: string
  definition: string
}

const props = defineProps<{
  matview: MatviewRow | null
  initialized: boolean
}>()

const { state, run } = useBench()
const refreshing = ref(false)
const refreshMs = ref<number | null>(null)
const refreshError = ref('')

const SQL = {
  raw: `
SELECT date_trunc('hour', recorded_at) AS hour,
       device_id,
       metric_name,
       avg(value)::numeric(10,4) AS avg_value
FROM   metrics.metrics_partitioned
WHERE  recorded_at >= '2026-04-15' AND recorded_at < '2026-04-22'
GROUP  BY 1, 2, 3
ORDER  BY 1, 2, 3
  `.trim(),
  mv: `
SELECT hour, device_id, metric_name, avg_value
FROM   metrics.metrics_hourly_avg
WHERE  hour >= '2026-04-15' AND hour < '2026-04-22'
ORDER  BY 1, 2, 3
  `.trim(),
}

async function runCompare() {
  await run(SQL.raw, SQL.mv)
}

async function refreshMv() {
  refreshing.value = true
  refreshError.value = ''
  try {
    const r = await $fetch<{ executionTime: number }>('/api/query', {
      method: 'POST',
      body: { query: 'REFRESH MATERIALIZED VIEW metrics.metrics_hourly_avg' },
    })
    refreshMs.value = r.executionTime
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    refreshError.value = err.data?.message ?? err.message ?? 'Unknown error'
  } finally {
    refreshing.value = false
  }
}

const cpuChartRows = computed(() => {
  const rows = state.value.b?.rows ?? []
  return rows.filter((r) => r.metric_name === 'cpu')
})
</script>

<template>
  <section class="border border-(--ui-border) rounded-lg overflow-hidden bg-white dark:bg-gray-950">
    <header class="px-4 py-3 border-b border-(--ui-border) bg-gray-50 dark:bg-gray-900">
      <div class="flex items-center gap-2">
        <UIcon name="i-heroicons-rectangle-stack" class="w-5 h-5 text-primary" />
        <h2 class="text-sm font-semibold text-gray-900 dark:text-white">
          3. Materialized View
        </h2>
        <UBadge label="Hourly Aggregate" color="primary" variant="subtle" size="sm" />
      </div>
      <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
        대시보드용 무거운 시간 단위 집계를 사전에 저장. 동일 결과를 raw GROUP BY와 MV 단순 SELECT로 비교한다.
        REFRESH는 변경분이 쌓였을 때만 수동 또는 스케줄로.
      </p>
    </header>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4">
      <!-- 좌: MV 정의 + 새로고침 -->
      <div class="border border-(--ui-border) rounded-lg overflow-hidden bg-white dark:bg-gray-950 flex flex-col">
        <div class="flex items-center justify-between px-3 py-2 border-b border-(--ui-border) bg-gray-50 dark:bg-gray-900">
          <span class="text-xs font-medium text-gray-700 dark:text-gray-200">
            View 정의
          </span>
          <div class="flex items-center gap-2">
            <UBadge
              v-if="matview"
              :label="matview.size"
              variant="subtle"
              size="sm"
            />
            <UButton
              size="xs"
              icon="i-heroicons-arrow-path"
              variant="outline"
              :loading="refreshing"
              :disabled="!initialized"
              @click="refreshMv"
            >
              REFRESH
            </UButton>
          </div>
        </div>
        <div v-if="!initialized" class="p-6 text-center text-xs text-gray-400">
          데이터 시드 후 표시됩니다
        </div>
        <pre
          v-else-if="matview"
          class="px-3 py-2 text-[11px] font-mono text-gray-700 dark:text-gray-300 whitespace-pre-wrap overflow-x-auto"
        >{{ matview.definition }}</pre>
        <div v-else class="p-6 text-center text-xs text-gray-400">
          MV가 없습니다
        </div>
        <div
          v-if="refreshMs !== null"
          class="px-3 py-1.5 text-xs border-t border-(--ui-border) text-gray-600 dark:text-gray-400"
        >
          REFRESH 완료 — <b>{{ refreshMs }} ms</b>
        </div>
        <div
          v-if="refreshError"
          class="px-3 py-1.5 text-xs border-t border-(--ui-border) text-red-600 dark:text-red-400 break-all"
        >
          {{ refreshError }}
        </div>
      </div>

      <!-- 우: 비교 실행 -->
      <div class="flex flex-col gap-3">
        <div class="flex items-center justify-between">
          <span class="text-xs font-medium text-gray-700 dark:text-gray-200">
            7일 시간 단위 집계 비교
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
          title="Raw aggregate"
          :sql="SQL.raw"
          :result="state.a"
          :loading="state.loading"
          :is-faster="state.faster === 'a'"
        />
        <TimeseriesBenchCard
          title="Materialized View"
          :sql="SQL.mv"
          :result="state.b"
          :loading="state.loading"
          :is-faster="state.faster === 'b'"
        />

        <div
          v-if="state.speedup"
          class="px-3 py-2 rounded-md bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-xs text-green-700 dark:text-green-300"
        >
          MV 조회가 약 <b>{{ state.speedup }}배</b> 빠름
        </div>
      </div>
    </div>

    <!-- 차트: MV 결과 시각화 -->
    <div
      v-if="cpuChartRows.length"
      class="border-t border-(--ui-border) p-4 bg-white dark:bg-gray-950"
    >
      <div class="text-xs font-medium text-gray-700 dark:text-gray-200 mb-2">
        시각화 — cpu 메트릭 시간별 평균 (디바이스별)
      </div>
      <TimeseriesMetricChart
        :rows="cpuChartRows"
        x-key="hour"
        y-key="avg_value"
        series-key="device_id"
        :height="320"
      />
    </div>
  </section>
</template>
