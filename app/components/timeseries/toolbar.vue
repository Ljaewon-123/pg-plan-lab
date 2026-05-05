<script setup lang="ts">
interface TableSize {
  table_name: string
  total_size: string
  approx_rows: string
}

const props = defineProps<{
  initialized: boolean
  state: 'idle' | 'seeding' | 'resetting' | 'done'
  tableSizes: TableSize[]
  partitionCount: number
  insertMs: number | null
  totalRows: number | null
  error: string
}>()

const emit = defineEmits<{
  seed: []
  reset: []
}>()

const showResetModal = ref(false)

const totalSize = computed(() => {
  const part = props.tableSizes.find((t) => t.table_name === 'metrics_partitioned')
  return part?.total_size ?? '-'
})

const partitionedRows = computed(() => {
  const part = props.tableSizes.find((t) => t.table_name === 'metrics_partitioned')
  return part ? Number(part.approx_rows).toLocaleString() : '-'
})

function confirmReset() {
  showResetModal.value = false
  emit('reset')
}
</script>

<template>
  <div
    class="flex items-center gap-3 px-4 py-2.5 border-b border-(--ui-border) bg-white dark:bg-gray-950"
  >
    <UIcon name="i-heroicons-chart-bar" class="w-5 h-5 text-primary" />
    <h1 class="text-sm font-semibold text-gray-900 dark:text-white">
      Timeseries Lab
    </h1>
    <UBadge label="metrics 스키마" variant="subtle" size="sm" />

    <div class="flex-1" />

    <!-- 통계 -->
    <div
      v-if="initialized && state !== 'resetting'"
      class="flex items-center gap-2 text-xs"
    >
      <UBadge
        :label="`${partitionedRows} 행`"
        color="neutral"
        variant="subtle"
        size="sm"
      />
      <UBadge
        :label="`${partitionCount} 파티션`"
        color="neutral"
        variant="subtle"
        size="sm"
      />
      <UBadge :label="totalSize" color="neutral" variant="subtle" size="sm" />
      <UBadge
        v-if="insertMs !== null"
        :label="`INSERT ${insertMs} ms`"
        color="success"
        variant="subtle"
        size="sm"
      />
    </div>
    <div
      v-else-if="state === 'seeding'"
      class="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400"
    >
      <UIcon name="i-heroicons-arrow-path" class="w-4 h-4 animate-spin" />
      <span>데이터 시드 중… (수십초 소요)</span>
    </div>
    <div
      v-else-if="state === 'resetting'"
      class="flex items-center gap-2 text-xs text-red-600 dark:text-red-400"
    >
      <UIcon name="i-heroicons-arrow-path" class="w-4 h-4 animate-spin" />
      <span>스키마 삭제 중…</span>
    </div>
    <div
      v-else
      class="text-xs text-gray-400"
    >
      데모 데이터 없음
    </div>

    <!-- 버튼 -->
    <UButton
      size="sm"
      icon="i-heroicons-play-circle"
      :loading="state === 'seeding'"
      :disabled="state !== 'idle'"
      @click="emit('seed')"
    >
      Seed
    </UButton>

    <UButton
      size="sm"
      color="error"
      variant="outline"
      icon="i-heroicons-trash"
      :loading="state === 'resetting'"
      :disabled="!initialized || state === 'seeding' || state === 'resetting'"
      @click="showResetModal = true"
    >
      Reset
    </UButton>

    <UModal
      v-model:open="showResetModal"
      title="데모 데이터 삭제"
      description="metrics 스키마 전체를 DROP합니다. 다른 테이블(public.tram 등)은 영향받지 않습니다."
    >
      <template #footer>
        <div class="flex justify-end gap-2 w-full">
          <UButton
            size="sm"
            color="neutral"
            variant="ghost"
            @click="showResetModal = false"
          >
            취소
          </UButton>
          <UButton size="sm" color="error" @click="confirmReset">
            삭제
          </UButton>
        </div>
      </template>
    </UModal>

    <!-- 에러 (toolbar 아래로 표시) -->
    <div
      v-if="error"
      class="absolute left-4 right-4 top-full mt-1 px-3 py-1.5 text-xs rounded bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 break-all"
    >
      {{ error }}
    </div>
  </div>
</template>
