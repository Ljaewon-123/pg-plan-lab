<script setup lang="ts">
const colorMode = useColorMode()

const isDark = computed(() => colorMode.value === 'dark')

function toggleDark() {
  colorMode.preference = isDark.value ? 'light' : 'dark'
}

const items = [
  [
    { label: 'Home', icon: 'i-heroicons-home', to: '/' },
    { label: 'Explain', icon: 'i-heroicons-document-magnifying-glass', to: '/explain' },
    { label: 'Table', icon: 'i-heroicons-table-cells', to: '/pg/table' },
    { label: 'Tram', icon: 'i-heroicons-queue-list', to: '/pg/tram' },
    { label: 'Timeseries', icon: 'i-heroicons-chart-bar', to: '/pg/timeseries' },
  ],
]
</script>

<template>
  <header
    class="sticky top-0 z-50 border-b border-(--ui-border) bg-white/80 dark:bg-gray-900/80 backdrop-blur-md"
  >
    <div class="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-10">
      <div class="flex items-center justify-between h-16">
        <NuxtLink to="/" class="flex items-center gap-2 group">
          <UIcon
            name="i-heroicons-circle-stack"
            class="w-7 h-7 text-primary group-hover:rotate-12 transition-transform duration-200"
          />
          <span class="font-bold text-lg tracking-tight text-gray-900 dark:text-white">
            PG Plan Lab
          </span>
          <UBadge label="Lab" variant="subtle" size="sm" class="hidden sm:flex" />
        </NuxtLink>

        <UNavigationMenu :items="items" />

        <div class="flex items-center gap-2">
          <UTooltip text="GitHub">
            <UButton
              icon="i-heroicons-code-bracket"
              color="neutral"
              variant="ghost"
              size="sm"
              to="https://github.com"
              target="_blank"
            />
          </UTooltip>
          <UButton
            :icon="isDark ? 'i-heroicons-sun' : 'i-heroicons-moon'"
            color="neutral"
            variant="ghost"
            size="sm"
            @click="toggleDark"
          />
        </div>
      </div>
    </div>
  </header>
</template>
