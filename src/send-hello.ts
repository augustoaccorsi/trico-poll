import 'dotenv/config'
import { startWhatsApp, getSocket } from './whatsapp/client'
import { sendMentionMessage } from './whatsapp/message'
import { logger } from './utils/logger'

async function main(): Promise<void> {
  const groupJid = process.env.WA_HELLO_GROUP_JID?.trim()
  if (!groupJid) {
    logger.error('WA_HELLO_GROUP_JID is not set')
    process.exit(1)
  }

  const helloId = process.env.WA_HELLO_ID?.trim()
  if (!helloId) {
    logger.error('WA_HELLO_ID is not set')
    process.exit(1)
  }

  const phone = helloId.split('@')[0]
  const text = `Bom dia mano @${phone}`

  await startWhatsApp()
  const sock = await getSocket()

  await sendMentionMessage(sock, groupJid, text, [helloId])

  logger.info('Good morning message sent. Exiting.')
  await new Promise(r => setTimeout(r, 3000))
  process.exit(0)
}

main().catch(err => {
  logger.error({ err }, 'Fatal error')
  process.exit(1)
})
