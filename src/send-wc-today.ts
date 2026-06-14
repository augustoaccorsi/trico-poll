import 'dotenv/config'
import { fetchWcMatches } from './api/wc'
import { startWhatsApp, getSocket } from './whatsapp/client'
import { sendWcPoll } from './whatsapp/wcPoll'
import { logger } from './utils/logger'
import { parseGroupJids } from './utils/env'

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

async function main(): Promise<void> {
  const today = getTargetDate()
  logger.info({ date: today }, 'Checking for World Cup matches...')

  const matches = await fetchWcMatches()
  const todayMatches = matches.filter(match => {
    const matchDate = new Date(match.kickoff_at).toLocaleDateString('en-CA', { timeZone: TZ })
    return matchDate === today
  })

  if (todayMatches.length === 0) {
    logger.info({ today }, 'No WC matches today. Exiting.')
    process.exit(0)
  }

  logger.info({ count: todayMatches.length, today }, 'WC match(es) found today — sending poll(s)')

  const groupJids = parseGroupJids(process.env.WA_WC_GROUP_JID)
  if (groupJids.length === 0) {
    logger.error('WA_WC_GROUP_JID is not set')
    process.exit(1)
  }

  await startWhatsApp()
  const sock = await getSocket()

  for (const match of todayMatches) {
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
