import makeWASocket, {
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason,
  makeCacheableSignalKeyStore,
  type WASocket,
} from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import qrcode from 'qrcode-terminal'
import { logger } from '../utils/logger'

const AUTH_FOLDER = 'auth_info_baileys'

let sock: WASocket | null = null
let resolveConnected!: (s: WASocket) => void
const connectedPromise = new Promise<WASocket>(r => {
  resolveConnected = r
})

export async function startWhatsApp(): Promise<WASocket> {
  await connect(0)
  return connectedPromise
}

export function getSocket(): Promise<WASocket> {
  return connectedPromise
}

async function connect(retries: number): Promise<void> {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER)

  let version: [number, number, number]
  try {
    const latest = await fetchLatestBaileysVersion()
    version = latest.version
  } catch {
    version = [2, 3000, 1023742250]
    logger.warn('Could not fetch latest Baileys version, using fallback')
  }

  sock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger.child({ module: 'signal-store' }) as any),
    },
    logger: logger.child({ module: 'baileys' }) as any,
    printQRInTerminal: false,
    browser: ['trico-poll', 'Chrome', '120.0.0'],
  })

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', async update => {
    const { connection, lastDisconnect, qr } = update

    if (qr) {
      logger.info('Scan the QR code below to connect WhatsApp:')
      qrcode.generate(qr, { small: true })
    }

    if (connection === 'open') {
      logger.info('WhatsApp connected successfully')
      resolveConnected(sock!)
    }

    if (connection === 'close') {
      const reason = (lastDisconnect?.error as Boom)?.output?.statusCode
      logger.warn({ reason }, 'WhatsApp connection closed')

      if (reason === DisconnectReason.loggedOut) {
        logger.error('Session logged out. Delete auth_info_baileys/ and restart to re-scan QR.')
        process.exit(1)
      }

      if (retries >= 5) {
        logger.error('Max reconnect attempts reached. Exiting.')
        process.exit(1)
      }

      const delay = Math.min(1000 * Math.pow(2, retries), 30_000)
      logger.info({ delay, attempt: retries + 1 }, 'Reconnecting...')
      await new Promise(r => setTimeout(r, delay))
      await connect(retries + 1)
    }
  })
}
