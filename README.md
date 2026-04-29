# trico-poll

WhatsApp bot that sends Grêmio match prediction polls and Série A probability updates to a WhatsApp group.

## Features

- **Automated polls** — sends a prediction poll at 5AM BRT on each Grêmio game day
- **World Cup polls** — sends prediction polls for each World Cup 2026 match day (Jun 11–Jul 19)
- **Série A probabilities** — sends champion/Libertadores/Sul-Americana/relegation odds for Grêmio and Internacional (sourced from UFMG)
- **Good morning message** — sends a daily "Bom dia mano @Tobias" mention to a dedicated group
- **GitHub Pages UI** — trigger polls and probabilities manually from a browser or iOS Shortcuts

## How it works

1. Fetches upcoming Grêmio fixtures from the Forza Football API
2. Schedules a WhatsApp poll for each match at 05:00 BRT on the game day
3. Refreshes the schedule daily at 06:00 BRT to pick up fixture changes

**Poll format:**
```
🇪🇪 Grêmio x Adversário — Quem vence? (16h)   ← home game
Adversário x 🇪🇪 Grêmio — Quem vence? (21h)   ← away game
```
Options: `🇪🇪 Grêmio` / `Opponent` / `Empate`

**Probabilities format:**
```
🇪🇪 *Grêmio — Probabilidades Série A*

🏆 Campeão: 0,27%
🔼 Libertadores: 8,5%
🔵 Sul-americana: 35,7%
🔴 Rebaixamento: 18,1%

🇦🇹 *Internacional — Probabilidades Série A*
...
```

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
| `npm run dev` | Start the bot (continuous, schedules polls) |
| `npm run dev:watch` | Start with auto-restart on file changes |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run compiled output |
| `npm run send-today` | Send poll for today's match (one-shot) |
| `npm run test:poll` | Send a fake test poll immediately |
| `npm run send-wc-today` | Send WC poll for today's matches (one-shot) |
| `npm run test:wc-poll` | Send WC poll for today (pass date: `npm run test:wc-poll -- 2026-06-11`) |
| `npm run send-hello` | Send "Bom dia mano @Tobias" mention (one-shot) |
| `npm run test:probabilities` | Send Série A probabilities to `WA_TEST_GROUP_JID` |

## Testing

**Test polls** — send a fake poll without waiting for 5AM:
```bash
npm run test:poll        # match 0: 🇪🇪 Grêmio x Adversário (home)
npm run test:poll 1      # match 1: Adversário x 🇪🇪 Grêmio (away)
npm run test:poll 2      # match 2: 🇪🇪 Grêmio x Adversário (Copa do Brasil)
```

Edit the `FAKE_MATCHES` array in [src/test-poll.ts](src/test-poll.ts) to add your own scenarios.

**Test probabilities** — sends to `WA_TEST_GROUP_JID`:
```bash
npm run test:probabilities
```

## GitHub Actions workflows

| Workflow | Trigger | Description |
|---|---|---|
| `send-poll.yml` | Daily 5AM BRT + manual | Send poll for today's match (idempotent) |
| `test-poll.yml` | Manual | Send a fake test poll (index 0/1/2) to test group |
| `send-probabilities.yml` | Every Tuesday 5AM BRT + manual | Send Série A probabilities to production group |
| `test-probabilities.yml` | Manual | Send Série A probabilities to test group |
| `send-wc-poll.yml` | Daily + manual (Jun 11–Jul 19 2026) | Send WC polls for today's matches |
| `send-hello.yml` | Daily 3AM BRT + manual | Send "Bom dia mano @Tobias" to dedicated group |

### Required GitHub secrets

| Secret | Description |
|---|---|
| `WA_SESSION` | WhatsApp session (base64-encoded gzipped tar of `auth_info_baileys/`) |
| `WA_GROUP_JID` | Production WhatsApp group JID |
| `WA_TEST_GROUP_JID` | Test WhatsApp group JID |
| `WA_HELLO_GROUP_JID` | WhatsApp group JID for the daily good morning message |
| `WA_HELLO_ID` | Tobias's WhatsApp JID for @mention (e.g. `5511999999999@s.whatsapp.net`) |
| `GH_PAT` | Fine-grained PAT with Actions read/write (to save updated session) |

