# MyApp Server

Server API sederhana untuk aplikasi mobile + web — fitur:
- Daftar & login akun (pakai token JWT)
- Simpan, ambil, edit, hapus data (khusus milik user yang login)
- Manajemen karyawan & absensi, upload foto
- Endpoint chat AI (opsional, tergantung konfigurasi)

Perubahan penting: aplikasi ini menggunakan Firebase Firestore (melalui `firebase-admin`) sebagai penyimpanan, bukan SQLite. README sebelumnya menyebut `app.db`/SQLite — itu sudah tidak sesuai dengan implementasi saat ini (lihat `models/db.js`).

## Stack
- **Language(s):** JavaScript (Node.js)
- **Framework / runtime:** Node.js + Express
- **Notable libraries:** `firebase-admin`, `jsonwebtoken`, `multer`, `bcryptjs`

## Cara Menjalankan (singkat)
1. Install dependencies:

```bash
npm install
```

2. Salin file contoh environment dan edit:

```bash
cp .env.example .env
```

3. Isi variabel environment penting di `.env` (lihat penjelasan di bawah).

4. Jalankan server:

```bash
npm start
```

5. Buka: `http://localhost:3000` — seharusnya merespon JSON dengan `ShiftBoard API Server`.

## Environment variables yang wajib/utama
Tambahkan dan isi variabel-variabel ini di `.env` (atau set sebagai secret di platform deploy):

- `PORT` — port server (opsional, default 3000)
- `JWT_SECRET` — kunci rahasia untuk menandatangani/verifikasi JWT
- `ADMIN_EMAIL` — email admin yang akan dibuat otomatis saat server pertama kali start
- `ADMIN_PASSWORD` — password admin (akan di-hash sebelum disimpan)
- `FIREBASE_SERVICE_ACCOUNT_BASE64` — Service Account JSON untuk Firebase Admin yang sudah di-encode ke Base64

Contoh singkat `.env` (JANGAN commit ini ke repo):

```
PORT=3000
JWT_SECRET=isi_dengan_teks_rahasia_panjang
ADMIN_EMAIL=admin@shiftapp.com
ADMIN_PASSWORD=rahasia_admin
FIREBASE_SERVICE_ACCOUNT_BASE64=eyJ0eXAiOiJKV1QiL... (panjang)
```

### Cara membuat FIREBASE_SERVICE_ACCOUNT_BASE64
- Dari Linux/macOS (bash):

```bash
cat serviceAccountKey.json | base64 | tr -d '\n' > serviceAccount_base64.txt
```

- Atau (node):

```bash
node -e "console.log(Buffer.from(require('./serviceAccountKey.json')).toString('base64'))" > serviceAccount_base64.txt
```

- PowerShell (Windows):

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("serviceAccountKey.json")) > serviceAccount_base64.txt
```

Copy isi file `serviceAccount_base64.txt` ke value `FIREBASE_SERVICE_ACCOUNT_BASE64` di `.env`.

PENTING: jangan commit `serviceAccountKey.json` atau isi base64-nya ke repository publik. Gunakan secret manager di platform hosting.

## Perbedaan penting (README lama vs kode)
- README lama menyebut SQLite (`app.db`) — saat ini kode menggunakan Firestore lewat `models/db.js`. Jika kamu ingin kembali ke SQLite, ubah `models/db.js` dan bagian inisialisasi database.
- `models/db.js` membuat akun admin otomatis berdasarkan `ADMIN_EMAIL`/`ADMIN_PASSWORD` jika belum ada.

## Folder `uploads`
Server meng-serve folder `uploads/` sebagai statis (`/uploads`). Pastikan folder ini ada dan dapat ditulis oleh proses Node. Kamu bisa membuatnya sebelum menjalankan server:

```bash
mkdir -p uploads
chmod 755 uploads
```

## Daftar endpoint (singkat)
- POST /auth/register — daftar akun
- POST /auth/login — login (mengembalikan token JWT)
- GET /data, POST /data, PUT /data/:id, DELETE /data/:id — operasi data user (butuh Authorization: Bearer <token>)
- GET /karyawan — publik
- POST /karyawan, DELETE /karyawan/:no — admin saja
- GET /absensi, POST /absensi — simpan absensi + upload foto (multipart/form-data)
- POST /api/chat — endpoint chat AI (periksa konfigurasi & dependensi)

Lihat implementasi di folder `routes/` untuk detail parameter dan respons.

## Keamanan & deploy
- Jangan commit kredensial ke repo.
- Di deploy (Railway/Render/VPS), simpan `FIREBASE_SERVICE_ACCOUNT_BASE64` dan `JWT_SECRET` sebagai secret/environment.
- Pastikan rules Firestore sesuai kebutuhan dan hanya admin mendapat akses admin-only di aplikasi.

---
Jika mau, saya bisa:
- Memperbarui juga `.env.example` agar mencantumkan variabel baru dan contoh format base64, atau
- Membuat PR yang menambahkan pengecekan saat server start (cek env vars & buat folder `uploads` otomatis).

Katakan mana yang kamu mau, saya akan lanjutkan.