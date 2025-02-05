import TelegramBot from 'node-telegram-bot-api'

const TOKEN = import.meta.env.VITE_TELEGRAM_BOT_TOKEN ?? ''
const GROUP_ID = import.meta.env.VITE_TELEGRAM_GROUP_ID ?? ''

const bot = new TelegramBot(TOKEN, { polling: true })

// bot.on('message', (msg) => {
//   const chatId = msg.chat.id
//   bot.sendMessage(chatId, 'Received your message: ' + msg.text)
// })

bot.sendMessage(GROUP_ID, 'Hai Ini Notifikasi Dari Bot')

export const sendNotification = (message: string) => {
  bot.sendMessage(-1002185587641, message)
}
