import { Bot } from 'grammy';
import { addTransaction, parseAmount, getMonthlyReport, getDetailedReport } from './finance.js';
import { addReminder, parseRemindTime, getUserReminders, deleteReminder } from './reminder.js';
import { chatWithGemini } from './gemini.js';

export function createBot() {
    const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN);

    // Set command menu yang muncul saat user ketik "/"
    bot.api.setMyCommands([
        { command: 'start', description: '👋 Mulai & lihat panduan' },
        { command: 'help', description: '📚 Daftar semua perintah' },
        { command: 'keluar', description: '💸 Catat pengeluaran' },
        { command: 'masuk', description: '💰 Catat pemasukan' },
        { command: 'laporan', description: '📊 Laporan keuangan bulan ini' },
        { command: 'laporan_lengkap', description: '📊 Laporan detail per kategori' },
        { command: 'reminder', description: '⏰ Set pengingat' },
        { command: 'list_reminder', description: '🔔 Lihat semua reminder' },
        { command: 'hapus_reminder', description: '🗑 Hapus reminder' },
    ]);

    // ==========================================
    // /start — Pesan selamat datang
    // ==========================================
    bot.command('start', async (ctx) => {
        const name = ctx.from?.first_name || 'kamu';
        await ctx.reply(
            `yo ${name}! gue AlfanBot, asisten lo di Telegram.

ini yang bisa gue bantu:

-- KEUANGAN --
/keluar [jumlah] [keterangan] - catat pengeluaran
/masuk [jumlah] [keterangan] - catat pemasukan
/laporan - ringkasan bulan ini
/laporan_lengkap - detail per kategori

-- REMINDER --
/reminder [waktu] [pesan] - set pengingat
/list_reminder - lihat semua
/hapus_reminder [id] - hapus reminder

-- AI CHAT --
kirim pesan apa aja, gue jawab pake AI

format waktu reminder: 10m, 2h, 1d, 14:30, besok 08:00
format jumlah: 50000, 50k, 1.5jt`
        );
    });

    // ==========================================
    // /help — sama kayak /start
    // ==========================================
    bot.command('help', async (ctx) => {
        await ctx.reply(
            `daftar perintah:

/keluar 50000 makan siang
/masuk 1jt gaji
/laporan
/laporan_lengkap
/reminder 30m istirahat
/list_reminder
/hapus_reminder 1

atau ketik apa aja buat ngobrol`
        );
    });

    // ==========================================
    // /keluar — Catat pengeluaran
    // ==========================================
    bot.command('keluar', async (ctx) => {
        const text = ctx.match;
        if (!text) {
            return ctx.reply('❌ Format: /keluar [jumlah] [keterangan]\nContoh: `/keluar 50000 makan siang`',);
        }

        const parts = text.trim().split(/\s+/);
        const amount = parseAmount(parts[0]);
        if (!amount || amount <= 0) {
            return ctx.reply('❌ Jumlah tidak valid. Contoh: `50000`, `50k`, `1.5jt`',);
        }

        const description = parts.slice(1).join(' ') || null;
        const result = await addTransaction(ctx.from.id, 'expense', amount, description);
        await ctx.reply(result,);
    });

    // ==========================================
    // /masuk — Catat pemasukan
    // ==========================================
    bot.command('masuk', async (ctx) => {
        const text = ctx.match;
        if (!text) {
            return ctx.reply('❌ Format: /masuk [jumlah] [keterangan]\nContoh: `/masuk 1000000 gaji`',);
        }

        const parts = text.trim().split(/\s+/);
        const amount = parseAmount(parts[0]);
        if (!amount || amount <= 0) {
            return ctx.reply('❌ Jumlah tidak valid. Contoh: `50000`, `50k`, `1.5jt`',);
        }

        const description = parts.slice(1).join(' ') || null;
        const result = await addTransaction(ctx.from.id, 'income', amount, description);
        await ctx.reply(result,);
    });

    // ==========================================
    // /laporan — Laporan bulanan simpel
    // ==========================================
    bot.command('laporan', async (ctx) => {
        const result = await getMonthlyReport(ctx.from.id);
        await ctx.reply(result,);
    });

    // ==========================================
    // /laporan_lengkap — Laporan detail per kategori
    // ==========================================
    bot.command('laporan_lengkap', async (ctx) => {
        const result = await getDetailedReport(ctx.from.id);
        await ctx.reply(result,);
    });

    // ==========================================
    // /reminder — Set pengingat
    // ==========================================
    bot.command('reminder', async (ctx) => {
        const text = ctx.match;
        if (!text) {
            return ctx.reply(
                'format: /reminder [waktu] [pesan]\n\n' +
                'contoh:\n' +
                '/reminder 10m Minum air\n' +
                '/reminder 2h Meeting\n' +
                '/reminder 14:30 Sholat dzuhur\n' +
                '/reminder besok 08:00 Bangun'
            );
        }

        const parts = text.trim().split(/\s+/);

        // Cek apakah format "besok HH:MM"
        let timeStr, message;
        if (parts[0].toLowerCase() === 'besok' && parts.length >= 3) {
            timeStr = `besok ${parts[1]}`;
            message = parts.slice(2).join(' ');
        } else {
            timeStr = parts[0];
            message = parts.slice(1).join(' ');
        }

        if (!message) {
            return ctx.reply('❌ Kasih pesan remindernya dong!\nContoh: `/reminder 10m Minum air`',);
        }

        const remindAt = parseRemindTime(timeStr);
        if (!remindAt) {
            return ctx.reply(
                'format waktu ga valid\n\n' +
                'yang didukung:\n' +
                '10m - 10 menit\n' +
                '2h - 2 jam\n' +
                '1d - 1 hari\n' +
                '14:30 - jam tertentu\n' +
                'besok 08:00'
            );
        }

        const result = await addReminder(ctx.from.id, message, remindAt);
        await ctx.reply(result,);
    });

    // ==========================================
    // /list_reminder — List semua reminder aktif
    // ==========================================
    bot.command('list_reminder', async (ctx) => {
        const result = await getUserReminders(ctx.from.id);
        await ctx.reply(result,);
    });

    // ==========================================
    // /hapus_reminder — Hapus reminder by ID
    // ==========================================
    bot.command('hapus_reminder', async (ctx) => {
        const text = ctx.match;
        const id = parseInt(text);
        if (isNaN(id)) {
            return ctx.reply('❌ Format: /hapus_reminder [ID]\nCek ID di /list_reminder',);
        }

        const result = await deleteReminder(id, ctx.from.id);
        await ctx.reply(result,);
    });

    // ==========================================
    // Pesan biasa — AI Chat (Gemini)
    // ==========================================
    bot.on('message:text', async (ctx) => {
        // Tampilkan "typing..." indicator
        await ctx.replyWithChatAction('typing');

        try {
            const response = await chatWithGemini(ctx.from.id, ctx.message.text);
            await ctx.reply(response);
        } catch (error) {
            console.error('AI Error:', error);
            await ctx.reply('haduh ai-nya lagi eror nih, bentar ya');
        }
    });

    // Error handler
    bot.catch((err) => {
        console.error('Bot error:', err);
    });

    return bot;
}
