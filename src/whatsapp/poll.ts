import type { WASocket } from '@whiskeysockets/baileys'
import type { ForzaMatch } from '../api/types'
import { buildPollQuestion, buildPollOptions } from '../utils/formatPoll'
import { logger } from '../utils/logger'

export async function sendPoll(sock: WASocket, groupJid: string, match: ForzaMatch): Promise<void> {
  const name = buildPollQuestion(match)
  const values = buildPollOptions(match)

  logger.info({ groupJid, name, values }, 'Sending poll')

  await sock.sendMessage(groupJid, {
    poll: {
      name,
      values,
      selectableCount: 1,
    },
  })

  logger.info({ matchId: match.id }, 'Poll sent successfully')
}
