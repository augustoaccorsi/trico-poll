import type { WASocket } from '@whiskeysockets/baileys'
import { logger } from '../utils/logger'

export async function sendTextMessage(sock: WASocket, groupJid: string, text: string): Promise<void> {
  logger.info({ groupJid }, 'Sending text message')
  await sock.sendMessage(groupJid, { text })
  logger.info('Text message sent successfully')
}

export async function sendMentionMessage(
  sock: WASocket,
  groupJid: string,
  text: string,
  mentionJids: string[],
): Promise<void> {
  logger.info({ groupJid, mentionJids }, 'Sending mention message')
  await sock.sendMessage(groupJid, { text, mentions: mentionJids })
  logger.info('Mention message sent successfully')
}
