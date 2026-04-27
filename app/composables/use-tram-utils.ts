export function formatCell(val: unknown): string {
  if (val === null || val === undefined) return 'NULL'
  if (typeof val === 'object') return JSON.stringify(val)
  if (typeof val === 'number')
    return Number(val)
      .toFixed(4)
      .replace(/\.?0+$/, '')
  return String(val)
}

export function similarityColor(val: unknown): string {
  const n = Number(val)
  if (n >= 0.7) return 'text-green-600 dark:text-green-400'
  if (n >= 0.4) return 'text-yellow-600 dark:text-yellow-400'
  return 'text-red-500 dark:text-red-400'
}
