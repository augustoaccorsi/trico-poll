import 'dotenv/config'
import { fetchMatchesForTeam } from './api/forza'
import { startWhatsApp, getSocket } from './whatsapp/client'
import { sendPoll } from './whatsapp/poll'
import { logger } from './utils/logger'
import { parseGroupJids } from './utils/env'
import type { ForzaMatch } from './api/types'

const TZ = process.env.TZ_BRASILIA ?? 'America/Sao_Paulo'

function getTargetDate(): string {
  const arg = process.argv[2]?.trim()
  const override = arg || process.env.POLL_DATE?.trim()
  if (override) {
    logger.info(`Using provided date: ${override}`)
    return override
  }
  const today = new Date().toLocaleDateString('en-CA', { timeZone: TZ })
  logger.info(`No date provided, using today: ${today}`)
  return today
}

function filterToDate(matches: ForzaMatch[], date: string): ForzaMatch[] {
  return matches.filter(m => {
    return new Date(m.kickoff_at).toLocaleDateString('en-CA', { timeZone: TZ }) === date
  })
}

async function main(): Promise<void> {
  const today = getTargetDate()
  logger.info({ date: today }, 'Checking for Grêmio and Internacional matches...')

  const gremioJids = parseGroupJids(process.env.WA_GREMIO_GROUP_JID)
  const interJids = parseGroupJids(process.env.WA_INTER_GROUP_JID)

  if (gremioJids.length === 0 && interJids.length === 0) {
    logger.error('WA_GREMIO_GROUP_JID and WA_INTER_GROUP_JID are both unset')
    process.exit(1)
  }

  const gremioTeamId = process.env.FORZA_GREMIO_TEAM_ID ?? '17474'
  const interTeamId = process.env.FORZA_INTER_TEAM_ID ?? '38885'

  // Build match → group set map (union for shared matches like Gre x Inter)
  const pollMap = new Map<number, { match: ForzaMatch; jids: Set<string> }>()

  if (gremioJids.length > 0) {
    const matches = filterToDate(await fetchMatchesForTeam(gremioTeamId), today)
    for (const match of matches) {
      pollMap.set(match.id, { match, jids: new Set(gremioJids) })
    }
  }

  if (interJids.length > 0) {
    const matches = filterToDate(await fetchMatchesForTeam(interTeamId), today)
    for (const match of matches) {
      const existing = pollMap.get(match.id)
      if (existing) {
        for (const jid of interJids) existing.jids.add(jid)
      } else {
        pollMap.set(match.id, { match, jids: new Set(interJids) })
      }
    }
  }

  if (pollMap.size === 0) {
    logger.info({ today }, 'No matches today. Exiting.')
    process.exit(0)
  }

  logger.info({ count: pollMap.size, today }, 'Match(es) found today — sending poll(s)')

  await startWhatsApp()
  const sock = await getSocket()

  for (const { match, jids } of pollMap.values()) {
    for (const jid of jids) {
      await sendPoll(sock, jid, match)
    }
  }

  logger.info('All polls sent. Exiting.')
  await new Promise(r => setTimeout(r, 3000)) // let Baileys flush
  process.exit(0)
}

main().catch(err => {
  logger.error({ err }, 'Fatal error')
  process.exit(1)
})
