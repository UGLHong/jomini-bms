import { useRuntimeConfig } from '#imports'
import { logger } from '@/server/utils/logger'

type TelegramMessageOptions = {
  chatId: string
  text: string
  parseMode?: 'HTML' | 'Markdown'
  replyMarkup?: unknown
  replyToMessageId?: string | number
}

export async function sendTelegramMessage(opts: TelegramMessageOptions): Promise<{ messageId?: number } | null> {
  const config = useRuntimeConfig()
  const token = config.telegramBotToken
  if (!token || !opts.chatId) return null

  try {
    const res = await $fetch<{ ok: boolean; result?: { message_id: number } }>(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: 'POST',
        body: {
          chat_id: opts.chatId,
          text: opts.text,
          parse_mode: opts.parseMode ?? 'HTML',
          reply_markup: opts.replyMarkup,
          reply_to_message_id: opts.replyToMessageId,
          disable_web_page_preview: true,
        },
      },
    )
    if (!res.ok) return null
    return { messageId: res.result?.message_id }
  } catch (err) {
    logger.warn({ err }, '[telegram] send failed')
    return null
  }
}

export async function sendTelegramPhoto(opts: {
  chatId: string
  photoUrl: string
  caption?: string
  replyToMessageId?: string | number
}): Promise<{ messageId?: number } | null> {
  const config = useRuntimeConfig()
  const token = config.telegramBotToken
  if (!token || !opts.chatId) return null

  try {
    const res = await $fetch<{ ok: boolean; result?: { message_id: number } }>(
      `https://api.telegram.org/bot${token}/sendPhoto`,
      {
        method: 'POST',
        body: {
          chat_id: opts.chatId,
          photo: opts.photoUrl,
          caption: opts.caption,
          parse_mode: 'HTML',
          reply_to_message_id: opts.replyToMessageId,
        },
      },
    )
    if (!res.ok) return null
    return { messageId: res.result?.message_id }
  } catch (err) {
    logger.warn({ err }, '[telegram] sendPhoto failed')
    return null
  }
}
