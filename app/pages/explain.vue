<script setup lang="ts">
// pev2는 DOM 접근이 있어서 클라이언트에서만 로드
const PlanViz = defineAsyncComponent(() =>
  import('pev2').then((m) => m.Plan),
)

const query = ref('SELECT * FROM pg_tables LIMIT 10')
const planSource = ref('')
const planQuery = ref('')
const loading = ref(false)
const errorMsg = ref('')

async function runExplain() {
  errorMsg.value = ''
  planSource.value = ''
  loading.value = true
  try {
    const result = await $fetch<{ plan: string }>('/api/explain', {
      method: 'POST',
      body: { query: query.value },
    })
    planSource.value = result.plan
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

    <UButton :loading="loading" @click="runExplain">
      EXPLAIN ANALYZE
    </UButton>

    <p v-if="errorMsg" class="text-red-500 font-mono text-sm">{{ errorMsg }}</p>

    <ClientOnly>
      <div v-if="planSource" class="border rounded overflow-auto" style="min-height: 400px">
        <PlanViz :plan-source="planSource" :plan-query="planQuery" />
      </div>
    </ClientOnly>
  </div>
</template>
