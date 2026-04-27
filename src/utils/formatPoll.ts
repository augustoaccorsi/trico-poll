import type { ForzaMatch } from '../api/types'

const TZ = process.env.TZ_BRASILIA ?? 'America/Sao_Paulo'

export function buildPollQuestion(match: ForzaMatch): string {
  const date = new Date(match.kickoff_at * 1000)
  const timeStr = date.toLocaleTimeString('pt-BR', {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  // Convert "16:00" to "16h" or "16:30" to "16h30"
  const [h, m] = timeStr.split(':')
  const hour = m === '00' ? `${h}h` : `${h}h${m}`

  return `${match.home_team.name} x ${match.away_team.name} - Quem vence? (${hour})`
}

export function buildPollOptions(match: ForzaMatch): string[] {
  return [match.home_team.name, match.away_team.name, 'Empate']
}
