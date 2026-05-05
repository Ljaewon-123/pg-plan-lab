type SeedState = 'idle' | 'seeding' | 'resetting' | 'done'

interface SeedResult {
  totalRows: number
  insertMs: number
  elapsedMs: number
}

export function useTimeseriesSeed() {
  const state = ref<SeedState>('idle')
  const result = ref<SeedResult | null>(null)
  const error = ref('')

  async function seed() {
    state.value = 'seeding'
    error.value = ''
    try {
      result.value = await $fetch<SeedResult>('/api/timeseries-seed', {
        method: 'POST',
      })
      state.value = 'done'
    } catch (e: unknown) {
      const err = e as { data?: { message?: string }; message?: string }
      error.value = err.data?.message ?? err.message ?? 'Unknown error'
      state.value = 'idle'
    }
  }

  async function reset() {
    state.value = 'resetting'
    error.value = ''
    try {
      await $fetch('/api/timeseries-reset', { method: 'POST' })
      result.value = null
      state.value = 'idle'
    } catch (e: unknown) {
      const err = e as { data?: { message?: string }; message?: string }
      error.value = err.data?.message ?? err.message ?? 'Unknown error'
      state.value = 'done'
    }
  }

  return { state, result, error, seed, reset }
}
