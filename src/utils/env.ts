export function parseGroupJids(val: string | undefined): string[] {
  if (!val?.trim()) return []
  return val.split(',').map(s => s.trim()).filter(Boolean)
}
