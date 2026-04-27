<script setup lang="ts">
import 'pev2/dist/pev2.css'

const PlanViz = defineAsyncComponent(() => import('pev2').then((m) => m.Plan))

const { source, query: planQuery } = useQuery()
</script>

<template>
  <div class="flex-1 flex flex-col overflow-hidden">
    <PlanInput />
    <div class="px-6 pb-6 flex-1 flex flex-col overflow-hidden">
      <ClientOnly>
        <div
          v-if="source"
          class="border border-(--ui-border) rounded-lg overflow-auto flex-1 min-h-0"
        >
          <PlanViz :plan-source="source" :plan-query="planQuery" />
        </div>
      </ClientOnly>
    </div>
  </div>
</template>
