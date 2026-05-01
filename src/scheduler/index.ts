import cron from 'node-cron'
import { fetchMatchesForTeam } from '../api/forza'
import { sendPoll } from '../whatsapp/poll'
import { getSocket } from '../whatsapp/client'
import { addJob, clearAll, size } from './jobStore'
import { logger } from '../utils/logger'
import { parseGroupJids } from '../utils/env'
import type { ForzaMatch } from '../api/types'

const GREMIO_JIDS = parseGroupJids(process.env.WA_GREMIO_GROUP_JID)
const INTER_JIDS = parseGroupJids(process.env.WA_INTER_GROUP_JID)
const GREMIO_TEAM_ID = process.env.FORZA_GREMIO_TEAM_ID ?? '17474'
const INTER_TEAM_ID = process.env.FORZA_INTER_TEAM_ID ?? '38885'
const TZ = process.env.TZ_BRASILIA ?? 'America/Sao_Paulo'
const POLL_HOUR = parseInt(process.env.POLL_CRON_HOUR ?? '5', 10)

async function logAvailableGroups(): Promise<void> {
  const sock = await getSocket()
  const groups = await sock.groupFetchAllParticipating()
  logger.info('Available WhatsApp groups:')
  for (const [jid, meta] of Object.entries(groups)) {
    logger.info({ jid, name: meta.subject }, '  group')
  }
}

type MatchPoll = { match: ForzaMatch; groupJids: Set<string> }

async function buildPollMap(): Promise<Map<number, MatchPoll>> {
  const pollMap = new Map<number, MatchPoll>()

  const grémioMatches = await fetchMatchesForTeam(GREMIO_TEAM_ID)
  logger.info({ count: grémioMatches.length }, 'Fetched upcoming Grêmio matches')
  for (const match of grémioMatches) {
    pollMap.set(match.id, { match, groupJids: new Set(GREMIO_JIDS) })
  }

  const interMatches = await fetchMatchesForTeam(INTER_TEAM_ID)
  logger.info({ count: interMatches.length }, 'Fetched upcoming Internacional matches')
  for (const match of interMatches) {
    const existing = pollMap.get(match.id)
    if (existing) {
      for (const jid of INTER_JIDS) existing.groupJids.add(jid)
    } else {
      pollMap.set(match.id, { match, groupJids: new Set(INTER_JIDS) })
    }
  }

  return pollMap
}

export async function scheduleAllPolls(): Promise<void> {
  if (GREMIO_JIDS.length === 0 && INTER_JIDS.length === 0) {
    throw new Error(
      'WA_GREMIO_GROUP_JID and WA_INTER_GROUP_JID are both unset. Set at least one in .env.'
    )
  }

  await logAvailableGroups()

  const sock = await getSocket()
  const pollMap = await buildPollMap()

  logger.info({ uniqueMatches: pollMap.size }, 'Total unique matches to schedule')
  clearAll()

  let scheduled = 0

  for (const { match, groupJids } of pollMap.values()) {
    if (groupJids.size === 0) continue

    const kickoffDate = new Date(match.kickoff_at)
    const localDateStr = kickoffDate.toLocaleDateString('en-CA', { timeZone: TZ })
    const [, month, day] = localDateStr.split('-').map(Number)

    const pollTimeUTC = Date.UTC(
      kickoffDate.getUTCFullYear(),
      month - 1,
      day,
      POLL_HOUR + 3, // BRT = UTC-3
      0,
      0
    )
    if (pollTimeUTC < Date.now()) {
      logger.debug({ matchId: match.id }, 'Match poll already past, skipping')
      continue
    }

    const cronExpr = `0 ${POLL_HOUR} ${day} ${month} *`
    const jidsSnapshot = [...groupJids]

    const task = cron.schedule(
      cronExpr,
      async () => {
        try {
          for (const jid of jidsSnapshot) {
            await sendPoll(sock, jid, match)
          }
        } catch (err) {
          logger.error({ err, matchId: match.id }, 'Failed to send poll')
        }
      },
      { timezone: TZ }
    )

    addJob(match.id, task)
    scheduled++

    logger.info(
      {
        matchId: match.id,
        cronExpr,
        home: match.home_team.name,
        away: match.away_team.name,
        competition: match.tournament.name,
        groups: jidsSnapshot.length,
      },
      'Scheduled poll'
    )
  }

  logger.info({ scheduled, total: size() }, 'Poll scheduling complete')
}
