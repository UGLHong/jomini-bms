import 'dotenv/config'
import { argv } from 'node:process'

function parseArg(name: string): string | undefined {
  const found = argv.slice(2).find((a) => a.startsWith(`--${name}=`))
  if (!found) return undefined
  return found.split('=').slice(1).join('=')
}

async function main() {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const secret = process.env.TELEGRAM_WEBHOOK_TOKEN
  const url = parseArg('url') ?? `${process.env.NUXT_PUBLIC_APP_URL ?? ''}/api/telegram/webhook`

  if (!token) throw new Error('TELEGRAM_BOT_TOKEN is required')
  if (!secret) throw new Error('TELEGRAM_WEBHOOK_TOKEN is required')
  if (!url || url === '/api/telegram/webhook') throw new Error('Pass --url=https://host/api/telegram/webhook or set NUXT_PUBLIC_APP_URL')

  const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url,
      secret_token: secret,
      allowed_updates: ['message', 'callback_query'],
    }),
  })
  const body = await res.json()
  console.log('[telegram] setWebhook response:', body)
}

main().catch((err) => {
  console.error('[telegram] setWebhook failed', err)
  process.exit(1)
})
