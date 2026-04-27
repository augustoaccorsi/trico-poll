import { decode as msgpackDecode } from '@msgpack/msgpack'
import { logger } from '../utils/logger'
import type { ForzaMatch, ForzaResponse } from './types'

const TEAM_ID = process.env.FORZA_TEAM_ID ?? '17474'
const API_URL = `https://api.forzafootball.net/v1/teams/${TEAM_ID}/matches`

export async function fetchMatches(): Promise<ForzaMatch[]> {
  const res = await fetch(API_URL)

  if (!res.ok) {
    throw new Error(`Forza API error: ${res.status} ${res.statusText}`)
  }

  const contentType = res.headers.get('content-type') ?? ''
  let data: ForzaResponse

  if (contentType.includes('msgpack')) {
    const buffer = await res.arrayBuffer()
    data = msgpackDecode(new Uint8Array(buffer)) as ForzaResponse
    logger.debug('Forza API: decoded msgpack response')
  } else {
    data = (await res.json()) as ForzaResponse
    logger.debug('Forza API: decoded JSON response')
  }

  return (data.matches ?? []).filter(m => m.status === 'before')
}
