// Script untuk setup webhook Telegram ke URL Vercel
// Jalankan: node scripts/setup-webhook.js
import 'dotenv/config';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const VERCEL_URL = process.argv[2]; // pass as argument

if (!BOT_TOKEN) {
    console.error('❌ TELEGRAM_BOT_TOKEN tidak ditemukan di .env');
    process.exit(1);
}

if (!VERCEL_URL) {
    console.error('❌ Masukkan URL Vercel sebagai argument');
    console.error('   Contoh: node scripts/setup-webhook.js https://your-project.vercel.app');
    process.exit(1);
}

const webhookUrl = `${VERCEL_URL}/api/webhook`;

async function setupWebhook() {
    console.log(`\n🔗 Setting webhook ke: ${webhookUrl}\n`);

    // Set webhook
    const setResponse = await fetch(
        `https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                url: webhookUrl,
                allowed_updates: ['message'],
                drop_pending_updates: true,
            }),
        }
    );
    const setResult = await setResponse.json();
    console.log('Set webhook:', setResult);

    // Verify webhook
    const infoResponse = await fetch(
        `https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`
    );
    const infoResult = await infoResponse.json();
    console.log('\n📋 Webhook info:', JSON.stringify(infoResult.result, null, 2));

    if (infoResult.result?.url === webhookUrl) {
        console.log('\n✅ Webhook berhasil di-set! Bot kamu sekarang online 24/7 🎉');
    } else {
        console.log('\n⚠️ Ada masalah, cek output di atas.');
    }
}

setupWebhook().catch(console.error);
