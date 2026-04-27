# trico-poll

WhatsApp bot that automatically sends Grêmio match prediction polls to a group at 5AM (Brasília time) on each game day.

## How it works

1. Fetches upcoming Grêmio fixtures from the Forza Football API
2. Schedules a WhatsApp poll for each match at 05:00 BRT on the game day
3. Refreshes the schedule daily at 06:00 BRT to pick up fixture changes
4. Polls follow home/away order and use the match kickoff time in the question

**Poll format:**
```
Grêmio x Adversário - Quem vence? (16h)   ← home game
Adversário x Grêmio - Quem vence? (21h)   ← away game
```
Options: `Grêmio` / `Opponent` / `Empate`

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
```

### 3. Find your group JID

Start the bot without `WA_GROUP_JID` set — it will print all groups on startup:
```bash
npm run dev
```
Scan the QR code with WhatsApp → **Settings → Linked Devices → Link a Device**.

Once connected, the logs will show all groups the account is in:
```
{ "jid": "120363xxxxxx@g.us", "name": "trico-poll" }
```

Copy the JID into `.env`:
```
WA_GROUP_JID=120363xxxxxx@g.us
```

### 4. Run
```bash
npm run dev
```

The bot keeps running and fires polls automatically. On subsequent starts the QR scan is skipped (session is saved in `auth_info_baileys/`).

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the bot |
| `npm run dev:watch` | Start with auto-restart on file changes |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run compiled output |
| `npm run test:poll` | Send a test poll immediately (see below) |

## Testing polls

Send a fake poll on demand without waiting for 5AM:
```bash
npm run test:poll        # match 0: Grêmio x Adversário (home)
npm run test:poll 1      # match 1: Adversário x Grêmio (away)
npm run test:poll 2      # match 2: Grêmio x Athletico (Copa do Brasil)
```

Edit the `FAKE_MATCHES` array in `src/test-poll.ts` to add your own scenarios.

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `WA_GROUP_JID` | Yes | WhatsApp group JID (e.g. `120363xxxxxx@g.us`) |
| `FORZA_TEAM_ID` | No | Grêmio's team ID (default: `17474`) |
| `TZ_BRASILIA` | No | Timezone for scheduling (default: `America/Sao_Paulo`) |
| `POLL_CRON_HOUR` | No | Hour to send polls in BRT (default: `5`) |
| `LOG_LEVEL` | No | Pino log level (default: `info`) |

## Project structure

```
src/
├── index.ts              # Entrypoint
├── whatsapp/
│   ├── client.ts         # WhatsApp connection + QR + reconnect
│   └── poll.ts           # Send poll to group
├── scheduler/
│   ├── index.ts          # Schedule polls per match + daily refresh
│   └── jobStore.ts       # In-memory cron job registry
├── api/
│   ├── forza.ts          # Fetch matches from Forza Football API
│   └── types.ts          # TypeScript interfaces
├── utils/
│   ├── logger.ts         # Pino logger
│   └── formatPoll.ts     # Build poll question and options
└── test-poll.ts          # Manual test script
```

## Notes

- `auth_info_baileys/` stores the WhatsApp session — keep this folder safe and never commit it
- If the bot gets logged out, delete `auth_info_baileys/` and restart to re-scan the QR
- The bot must stay running to fire scheduled polls — use `pm2` or `nohup` for long-running deployments
