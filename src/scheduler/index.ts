import cron from 'node-cron'
import { fetchMatches } from '../api/forza'
import { sendPoll } from '../whatsapp/poll'
import { getSocket } from '../whatsapp/client'
import { addJob, clearAll, size } from './jobStore'
import { logger } from '../utils/logger'

const GROUP_JID_ENV = process.env.WA_GROUP_JID?.trim()
const TZ = process.env.TZ_BRASILIA ?? 'America/Sao_Paulo'
const POLL_HOUR = parseInt(process.env.POLL_CRON_HOUR ?? '5', 10)

let groupJid: string | null = null

async function resolveGroupJid(): Promise<string> {
  if (groupJid) return groupJid

  const sock = await getSocket()
  const groups = await sock.groupFetchAllParticipating()

  // Always log all groups so the user can find/verify the right JID
  logger.info('Available WhatsApp groups:')
  for (const [jid, meta] of Object.entries(groups)) {
    logger.info({ jid, name: meta.subject }, '  group')
  }

  if (!GROUP_JID_ENV) {
    throw new Error('WA_GROUP_JID is required. Set it in .env using the JID logged above.')
  }

  if (!groups[GROUP_JID_ENV]) {
    throw new Error(`WA_GROUP_JID "${GROUP_JID_ENV}" not found among groups this account is in.`)
  }

  groupJid = GROUP_JID_ENV
  logger.info({ groupJid, name: groups[GROUP_JID_ENV].subject }, 'Resolved target group')
  return groupJid
}

export async function scheduleAllPolls(): Promise<void> {
  const sock = await getSocket()
  const jid = await resolveGroupJid()
  const matches = await fetchMatches()

  logger.info({ count: matches.length }, 'Fetched upcoming matches')
  clearAll()

  let scheduled = 0

  for (const match of matches) {
    const kickoffDate = new Date(match.kickoff_at)

    // Get the game date in Brasilia local time
    const localDateStr = kickoffDate.toLocaleDateString('en-CA', { timeZone: TZ })
    const [, month, day] = localDateStr.split('-').map(Number)

    // Skip if the 5AM poll time on game day has already passed
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

    const task = cron.schedule(
      cronExpr,
      async () => {
        try {
          await sendPoll(sock, jid, match)
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
      },
      'Scheduled poll'
    )
  }

  logger.info({ scheduled, total: size() }, 'Poll scheduling complete')
}
