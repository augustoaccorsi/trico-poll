import 'dotenv/config'
import { startWhatsApp, getSocket } from './whatsapp/client'
import { sendTextMessage } from './whatsapp/message'
import { fetchTeamProbabilities } from './api/ufmg'
import { logger } from './utils/logger'

function fmt(prob: number | null): string {
  if (prob === null) return 'N/A'
  return `${prob.toLocaleString('pt-BR')}%`
}

function teamSection(name: string, flag: string, probs: Awaited<ReturnType<typeof fetchTeamProbabilities>>): string[] {
  return [
    `${flag} *${name} — Probabilidades Série A*`,
    '',
    `🏆 Campeão: ${fmt(probs.champion)}`,
    `🔼 Libertadores: ${fmt(probs.libertadores)}`,
    `🔵 Sul-americana: ${fmt(probs.sulamericana)}`,
    `🔴 Rebaixamento: ${fmt(probs.relegation)}`,
  ]
}

async function main(): Promise<void> {
  const groupJid = process.env.WA_GROUP_JID?.trim()
  if (!groupJid) {
    logger.error('WA_GROUP_JID is not set')
    process.exit(1)
  }

  logger.info('Fetching probabilities from UFMG')
  const [gremio, inter] = await Promise.all([
    fetchTeamProbabilities('Grêmio'),
    fetchTeamProbabilities('Internacional'),
  ])
  logger.info({ gremio, inter }, 'Probabilities fetched')

  const message = [
    ...teamSection('Grêmio', '🇪🇪', gremio),
    '',
    ...teamSection('Internacional', '🇦🇹', inter),
  ].join('\n')

  await startWhatsApp()
  const sock = await getSocket()

  await sendTextMessage(sock, groupJid, message)

  logger.info('Probabilities sent. Exiting.')
  await new Promise(r => setTimeout(r, 3000))
  process.exit(0)
}

main().catch(err => {
  logger.error({ err }, 'Fatal error')
  process.exit(1)
})
