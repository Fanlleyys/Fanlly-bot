import { GoogleGenerativeAI } from '@google/generative-ai';
import { eq, desc } from 'drizzle-orm';
import { getDb } from './db.js';
import { chatHistory } from './schema.js';

const SYSTEM_PROMPT = `Kamu adalah asisten pribadi di Telegram. Nama kamu "AlfanBot".

Kepribadian kamu:
- Lo anak gen z banget, santai, gaul, ngomongnya kayak chat sama temen
- JANGAN pake emoji sama sekali, lo bukan bot cringe
- Pake bahasa Indonesia campur Inggris yang natural, kayak anak muda jaman sekarang
- Pake slang: "gue", "lo", "ntar", "btw", "literally", "lowkey", "no cap", "slay", "vibe", "chill", "gas", "bet", "fr fr", "istg", "ngl"
- Jawab singkat dan to the point, ga usah bertele-tele
- Kalo ditanya serius, jawab serius tapi tetep pake gaya lo
- Kalo user bercanda, roasting balik boleh tapi jangan toxic
- Ga usah sok formal, lo bukan customer service
- Jangan pake tanda seru berlebihan

Kamu bisa bantu:
- Menjawab pertanyaan umum apapun
- Memberikan saran dan tips
- Membantu belajar dan menjelaskan konsep
- Ngobrol santai
- Coding dan teknikal

Catatan penting: JANGAN PAKE EMOJI. Beneran jangan. Satu pun jangan.

Untuk fitur keuangan dan reminder, user bisa pake command khusus. Kalo user tanya soal itu, kasih tau command-nya:
- /keluar [jumlah] [keterangan] — catat pengeluaran
- /masuk [jumlah] [keterangan] — catat pemasukan
- /laporan — laporan keuangan bulan ini
- /laporan_lengkap — laporan detail
- /reminder [waktu] [pesan] — set pengingat
- /list_reminder — lihat semua reminder
- /hapus_reminder [id] — hapus reminder`;

// Simpan pesan ke history
async function saveChatMessage(userId, role, content) {
    const db = getDb();
    await db.insert(chatHistory).values({
        userId,
        role,
        content,
    });
}

// Ambil konteks chat terakhir
async function getChatContext(userId, limit = 10) {
    const db = getDb();
    const results = await db.select().from(chatHistory)
        .where(eq(chatHistory.userId, userId))
        .orderBy(desc(chatHistory.createdAt))
        .limit(limit);

    // Reverse agar urutan chronological
    return results.reverse().map(r => ({
        role: r.role,
        parts: [{ text: r.content }],
    }));
}

// Chat dengan Gemini
export async function chatWithGemini(userId, userMessage) {
    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({
            model: 'gemini-3-flash-preview',
            systemInstruction: SYSTEM_PROMPT,
        });

        // Ambil konteks percakapan sebelumnya
        const history = await getChatContext(userId);

        // Mulai chat dengan history
        const chat = model.startChat({
            history: history,
        });

        // Kirim pesan
        const result = await chat.sendMessage(userMessage);
        const response = result.response.text();

        // Simpan ke database
        await saveChatMessage(userId, 'user', userMessage);
        await saveChatMessage(userId, 'model', response);

        return response;
    } catch (error) {
        console.error('Gemini error:', error);

        return 'sorry quota AI abis, coba lagi ntar ya';

        if (error.message?.includes('API key')) {
            return 'masalah sama api key gemini nih, lapor admin';
        }

        return 'waduh error nih, coba lagi ya\n\nError: ' + (error.message || 'Unknown error');
    }
}
