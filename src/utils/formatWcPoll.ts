import type { ForzaMatch, ForzaTeam } from '../api/types'
import { getCountryEmoji } from './countryEmojis'
import { getCountryName } from './countryNames'

const TZ = process.env.TZ_BRASILIA ?? 'America/Sao_Paulo'

function titleName(team: ForzaTeam, side: 'home' | 'away'): string {
  const emoji = getCountryEmoji(team.name)
  const name = getCountryName(team.name)
  return side === 'home' ? `${emoji} ${name}` : `${name} ${emoji}`
}

function optionName(team: ForzaTeam): string {
  return `${getCountryEmoji(team.name)} ${getCountryName(team.name)}`
}

export function buildWcPollQuestion(match: ForzaMatch): string {
  const date = new Date(match.kickoff_at)
  const timeStr = date.toLocaleTimeString('pt-BR', {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const [h, m] = timeStr.split(':')
  const hour = m === '00' ? `${h}h` : `${h}h${m}`

  const home = titleName(match.home_team, 'home')
  const away = titleName(match.away_team, 'away')
  return `${home} x ${away} - Quem vence? (${hour})`
}

export function buildWcPollOptions(match: ForzaMatch): string[] {
  return [optionName(match.home_team), optionName(match.away_team), 'Empate']
}
