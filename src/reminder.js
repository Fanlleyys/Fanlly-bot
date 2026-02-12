import { eq, and, lte, desc } from 'drizzle-orm';
import { getDb } from './db.js';
import { reminders } from './schema.js';

// Parse waktu dari input user
// Support: "10m" (10 menit), "2h" (2 jam), "14:30" (jam tertentu), "besok 08:00"
export function parseRemindTime(input) {
    const now = new Date();
    const lower = input.toLowerCase().trim();

    // Relatif: 10m, 30m, 1h, 2h, 1d
    const relativeMatch = lower.match(/^(\d+)\s*(m|min|menit|h|jam|hour|d|hari|day)$/);
    if (relativeMatch) {
        const value = parseInt(relativeMatch[1]);
        const unit = relativeMatch[2];
        const ms = now.getTime();

        if (['m', 'min', 'menit'].includes(unit)) {
            return new Date(ms + value * 60 * 1000);
        }
        if (['h', 'jam', 'hour'].includes(unit)) {
            return new Date(ms + value * 60 * 60 * 1000);
        }
        if (['d', 'hari', 'day'].includes(unit)) {
            return new Date(ms + value * 24 * 60 * 60 * 1000);
        }
    }

    // Jam spesifik: 14:30, 08:00
    const timeMatch = lower.match(/^(\d{1,2})[:.:](\d{2})$/);
    if (timeMatch) {
        const hours = parseInt(timeMatch[1]);
        const minutes = parseInt(timeMatch[2]);
        const target = new Date(now);
        target.setHours(hours, minutes, 0, 0);
        // Kalau waktu sudah lewat hari ini, set besok
        if (target <= now) {
            target.setDate(target.getDate() + 1);
        }
        return target;
    }

    // "besok HH:MM"
    const tomorrowMatch = lower.match(/^besok\s+(\d{1,2})[:.:](\d{2})$/);
    if (tomorrowMatch) {
        const hours = parseInt(tomorrowMatch[1]);
        const minutes = parseInt(tomorrowMatch[2]);
        const target = new Date(now);
        target.setDate(target.getDate() + 1);
        target.setHours(hours, minutes, 0, 0);
        return target;
    }

    return null;
}

// Tambah reminder
export async function addReminder(userId, message, remindAt) {
    const db = getDb();

    await db.insert(reminders).values({
        userId,
        message,
        remindAt,
        isSent: false,
    });

    const timeStr = remindAt.toLocaleString('id-ID', {
        timeZone: 'Asia/Jakarta',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });

    return `Reminder disimpan\n\nPesan: ${message}\nWaktu: ${timeStr} WIB`;
}

// Ambil reminder yang sudah waktunya
export async function getDueReminders() {
    const db = getDb();
    const now = new Date();

    return await db.select().from(reminders)
        .where(
            and(
                eq(reminders.isSent, false),
                lte(reminders.remindAt, now)
            )
        );
}

// Tandai reminder sudah terkirim
export async function markAsSent(id) {
    const db = getDb();
    await db.update(reminders)
        .set({ isSent: true })
        .where(eq(reminders.id, id));
}

// List reminder aktif user
export async function getUserReminders(userId) {
    const db = getDb();
    const results = await db.select().from(reminders)
        .where(
            and(
                eq(reminders.userId, userId),
                eq(reminders.isSent, false)
            )
        )
        .orderBy(reminders.remindAt);

    if (results.length === 0) {
        return 'belum ada reminder aktif\n\nbuat baru: /reminder 30m Istirahat';
    }

    let msg = `reminder aktif (${results.length})\n\n`;
    results.forEach((r, i) => {
        const timeStr = new Date(r.remindAt).toLocaleString('id-ID', {
            timeZone: 'Asia/Jakarta',
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
        });
        msg += `${i + 1}. ${r.message}\n   ${timeStr} WIB (ID: ${r.id})\n\n`;
    });

    msg += `hapus reminder: /hapus_reminder [ID]`;
    return msg;
}

// Hapus reminder
export async function deleteReminder(id, userId) {
    const db = getDb();
    const [result] = await db.select().from(reminders)
        .where(
            and(
                eq(reminders.id, id),
                eq(reminders.userId, userId)
            )
        );

    if (!result) {
        return 'reminder ga ketemu atau bukan punya lo';
    }

    await db.delete(reminders).where(eq(reminders.id, id));
    return `reminder "${result.message}" berhasil dihapus`;
}
