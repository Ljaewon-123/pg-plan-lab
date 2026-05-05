<script setup lang="ts">
const { stats, loadStats } = useTimeseriesStats()
const { state, result, error, seed: doSeed, reset: doReset } = useTimeseriesSeed()

onMounted(loadStats)

async function seed() {
  await doSeed()
  await loadStats()
}

async function reset() {
  await doReset()
  await loadStats()
}
</script>

<template>
  <div class="flex-1 flex flex-col overflow-hidden">
    <TimeseriesToolbar
      :initialized="stats.initialized"
      :state="state"
      :table-sizes="stats.tableSizes"
      :partition-count="stats.partitions.length"
      :insert-ms="result?.insertMs ?? null"
      :total-rows="result?.totalRows ?? null"
      :error="error"
      @seed="seed"
      @reset="reset"
    />

    <div class="flex-1 overflow-auto">
      <div class="max-w-[1600px] mx-auto px-4 py-4 flex flex-col gap-4">
        <TimeseriesPartitionSection
          :partitions="stats.partitions"
          :initialized="stats.initialized"
        />

        <TimeseriesBrinSection
          :indexes="stats.indexes"
          :initialized="stats.initialized"
        />

        <TimeseriesMatviewSection
          :matview="stats.matview"
          :initialized="stats.initialized"
        />
      </div>
    </div>
  </div>
</template>
