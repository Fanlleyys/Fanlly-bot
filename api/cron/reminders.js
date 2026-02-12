import { Bot } from 'grammy';
import { getDueReminders, markAsSent } from '../../src/reminder.js';

export default async function handler(req, res) {
    // Proteksi: hanya bisa dipanggil dengan secret yang benar
    const authHeader = req.headers['authorization'];
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN);
        const dueReminders = await getDueReminders();

        let sent = 0;
        for (const reminder of dueReminders) {
            try {
                await bot.api.sendMessage(
                    reminder.userId,
                    `🔔 *REMINDER!*\n\n📝 ${reminder.message}\n\n_Reminder ini diset pada ${new Date(reminder.createdAt).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}_`,
                    { parse_mode: 'Markdown' }
                );
                await markAsSent(reminder.id);
                sent++;
            } catch (err) {
                console.error(`Failed to send reminder ${reminder.id}:`, err);
            }
        }

        return res.status(200).json({
            ok: true,
            checked: dueReminders.length,
            sent,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error('Cron error:', error);
        return res.status(500).json({ error: error.message });
    }
}
