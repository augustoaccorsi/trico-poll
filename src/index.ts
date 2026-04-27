import 'dotenv/config'
import cron from 'node-cron'
import { startWhatsApp } from './whatsapp/client'
import { scheduleAllPolls } from './scheduler'
import { logger } from './utils/logger'

const TZ = process.env.TZ_BRASILIA ?? 'America/Sao_Paulo'

async function main(): Promise<void> {
  logger.info('Starting trico-poll bot')

  await startWhatsApp()

  await scheduleAllPolls()

  // Refresh every day at 06:00 BRT to pick up fixture changes
  cron.schedule(
    '0 6 * * *',
    async () => {
      logger.info('Daily refresh: re-fetching matches and rescheduling polls')
      try {
        await scheduleAllPolls()
      } catch (err) {
        logger.error({ err }, 'Daily refresh failed')
      }
    },
    { timezone: TZ }
  )

  logger.info('Bot running. Press Ctrl+C to stop.')
}

main().catch(err => {
  logger.error({ err }, 'Fatal error')
  process.exit(1)
})
