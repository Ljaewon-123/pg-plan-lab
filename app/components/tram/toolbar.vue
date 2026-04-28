<script setup lang="ts">
const model = defineModel<string>({ default: '' })

defineProps<{
  options: { label: string; value: string }[]
  loading: boolean
}>()

const emit = defineEmits<{ refresh: []; add: [] }>()
</script>

<template>
  <div
    class="flex items-center gap-3 px-6 py-3 border-b border-(--ui-border) bg-gray-50 dark:bg-gray-900/50"
  >
    <UIcon
      name="i-heroicons-magnifying-glass-circle"
      class="w-5 h-5 text-primary-500"
    />
    <span class="font-semibold text-sm">pg_trgm 유사 검색</span>
    <UBadge label="Fuzzy Match" color="primary" variant="subtle" size="sm" />

    <div class="ml-4 flex items-center gap-2">
      <span class="text-xs text-gray-500">테이블</span>
      <USelect
        v-model="model"
        :items="options"
        placeholder="선택..."
        class="w-52"
        size="sm"
      />
    </div>

    <div v-if="model" class="ml-auto flex gap-2">
      <UButton
        size="sm"
        variant="outline"
        icon="i-heroicons-arrow-path"
        :loading="loading"
        @click="emit('refresh')"
      >
        새로고침
      </UButton>
      <UButton size="sm" icon="i-heroicons-plus" @click="emit('add')">
        행 추가
      </UButton>
    </div>
  </div>
</template>
