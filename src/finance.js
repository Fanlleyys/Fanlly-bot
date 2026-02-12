import { eq, and, sql, desc } from 'drizzle-orm';
import { getDb } from './db.js';
import { transactions } from './schema.js';

// Kategori otomatis dari keterangan
const CATEGORY_KEYWORDS = {
    makan: ['makan', 'nasi', 'ayam', 'mie', 'kopi', 'minum', 'snack', 'jajan', 'resto', 'cafe', 'bakso', 'sate', 'gorengan', 'indomie', 'boba', 'es teh'],
    transport: ['grab', 'gojek', 'ojol', 'bensin', 'parkir', 'tol', 'bus', 'kereta', 'angkot', 'taxi', 'motor', 'bbm'],
    belanja: ['beli', 'belanja', 'shopee', 'tokped', 'lazada', 'toko', 'baju', 'sepatu', 'hp', 'gadget'],
    tagihan: ['listrik', 'air', 'wifi', 'internet', 'pulsa', 'kuota', 'pln', 'indihome', 'token'],
    hiburan: ['game', 'netflix', 'spotify', 'nonton', 'bioskop', 'main', 'liburan', 'wisata', 'hangout'],
    kesehatan: ['obat', 'dokter', 'apotek', 'rumah sakit', 'klinik', 'vitamin', 'sakit'],
    pendidikan: ['buku', 'kursus', 'les', 'sekolah', 'kuliah', 'ujian', 'fotokopi', 'print'],
    gaji: ['gaji', 'salary', 'honor', 'upah', 'bonus', 'thr'],
    freelance: ['freelance', 'project', 'klien', 'client', 'invoice'],
    transfer: ['transfer', 'tf', 'kiriman', 'dapat', 'terima'],
};

function detectCategory(description) {
    if (!description) return 'lainnya';
    const lower = description.toLowerCase();
    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
        if (keywords.some(keyword => lower.includes(keyword))) {
            return category;
        }
    }
    return 'lainnya';
}

// Format angka ke Rupiah
function formatRupiah(amount) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
    }).format(amount);
}

// Parse jumlah dari teks (support "50k", "1.5jt", "1500000")
export function parseAmount(text) {
    if (!text) return null;
    let cleaned = text.toLowerCase().replace(/[^\d.,kjtrb]/g, '');

    let multiplier = 1;
    if (cleaned.includes('k') || cleaned.includes('rb')) {
        multiplier = 1000;
        cleaned = cleaned.replace(/[kjtrb]/g, '');
    } else if (cleaned.includes('jt') || cleaned.includes('j')) {
        multiplier = 1000000;
        cleaned = cleaned.replace(/[jt]/g, '');
    }

    cleaned = cleaned.replace(/\./g, '').replace(/,/g, '.');
    const num = parseFloat(cleaned);
    if (isNaN(num)) return null;

    return Math.round(num * multiplier);
}

// Tambah transaksi
export async function addTransaction(userId, type, amount, description) {
    const db = getDb();
    const category = detectCategory(description);

    const [result] = await db.insert(transactions).values({
        userId,
        type,
        amount,
        category,
        description: description || null,
    }).returning();

    const label = type === 'expense' ? 'Pengeluaran' : 'Pemasukan';

    return `${label} tercatat\n\nJumlah: ${formatRupiah(amount)}\nKategori: ${category}\nKeterangan: ${description || '-'}\nWaktu: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`;
}

// Laporan bulanan
export async function getMonthlyReport(userId) {
    const db = getDb();
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const results = await db.select().from(transactions)
        .where(
            and(
                eq(transactions.userId, userId),
                sql`${transactions.createdAt} >= ${startOfMonth.toISOString()}`
            )
        )
        .orderBy(desc(transactions.createdAt));

    if (results.length === 0) {
        return 'belum ada transaksi bulan ini\n\ncatat pake:\n/keluar 50000 makan siang\n/masuk 1000000 gaji';
    }

    let totalIncome = 0;
    let totalExpense = 0;

    results.forEach(t => {
        if (t.type === 'income') totalIncome += t.amount;
        else totalExpense += t.amount;
    });

    const balance = totalIncome - totalExpense;
    const monthName = now.toLocaleString('id-ID', { month: 'long', year: 'numeric' });

    return `laporan keuangan - ${monthName}\n\nPemasukan: ${formatRupiah(totalIncome)}\nPengeluaran: ${formatRupiah(totalExpense)}\nSaldo: ${formatRupiah(balance)}\n\nTotal transaksi: ${results.length}`;
}

// Laporan detail dengan breakdown kategori
export async function getDetailedReport(userId) {
    const db = getDb();
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const results = await db.select().from(transactions)
        .where(
            and(
                eq(transactions.userId, userId),
                sql`${transactions.createdAt} >= ${startOfMonth.toISOString()}`
            )
        )
        .orderBy(desc(transactions.createdAt));

    if (results.length === 0) {
        return 'belum ada transaksi bulan ini';
    }

    // Group by category
    const expenseByCategory = {};
    const incomeByCategory = {};
    let totalIncome = 0;
    let totalExpense = 0;

    results.forEach(t => {
        if (t.type === 'expense') {
            totalExpense += t.amount;
            expenseByCategory[t.category] = (expenseByCategory[t.category] || 0) + t.amount;
        } else {
            totalIncome += t.amount;
            incomeByCategory[t.category] = (incomeByCategory[t.category] || 0) + t.amount;
        }
    });

    const monthName = now.toLocaleString('id-ID', { month: 'long', year: 'numeric' });
    let msg = `laporan detail - ${monthName}\n\n`;

    if (Object.keys(incomeByCategory).length > 0) {
        msg += `PEMASUKAN (${formatRupiah(totalIncome)})\n`;
        for (const [cat, amount] of Object.entries(incomeByCategory).sort((a, b) => b[1] - a[1])) {
            msg += `  ${cat}: ${formatRupiah(amount)}\n`;
        }
        msg += '\n';
    }

    if (Object.keys(expenseByCategory).length > 0) {
        msg += `PENGELUARAN (${formatRupiah(totalExpense)})\n`;
        for (const [cat, amount] of Object.entries(expenseByCategory).sort((a, b) => b[1] - a[1])) {
            msg += `  ${cat}: ${formatRupiah(amount)}\n`;
        }
        msg += '\n';
    }

    const balance = totalIncome - totalExpense;
    msg += `Saldo: ${formatRupiah(balance)}`;

    // Last 5 transactions
    msg += '\n\n5 transaksi terakhir:\n';
    results.slice(0, 5).forEach(t => {
        const sign = t.type === 'expense' ? '-' : '+';
        const date = new Date(t.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
        msg += `${sign} ${date} ${formatRupiah(t.amount)} (${t.description || t.category})\n`;
    });

    return msg;
}
