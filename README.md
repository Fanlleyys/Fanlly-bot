# 🤖 Telegram Bot — Personal Assistant

Bot Telegram pribadi yang selalu online 24/7. Fitur: tracking keuangan, reminder, dan AI chat dengan Gemini.

## 📋 Fitur

| Command | Fungsi |
|---------|--------|
| `/start` | Pesan selamat datang |
| `/keluar 50k makan` | Catat pengeluaran |
| `/masuk 1jt gaji` | Catat pemasukan |
| `/laporan` | Ringkasan keuangan bulan ini |
| `/laporan_lengkap` | Detail per kategori |
| `/reminder 30m Istirahat` | Set pengingat |
| `/list_reminder` | Lihat semua reminder |
| `/hapus_reminder 1` | Hapus reminder |
| Pesan biasa | Dijawab AI Gemini |

## 🚀 Cara Deploy (Step-by-Step)

### 1. Buat Bot Telegram

1. Buka Telegram, cari **@BotFather**
2. Kirim `/newbot`
3. Ikuti instruksi, beri nama bot kamu
4. Copy **Bot Token** yang dikasih (simpan baik-baik!)

### 2. Buat Database Neon

1. Daftar di [neon.tech](https://neon.tech) (gratis)
2. Klik **Create Project**
3. Pilih region **Singapore** (terdekat)
4. Setelah project dibuat, copy **Connection String** dari dashboard
   - Formatnya: `postgresql://user:pass@ep-xxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require`

### 3. Dapatkan Gemini API Key

1. Buka [aistudio.google.com/apikey](https://aistudio.google.com/apikey)
2. Klik **Create API Key**
3. Copy API key-nya

### 4. Setup Database

```bash
# Install dependencies
npm install

# Copy env file dan isi dengan credentials kamu
cp .env.example .env
# Edit .env dan isi semua value!

# Push schema ke database Neon
npm run db:push
```

### 5. Deploy ke Vercel

1. Push project ini ke **GitHub** (buat repo baru)

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/USERNAME/telegram-bot.git
git push -u origin main
```

2. Buka [vercel.com](https://vercel.com) dan login pakai GitHub
3. Klik **Add New → Project**
4. Import repo `telegram-bot`
5. Di bagian **Environment Variables**, tambahkan:
   - `TELEGRAM_BOT_TOKEN` = token dari BotFather
   - `DATABASE_URL` = connection string dari Neon
   - `GEMINI_API_KEY` = API key dari Google
   - `CRON_SECRET` = string random (buat sendiri, contoh: `mysecret123`)
6. Klik **Deploy**
7. Tunggu sampai deploy selesai, catat URL-nya (contoh: `https://telegram-bot-xxx.vercel.app`)

### 6. Set Webhook Telegram

```bash
# Ganti URL dengan URL Vercel kamu
node scripts/setup-webhook.js https://telegram-bot-xxx.vercel.app
```

### 7. Setup Cron untuk Reminder

Karena Vercel free tier terbatas untuk cron, gunakan **cron-job.org** (gratis):

1. Daftar di [cron-job.org](https://cron-job.org)
2. Buat cron job baru:
   - **URL**: `https://telegram-bot-xxx.vercel.app/api/cron/reminders`
   - **Schedule**: Every 1 minute
   - **Headers**: tambahkan `Authorization: Bearer YOUR_CRON_SECRET`
3. Aktifkan!

### 8. Test Bot

Buka Telegram, cari bot kamu, dan kirim `/start` 🎉

## 🛠 Development Lokal (Opsional)

```bash
# Install
npm install

# Copy dan isi .env
cp .env.example .env

# Push schema ke DB
npm run db:push

# Untuk test lokal, bisa pakai polling mode
# Buat file test.js:
```

```js
// test.js
import 'dotenv/config';
import { createBot } from './src/bot.js';

const bot = createBot();
bot.start();
console.log('🤖 Bot berjalan dalam mode polling...');
```

```bash
node test.js
```

## 📁 Struktur Project

```
telegram-bot/
├── api/
│   ├── webhook.js          # Webhook handler (Vercel)
│   └── cron/
│       └── reminders.js    # Cron job reminder
├── src/
│   ├── bot.js              # Bot logic & commands
│   ├── db.js               # Database client
│   ├── schema.js           # Database schema
│   ├── finance.js          # Modul keuangan
│   ├── reminder.js         # Modul reminder
│   └── gemini.js           # Modul AI chat
├── scripts/
│   └── setup-webhook.js    # Helper setup webhook
├── .env.example
├── vercel.json
└── package.json
```

## 💡 Tips

- **Format jumlah fleksibel**: `50000`, `50k`, `1.5jt`, `2rb`
- **Kategori otomatis**: bot mendeteksi kategori dari keterangan (makan, transport, belanja, dll)
- **Reminder fleksibel**: `10m`, `2h`, `1d`, `14:30`, `besok 08:00`
- **AI punya memori**: bot ingat 10 pesan terakhir sebagai konteks
