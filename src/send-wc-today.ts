import 'dotenv/config'
import { fetchWcMatches } from './api/wc'
import { startWhatsApp, getSocket } from './whatsapp/client'
import { sendWcPoll } from './whatsapp/wcPoll'
import { logger } from './utils/logger'
import { parseGroupJids } from './utils/env'

const TZ = process.env.TZ_BRASILIA ?? 'America/Sao_Paulo'

// Games kicking off before this hour (BRT) are "early morning" —
// they belong to the previous night's poll cycle, not the morning run.
const EARLY_MORNING_CUTOFF = 3

function getDatePair(): { today: string; tomorrow: string } {
  const arg = process.argv[2]?.trim()
  const override = arg || process.env.POLL_DATE?.trim()
  if (override) {
    const d = new Date(override + 'T12:00:00Z')
    const tomorrow = new Date(d)
    tomorrow.setUTCDate(d.getUTCDate() + 1)
    return {
      today: override,
      tomorrow: tomorrow.toLocaleDateString('en-CA', { timeZone: TZ }),
    }
  }
  const now = new Date()
  const today = now.toLocaleDateString('en-CA', { timeZone: TZ })
  const nextDay = new Date(now)
  nextDay.setUTCDate(now.getUTCDate() + 1)
  const tomorrow = nextDay.toLocaleDateString('en-CA', { timeZone: TZ })
  return { today, tomorrow }
}

function kickoffHour(kickoff_at: string): number {
  return parseInt(
    new Date(kickoff_at).toLocaleTimeString('en-GB', { timeZone: TZ, hour: '2-digit' }),
    10
  )
}

async function main(): Promise<void> {
  const { today, tomorrow } = getDatePair()
  logger.info({ today, tomorrow }, 'Checking for World Cup matches...')

  const matches = await fetchWcMatches()

  // Today's games that aren't early-morning (those already ran or are too close)
  // + Tomorrow's early-morning games (00:00–02:xx BRT) sent in advance
  const relevantMatches = matches.filter(match => {
    const matchDate = new Date(match.kickoff_at).toLocaleDateString('en-CA', { timeZone: TZ })
    const hour = kickoffHour(match.kickoff_at)
    return (
      (matchDate === today && hour >= EARLY_MORNING_CUTOFF) ||
      (matchDate === tomorrow && hour < EARLY_MORNING_CUTOFF)
    )
  })

  if (relevantMatches.length === 0) {
    logger.info({ today, tomorrow }, 'No WC matches for this run. Exiting.')
    process.exit(0)
  }

  logger.info({ count: relevantMatches.length, today, tomorrow }, 'WC match(es) found — sending poll(s)')

  const groupJids = parseGroupJids(process.env.WA_WC_GROUP_JID)
  if (groupJids.length === 0) {
    logger.error('WA_WC_GROUP_JID is not set')
    process.exit(1)
  }

  await startWhatsApp()
  const sock = await getSocket()

  for (const match of relevantMatches) {
    for (const jid of groupJids) {
      try {
        await sendWcPoll(sock, jid, match)
      } catch (err) {
        logger.error({ err, jid, matchId: match.id }, 'Failed to send WC poll to group')
      }
    }
  }

  logger.info('All WC polls sent. Exiting.')
  await new Promise(r => setTimeout(r, 3000))
  process.exit(0)
}

main().catch(err => {
  logger.error({ err }, 'Fatal error')
  process.exit(1)
})
