import 'dotenv/config'
import { fetchWcMatches } from './api/wc'
import { startWhatsApp, getSocket } from './whatsapp/client'
import { sendWcPoll } from './whatsapp/wcPoll'
import { logger } from './utils/logger'
import { parseGroupJids } from './utils/env'

const TZ = process.env.TZ_BRASILIA ?? 'America/Sao_Paulo'

// Early-morning threshold: games kicking off before this hour (BRT) are
// sent the previous evening instead of the morning of.
const EARLY_MORNING_HOUR = 6

type Mode = 'morning' | 'evening'

function detectMode(): Mode {
  const envMode = process.env.POLL_MODE?.trim().toLowerCase()
  if (envMode === 'morning' || envMode === 'evening') return envMode

  // Auto-detect based on current UTC hour:
  // 01:07 UTC = 22:07 BRT (evening run), 06:07 UTC = 03:07 BRT (morning run)
  const utcHour = new Date().getUTCHours()
  return utcHour < 4 ? 'evening' : 'morning'
}

function getTargetDate(mode: Mode): string {
  const arg = process.argv[2]?.trim()
  const override = arg || process.env.POLL_DATE?.trim()
  if (override) {
    logger.info(`Using provided date: ${override}`)
    return override
  }

  const now = new Date()
  if (mode === 'evening') {
    // Evening run: look at tomorrow's early games
    const tomorrow = new Date(now)
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
    const date = tomorrow.toLocaleDateString('en-CA', { timeZone: TZ })
    logger.info(`Evening run — using tomorrow: ${date}`)
    return date
  }

  const today = now.toLocaleDateString('en-CA', { timeZone: TZ })
  logger.info(`Morning run — using today: ${today}`)
  return today
}

async function main(): Promise<void> {
  const mode = detectMode()
  const targetDate = getTargetDate(mode)
  logger.info({ date: targetDate, mode }, 'Checking for World Cup matches...')

  const matches = await fetchWcMatches()
  const dateMatches = matches.filter(match => {
    const matchDate = new Date(match.kickoff_at).toLocaleDateString('en-CA', { timeZone: TZ })
    return matchDate === targetDate
  })

  // Morning run: only games kicking off at 06:00 BRT or later
  // Evening run: only games kicking off before 06:00 BRT (so poll goes out in advance)
  const relevantMatches = dateMatches.filter(match => {
    const kickoffHour = parseInt(
      new Date(match.kickoff_at).toLocaleTimeString('en-GB', { timeZone: TZ, hour: '2-digit' }),
      10
    )
    return mode === 'evening' ? kickoffHour < EARLY_MORNING_HOUR : kickoffHour >= EARLY_MORNING_HOUR
  })

  if (relevantMatches.length === 0) {
    logger.info({ targetDate, mode }, 'No relevant WC matches for this run. Exiting.')
    process.exit(0)
  }

  logger.info({ count: relevantMatches.length, targetDate, mode }, 'WC match(es) found — sending poll(s)')

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
