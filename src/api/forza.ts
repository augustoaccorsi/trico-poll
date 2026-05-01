import { decode as msgpackDecode } from '@msgpack/msgpack'
import { logger } from '../utils/logger'
import type { ForzaMatch, ForzaResponse } from './types'

export async function fetchMatchesForTeam(teamId: string): Promise<ForzaMatch[]> {
  const url = `https://api.forzafootball.net/v1/teams/${teamId}/matches`
  const res = await fetch(url)

  if (!res.ok) {
    throw new Error(`Forza API error: ${res.status} ${res.statusText}`)
  }

  const contentType = res.headers.get('content-type') ?? ''
  let data: ForzaResponse

  if (contentType.includes('msgpack')) {
    const buffer = await res.arrayBuffer()
    data = msgpackDecode(new Uint8Array(buffer)) as ForzaResponse
    logger.debug({ teamId }, 'Forza API: decoded msgpack response')
  } else {
    data = (await res.json()) as ForzaResponse
    logger.debug({ teamId }, 'Forza API: decoded JSON response')
  }

  return (data.matches ?? []).filter(m => m.status === 'before')
}

export async function fetchMatches(): Promise<ForzaMatch[]> {
  return fetchMatchesForTeam(process.env.FORZA_GREMIO_TEAM_ID ?? '17474')
}
