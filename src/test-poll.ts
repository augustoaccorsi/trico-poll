import 'dotenv/config'
import { startWhatsApp, getSocket } from './whatsapp/client'
import { sendPoll } from './whatsapp/poll'
import { logger } from './utils/logger'
import type { ForzaMatch } from './api/types'

const GREMIO_ID = parseInt(process.env.FORZA_TEAM_ID ?? '17474', 10)

// Edit these or add your own fake matches
const FAKE_MATCHES: ForzaMatch[] = [
  {
    id: 1,
    status: 'before',
    kickoff_at: Math.floor(Date.now() / 1000) + 3600, // 1h from now
    home_team: { id: GREMIO_ID, name: 'Grêmio' },
    away_team: { id: 9999, name: 'Adversário' },
    tournament: { id: 1, name: 'Brasileirão Série A', slug: 'brasileirao' },
  },
  {
    id: 2,
    status: 'before',
    kickoff_at: Math.floor(Date.now() / 1000) + 7200,
    home_team: { id: 8888, name: 'Adversário' },
    away_team: { id: GREMIO_ID, name: 'Grêmio' },
    tournament: { id: 2, name: 'Gauchão Série A1', slug: 'gaucho-1' },
  },
  {
    id: 3,
    status: 'before',
    kickoff_at: Math.floor(Date.now() / 1000) + 10800,
    home_team: { id: GREMIO_ID, name: 'Grêmio' },
    away_team: { id: 7777, name: 'Athletico Paranaense' },
    tournament: { id: 3, name: 'Copa do Brasil', slug: 'copa-do-brasil' },
  },
]

async function main(): Promise<void> {
  const index = parseInt(process.argv[2] ?? '0', 10)
  const match = FAKE_MATCHES[index]

  if (!match) {
    logger.error(
      { available: FAKE_MATCHES.length - 1 },
      `Invalid match index. Use: npm run test:poll [0-${FAKE_MATCHES.length - 1}]`
    )
    process.exit(1)
  }

  const groupJid = process.env.WA_GROUP_JID?.trim()
  if (!groupJid) {
    logger.error('WA_GROUP_JID is not set in .env')
    process.exit(1)
  }

  logger.info(
    { home: match.home_team.name, away: match.away_team.name, competition: match.tournament.name },
    'Sending test poll'
  )

  await startWhatsApp()
  const sock = await getSocket()

  await sendPoll(sock, groupJid, match)

  logger.info('Test poll sent. Exiting.')
  process.exit(0)
}

main().catch(err => {
  logger.error({ err }, 'Fatal error')
  process.exit(1)
})
