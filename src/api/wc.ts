import { decode as msgpackDecode } from '@msgpack/msgpack'
import { logger } from '../utils/logger'
import type { ForzaMatch, ForzaResponse } from './types'

const API_URL = 'https://api.forzafootball.net/v1/tournaments/429/matches'

export async function fetchWcMatches(): Promise<ForzaMatch[]> {
  const res = await fetch(API_URL)

  if (!res.ok) {
    throw new Error(`Forza WC API error: ${res.status} ${res.statusText}`)
  }

  const contentType = res.headers.get('content-type') ?? ''
  let data: ForzaResponse

  if (contentType.includes('msgpack')) {
    const buffer = await res.arrayBuffer()
    data = msgpackDecode(new Uint8Array(buffer)) as ForzaResponse
    logger.debug('Forza WC API: decoded msgpack response')
  } else {
    data = (await res.json()) as ForzaResponse
    logger.debug('Forza WC API: decoded JSON response')
  }

  return (data.matches ?? []).filter(m => m.status === 'before')
}
