import type { ForzaMatch } from '../api/types'
import { getTeamEmoji } from './teamEmojis'

const TZ = process.env.TZ_BRASILIA ?? 'America/Sao_Paulo'

function titleName(team: { id: number; name: string }, side: 'home' | 'away'): string {
  const emoji = getTeamEmoji(team.name)
  return side === 'home' ? `${emoji} ${team.name}` : `${team.name} ${emoji}`
}

function optionName(team: { id: number; name: string }): string {
  return `${getTeamEmoji(team.name)} ${team.name}`
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