To encode the session after scanning QR locally:
```bash
tar -czf - auth_info_baileys/ | base64 | gh secret set WA_SESSION -R <owner>/<repo> --hostname github.com
```

## GitHub Pages UI

Hosted at `https://<owner>.github.io/trico-poll/` — trigger workflows from any browser or iOS Shortcuts.

| Route | Action |
|---|---|
| `/` | Landing page with links |
| `/today/` | Send poll for today's match (uses current BRT date) |
| `/test/` | Send a test poll (index 0, 1, or 2) |

The UI calls the GitHub Actions `workflow_dispatch` API using a fine-grained PAT stored in `localStorage`. The PAT needs **Actions: read/write** scope on the repository.

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `WA_GROUP_JID` | Yes | WhatsApp production group JID |
| `WA_TEST_GROUP_JID` | No | WhatsApp test group JID (used by test scripts) |
| `WA_HELLO_GROUP_JID` | No | WhatsApp group JID for the daily good morning message |
| `WA_HELLO_ID` | No | Tobias's WhatsApp JID for @mention (`5511...@s.whatsapp.net`) |
| `FORZA_TEAM_ID` | No | Grêmio's Forza Football team ID (default: `17474`) |
| `TZ_BRASILIA` | No | Timezone for scheduling (default: `America/Sao_Paulo`) |
| `POLL_CRON_HOUR` | No | Hour to send polls in BRT (default: `5`) |
| `LOG_LEVEL` | No | Pino log level (default: `info`) |
| `UFMG_HTML_DIR` | No | Path to pre-fetched UFMG HTML files (set automatically in CI) |

## Project structure

```
src/
├── index.ts                  # Entrypoint (continuous bot)
├── send-today.ts             # One-shot: send poll for today
├── send-wc-today.ts          # One-shot: send WC polls for today
├── send-probabilities.ts     # One-shot: send Série A probabilities
├── send-hello.ts             # One-shot: send good morning mention to Tobias
├── test-poll.ts              # One-shot: send fake test poll
├── test-probabilities.ts     # One-shot: send probabilities to test group
├── api/
│   ├── forza.ts              # Fetch fixtures from Forza Football API
│   ├── wc.ts                 # Fetch World Cup fixtures from Forza Football API
│   ├── ufmg.ts               # Scrape Série A probabilities from UFMG
│   └── types.ts              # TypeScript interfaces
├── scheduler/
│   ├── index.ts              # Schedule polls per match + daily refresh
│   └── jobStore.ts           # In-memory cron job registry
├── whatsapp/
│   ├── client.ts             # WhatsApp connection + QR + reconnect
│   ├── poll.ts               # Send Série A poll to group
│   ├── wcPoll.ts             # Send WC poll to group
│   └── message.ts            # Send text/mention messages to group
└── utils/
    ├── logger.ts             # Pino logger
    ├── formatPoll.ts         # Build Série A poll question and options
    ├── formatWcPoll.ts       # Build WC poll question and options
    ├── teamEmojis.ts         # Brazilian club → flag/emoji map
    ├── countryEmojis.ts      # Country → flag emoji map
    └── countryNames.ts       # Country name English → Portuguese map
docs/
├── index.html                # GitHub Pages landing page
├── today/index.html          # Trigger today's poll
└── test/index.html           # Trigger test poll
.github/workflows/
├── send-poll.yml
├── test-poll.yml
├── send-probabilities.yml
├── test-probabilities.yml
├── send-wc-poll.yml
├── test-wc-poll.yml
└── send-hello.yml
```

## Notes

- `auth_info_baileys/` stores the WhatsApp session — keep it safe and never commit it
- If the bot gets logged out, delete `auth_info_baileys/` and restart to re-scan the QR
- The bot must stay running to fire scheduled polls — use `pm2` or `nohup` for long-running deployments
- UFMG's server blocks GitHub Actions (Azure) IPs; CI pre-fetches HTML via `curl` before running Node
