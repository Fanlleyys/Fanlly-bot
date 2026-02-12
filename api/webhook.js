import { webhookCallback } from 'grammy';
import { createBot } from '../src/bot.js';

// Buat bot instance
const bot = createBot();

// Export sebagai Vercel serverless function (webhook handler)
export default webhookCallback(bot, 'std/http');
