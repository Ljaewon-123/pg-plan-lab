import { ulid } from 'ulid'

export function useUlid(): string {
  return ulid()
}
