<script setup lang="ts">
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart } from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  DataZoomComponent,
} from 'echarts/components'
import VChart, { THEME_KEY } from 'vue-echarts'

use([
  CanvasRenderer,
  LineChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  DataZoomComponent,
])

const props = defineProps<{
  rows: Record<string, unknown>[]
  xKey: string
  yKey: string
  seriesKey?: string
  title?: string
  height?: number
}>()

const colorMode = useColorMode()
provide(THEME_KEY, computed(() => (colorMode.value === 'dark' ? 'dark' : '')))

const series = computed(() => {
  if (!props.seriesKey) {
    const data = props.rows.map((r) => [
      String(r[props.xKey] ?? ''),
      Number(r[props.yKey] ?? 0),
    ])
    return [{ name: props.yKey, type: 'line', data, smooth: true, showSymbol: false }]
  }

  const groups = new Map<string, [string, number][]>()
  for (const r of props.rows) {
    const key = String(r[props.seriesKey] ?? '')
    const x = String(r[props.xKey] ?? '')
    const y = Number(r[props.yKey] ?? 0)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push([x, y])
  }
  return Array.from(groups.entries()).map(([name, data]) => ({
    name,
    type: 'line' as const,
    data,
    smooth: true,
    showSymbol: false,
  }))
})

const option = computed(() => ({
  title: props.title
    ? { text: props.title, textStyle: { fontSize: 12, fontWeight: 'normal' } }
    : undefined,
  grid: { top: 30, right: 24, bottom: 40, left: 48 },
  tooltip: { trigger: 'axis' },
  legend: { type: 'scroll', top: 0, right: 0, textStyle: { fontSize: 10 } },
  xAxis: { type: 'category', boundaryGap: false, axisLabel: { fontSize: 10 } },
  yAxis: { type: 'value', axisLabel: { fontSize: 10 } },
  dataZoom: [{ type: 'inside' }, { type: 'slider', height: 16, bottom: 4 }],
  series: series.value,
}))
</script>

<template>
  <ClientOnly>
    <VChart
      :option="option"
      :style="{ height: `${height ?? 280}px`, width: '100%' }"
      autoresize
    />
    <template #fallback>
      <div
        :style="{ height: `${height ?? 280}px` }"
        class="flex items-center justify-center text-xs text-gray-400"
      >
        차트 로딩 중…
      </div>
    </template>
  </ClientOnly>
</template>
