import { pgTable, serial, bigint, text, integer, boolean, timestamp } from 'drizzle-orm/pg-core';

// Tabel transaksi keuangan (pengeluaran/pemasukan)
export const transactions = pgTable('transactions', {
    id: serial('id').primaryKey(),
    userId: bigint('user_id', { mode: 'number' }).notNull(),
    type: text('type').notNull(), // 'income' atau 'expense'
    amount: integer('amount').notNull(),
    category: text('category').default('lainnya'),
    description: text('description'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Tabel reminder
export const reminders = pgTable('reminders', {
    id: serial('id').primaryKey(),
    userId: bigint('user_id', { mode: 'number' }).notNull(),
    message: text('message').notNull(),
    remindAt: timestamp('remind_at').notNull(),
    isSent: boolean('is_sent').default(false).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Tabel riwayat chat (untuk konteks AI)
export const chatHistory = pgTable('chat_history', {
    id: serial('id').primaryKey(),
    userId: bigint('user_id', { mode: 'number' }).notNull(),
    role: text('role').notNull(), // 'user' atau 'model'
    content: text('content').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});
