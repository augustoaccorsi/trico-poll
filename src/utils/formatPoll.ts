import type { ForzaMatch } from '../api/types'

const TZ = process.env.TZ_BRASILIA ?? 'America/Sao_Paulo'
const GREMIO_ID = parseInt(process.env.FORZA_TEAM_ID ?? '17474', 10)
const FLAG = '🇪🇪'

function titleName(team: { id: number; name: string }, side: 'home' | 'away'): string {
  if (team.id !== GREMIO_ID) return team.name
  return side === 'home' ? `${FLAG} ${team.name}` : `${team.name} ${FLAG}`
}

function optionName(team: { id: number; name: string }): string {
  if (team.id !== GREMIO_ID) return team.name
  return `${FLAG} ${team.name}`
}

export function buildPollQuestion(match: ForzaMatch): string {
  const date = new Date(match.kickoff_at)
  const timeStr = date.toLocaleTimeString('pt-BR', {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  // Convert "16:00" to "16h" or "16:30" to "16h30"
  const [h, m] = timeStr.split(':')
  const hour = m === '00' ? `${h}h` : `${h}h${m}`

  const home = titleName(match.home_team, 'home')
  const away = titleName(match.away_team, 'away')
  return `${home} x ${away} - Quem vence? (${hour})`
}

export function buildPollOptions(match: ForzaMatch): string[] {
  return [optionName(match.home_team), optionName(match.away_team), 'Empate']
}
