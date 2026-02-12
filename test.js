// Test lokal — jalankan bot dalam mode polling
import 'dotenv/config';
import { createBot } from './src/bot.js';

const bot = createBot();
bot.start();
console.log('🤖 Bot berjalan dalam mode polling... Kirim pesan ke bot di Telegram!');
