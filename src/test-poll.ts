import 'dotenv/config'
import { startWhatsApp, getSocket } from './whatsapp/client'
import { sendPoll } from './whatsapp/poll'
import { logger } from './utils/logger'
import type { ForzaMatch } from './api/types'
import { parseGroupJids } from './utils/env'

const GREMIO_ID = parseInt(process.env.FORZA_GREMIO_TEAM_ID ?? '17474', 10)
const INTER_ID = parseInt(process.env.FORZA_INTER_TEAM_ID ?? '38885', 10)

// Edit these or add your own fake matches
const FAKE_GREMIO_MATCHES: ForzaMatch[] = [
  {
    id: 1,
    status: 'before',
    kickoff_at: new Date(Date.now() + 3600 * 1000).toISOString(),
    home_team: { id: GREMIO_ID, name: 'Grêmio' },
    away_team: { id: 9999, name: 'Adversário' },
    tournament: { id: 1, name: 'Brasileirão Série A', slug: 'brasileirao' },
  },
  {
    id: 2,
    status: 'before',
    kickoff_at: new Date(Date.now() + 7200 * 1000).toISOString(),
    home_team: { id: 8888, name: 'Adversário' },
    away_team: { id: GREMIO_ID, name: 'Grêmio' },
    tournament: { id: 2, name: 'Gauchão Série A1', slug: 'gaucho-1' },
  },
]

const FAKE_INTER_MATCHES: ForzaMatch[] = [
  {
    id: 3,
    status: 'before',
    kickoff_at: new Date(Date.now() + 3600 * 1000).toISOString(),
    home_team: { id: INTER_ID, name: 'Internacional' },
    away_team: { id: 9999, name: 'Adversário' },
    tournament: { id: 1, name: 'Brasileirão Série A', slug: 'brasileirao' },
  },
  {
    id: 4,
    status: 'before',
    kickoff_at: new Date(Date.now() + 7200 * 1000).toISOString(),
    home_team: { id: 8888, name: 'Adversário' },
    away_team: { id: INTER_ID, name: 'Internacional' },
    tournament: { id: 2, name: 'Gauchão Série A1', slug: 'gaucho-1' },
  },
]

async function main(): Promise<void> {
  const gremioJids = parseGroupJids(process.env.WA_GREMIO_GROUP_JID)
  const interJids = parseGroupJids(process.env.WA_INTER_GROUP_JID)

  if (gremioJids.length === 0 && interJids.length === 0) {
    logger.error('WA_GREMIO_GROUP_JID and WA_INTER_GROUP_JID are both unset in .env')
    process.exit(1)
  }

  await startWhatsApp()
  const sock = await getSocket()

  if (gremioJids.length > 0) {
    logger.info({ groups: gremioJids.length }, 'Sending fake Grêmio polls')
    for (const match of FAKE_GREMIO_MATCHES) {
      for (const jid of gremioJids) {
        await sendPoll(sock, jid, match)
      }
    }
  }

  if (interJids.length > 0) {
    logger.info({ groups: interJids.length }, 'Sending fake Internacional polls')
    for (const match of FAKE_INTER_MATCHES) {
      for (const jid of interJids) {
        await sendPoll(sock, jid, match)
      }
    }
  }

  logger.info('Test polls sent. Exiting.')
  process.exit(0)
}

main().catch(err => {
  logger.error({ err }, 'Fatal error')
  process.exit(1)
})
