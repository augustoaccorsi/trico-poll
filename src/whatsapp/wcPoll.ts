import type { WASocket } from '@whiskeysockets/baileys'
import type { ForzaMatch } from '../api/types'
import { buildWcPollQuestion, buildWcPollOptions } from '../utils/formatWcPoll'
import { logger } from '../utils/logger'

export async function sendWcPoll(sock: WASocket, groupJid: string, match: ForzaMatch): Promise<void> {
  const name = buildWcPollQuestion(match)
  const values = buildWcPollOptions(match)

  logger.info({ groupJid, name, values }, 'Sending WC poll')

  await sock.sendMessage(groupJid, {
    poll: {
      name,
      values,
      selectableCount: 1,
    },
  })

  logger.info({ matchId: match.id }, 'WC poll sent successfully')
}
