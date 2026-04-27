import 'dotenv/config'
import { fetchMatches } from './api/forza'
import { startWhatsApp, getSocket } from './whatsapp/client'
import { sendPoll } from './whatsapp/poll'
import { logger } from './utils/logger'

const TZ = process.env.TZ_BRASILIA ?? 'America/Sao_Paulo'

function getTodayBRT(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: TZ })
}

async function main(): Promise<void> {
  logger.info('Checking for Grêmio matches today...')

  const matches = await fetchMatches()
  const today = getTodayBRT()

  const todayMatches = matches.filter(match => {
    const matchDate = new Date(match.kickoff_at * 1000).toLocaleDateString('en-CA', { timeZone: TZ })
    return matchDate === today
  })

  if (todayMatches.length === 0) {
    logger.info({ today }, 'No matches today. Exiting.')
    process.exit(0)
  }

  logger.info({ count: todayMatches.length, today }, 'Match(es) found today — sending poll(s)')

  const groupJid = process.env.WA_GROUP_JID?.trim()
  if (!groupJid) {
    logger.error('WA_GROUP_JID is not set')
    process.exit(1)
  }

  await startWhatsApp()
  const sock = await getSocket()

  for (const match of todayMatches) {
    await sendPoll(sock, groupJid, match)
  }

  logger.info('All polls sent. Exiting.')
  await new Promise(r => setTimeout(r, 3000)) // let Baileys flush
  process.exit(0)
}

main().catch(err => {
  logger.error({ err }, 'Fatal error')
  process.exit(1)
})
