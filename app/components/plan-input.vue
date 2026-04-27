<script setup lang="ts">
const query = ref('SELECT * FROM pg_tables LIMIT 10')
const { source, query: planQuery } = useQuery()
const loading = ref(false)
const errorMsg = ref('')

async function runExplain() {
  errorMsg.value = ''
  source.value = ''
  loading.value = true
  try {
    const result = await $fetch<{ plan: string }>('/api/explain', {
      method: 'POST',
      body: { query: query.value },
    })
    source.value = result.plan
    planQuery.value = query.value
  } catch (e: unknown) {
    const err = e as { data?: { message?: string }; message?: string }
    errorMsg.value = err.data?.message ?? err.message ?? 'Unknown error'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="p-6 space-y-4 max-w-full">
    <h1 class="text-2xl font-bold">Query Plan Visualizer</h1>

    <textarea
      v-model="query"
      class="w-full h-32 font-mono text-sm border rounded p-2 focus:outline-none focus:ring-2"
      placeholder="Enter SQL query..."
      spellcheck="false"
    />

    <UButton :loading="loading" @click="runExplain"> EXPLAIN ANALYZE </UButton>

    <p v-if="errorMsg" class="text-red-500 font-mono text-sm">{{ errorMsg }}</p>

    <slot />
  </div>
</template>
