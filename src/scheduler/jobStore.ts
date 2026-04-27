import type { ScheduledTask } from 'node-cron'

const store = new Map<number, ScheduledTask>()

export function addJob(matchId: number, task: ScheduledTask): void {
  const existing = store.get(matchId)
  if (existing) existing.stop()
  store.set(matchId, task)
}

export function clearAll(): void {
  for (const task of store.values()) task.stop()
  store.clear()
}

export function size(): number {
  return store.size
}
