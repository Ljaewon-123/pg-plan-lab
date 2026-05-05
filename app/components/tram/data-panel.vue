<script setup lang="ts">
const showAddRow = defineModel<boolean>('showAddRow', { default: false })

const props = defineProps<{
  selectedTable: string
  columns: string[]
  rows: Record<string, unknown>[]
  loading: boolean
  error: string
  addLoading: boolean
}>()

const emit = defineEmits<{
  delete: [row: Record<string, unknown>]
  save: [data: Record<string, string>]
}>()

const newRow = ref<Record<string, string>>({})

const formColumns = computed(() => props.columns.filter((c) => c !== 'id'))

watch(
  () => props.columns,
  (cols) => {
    newRow.value = Object.fromEntries(cols.map((c) => [c, '']))
  }
)

function handleSave() {
  emit('save', { ...newRow.value })
}
</script>

<template>
  <div
    class="flex flex-col w-1/2 border-r border-(--ui-border) overflow-hidden"
  >
    <!-- 헤더 -->
    <div
      class="px-4 py-2 border-b border-(--ui-border) bg-white dark:bg-gray-950 flex items-center gap-2"
    >
      <span class="text-xs font-medium text-gray-500 uppercase tracking-wider">
        데이터
      </span>
      <UBadge
        v-if="rows.length"
        :label="`${rows.length}행`"
        color="neutral"
        variant="subtle"
        size="sm"
      />
    </div>

    <!-- 에러 -->
    <div
      v-if="error"
      class="m-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex gap-2"
    >
      <UIcon
        name="i-heroicons-exclamation-triangle"
        class="w-4 h-4 text-red-500 shrink-0 mt-0.5"
      />
      <pre class="text-red-600 dark:text-red-400 text-xs whitespace-pre-wrap break-all">{{ error }}</pre>
    </div>

    <!-- 행 추가 폼 -->
    <div
      v-if="showAddRow && columns.length"
      class="p-3 border-b border-(--ui-border) bg-blue-50 dark:bg-blue-900/10 space-y-2"
    >
      <div class="text-xs font-medium text-blue-600 dark:text-blue-400 mb-2">
        새 행 입력
        <span
          v-if="columns.includes('id')"
          class="ml-2 text-[10px] font-normal text-gray-500"
        >
          id는 ULID로 자동 생성됩니다
        </span>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <div v-for="col in formColumns" :key="col" class="flex flex-col gap-1">
          <label class="text-xs text-gray-500 font-mono">{{ col }}</label>
          <UInput
            v-model="newRow[col]"
            :placeholder="col"
            size="sm"
            class="font-mono"
          />
        </div>
      </div>
      <div class="flex gap-2 pt-1">
        <UButton size="sm" :loading="addLoading" @click="handleSave">
          저장
        </UButton>
        <UButton
          size="sm"
          color="neutral"
          variant="ghost"
          @click="showAddRow = false"
        >
          취소
        </UButton>
      </div>
    </div>

    <!-- 로딩 -->
    <div v-if="loading" class="flex-1 flex items-center justify-center">
      <UIcon
        name="i-heroicons-arrow-path"
        class="w-6 h-6 text-gray-300 animate-spin"
      />
    </div>

    <!-- 빈 상태: 테이블 미선택 -->
    <div
      v-else-if="!selectedTable"
      class="flex-1 flex items-center justify-center text-gray-300 dark:text-gray-700 text-sm"
    >
      테이블을 선택하세요
    </div>

    <!-- 빈 상태: 데이터 없음 -->
    <div
      v-else-if="!rows.length"
      class="flex-1 flex items-center justify-center text-gray-400 text-sm"
    >
      데이터가 없습니다
    </div>

    <!-- 데이터 테이블 -->
    <div v-else class="overflow-auto flex-1">
      <table class="w-full text-sm border-collapse">
        <thead>
          <tr>
            <th
              v-for="col in columns"
              :key="col"
              class="sticky top-0 z-10 px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 border-b border-(--ui-border) whitespace-nowrap"
            >
              {{ col }}
            </th>
            <th
              class="sticky top-0 z-10 px-2 py-2 bg-gray-50 dark:bg-gray-900 border-b border-(--ui-border) w-10"
            />
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, i) in rows"
            :key="i"
            class="group hover:bg-gray-50 dark:hover:bg-gray-800/50 border-b border-(--ui-border) last:border-0"
          >
            <td
              v-for="col in columns"
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
                @click="emit('delete', row)"
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
