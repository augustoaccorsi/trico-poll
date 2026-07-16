import makeWASocket, {
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason,
  makeCacheableSignalKeyStore,
  Browsers,
  type WASocket,
} from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import qrcode from 'qrcode-terminal'
import { logger } from '../utils/logger'

const AUTH_FOLDER = 'auth_info_baileys'

let sock: WASocket | null = null
let socketWaiters: Array<(s: WASocket) => void> = []
let intentionalDisconnect = false

function notifyConnected(s: WASocket): void {
  sock = s
  const waiters = socketWaiters.splice(0)
  for (const resolve of waiters) resolve(s)
}

export async function startWhatsApp(): Promise<WASocket> {
  intentionalDisconnect = false
  await connect(0)
  return getSocket()
}

export function getSocket(): Promise<WASocket> {
  if (sock) return Promise.resolve(sock)
  return new Promise(r => socketWaiters.push(r))
}

export function disconnectWhatsApp(): void {
  intentionalDisconnect = true
  sock?.end(undefined)
  sock = null
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

  const newSock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger.child({ module: 'signal-store' }) as any),
    },
    logger: logger.child({ module: 'baileys' }) as any,
    printQRInTerminal: false,
    browser: Browsers.ubuntu('Chrome'),
    getMessage: async () => undefined,
  })

  newSock.ev.on('creds.update', saveCreds)

  newSock.ev.on('connection.update', async update => {
    const { connection, lastDisconnect, qr } = update

    if (qr) {
      logger.info('Scan the QR code below to connect WhatsApp:')
      qrcode.generate(qr, { small: true })
    }

    if (connection === 'open') {
      logger.info('WhatsApp connected successfully')
      notifyConnected(newSock)
    }

    if (connection === 'close') {
      sock = null

      if (intentionalDisconnect) {
        logger.info('WhatsApp disconnected')
        return
      }

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
