# MyApp Server

Server API sederhana buat aplikasi mobile + web kamu. Punya fitur:
- Daftar & login akun (pakai token JWT)
- Simpan, ambil, edit, hapus data (khusus milik user yang login)

Database pakai **SQLite** (tersimpan di 1 file `app.db`, otomatis dibuat saat
server pertama kali jalan) — jadi kamu nggak perlu install database terpisah
buat belajar/development. Kalau nanti mau production skala besar, tinggal
ganti bagian `models/db.js` ke PostgreSQL.

## Cara Menjalankan

1. Pastikan sudah install [Node.js](https://nodejs.org) (versi 18 ke atas)
2. Install dependencies:
   ```
   npm install
   ```
3. Salin file `.env.example` jadi `.env`, lalu ganti `JWT_SECRET` dengan teks
   acak (bebas, makin panjang makin aman):
   ```
   cp .env.example .env
   ```
4. Jalankan server:
   ```
   npm start
   ```
5. Buka browser ke `http://localhost:3000` — kalau muncul "Server jalan! 🚀",
   berarti sukses.

## Daftar Endpoint

### 1. Daftar akun baru
```
POST /auth/register
Body (JSON): { "email": "budi@mail.com", "password": "rahasia123" }
```

### 2. Login
```
POST /auth/login
Body (JSON): { "email": "budi@mail.com", "password": "rahasia123" }

Response: { "token": "xxxxx", "user": { "id": 1, "email": "budi@mail.com" } }
```
Simpan `token` ini di app kamu (misal di local storage/secure storage),
dipakai buat semua request ke `/data`.

### 3. Ambil semua data
```
GET /data
Header: Authorization: Bearer <token>
```

### 4. Simpan data baru
```
POST /data
Header: Authorization: Bearer <token>
Body (JSON): { "title": "Judul", "content": "Isi catatan" }
```

### 5. Edit data
```
PUT /data/1
Header: Authorization: Bearer <token>
Body (JSON): { "title": "Judul baru", "content": "Isi baru" }
```

### 6. Hapus data
```
DELETE /data/1
Header: Authorization: Bearer <token>
```

## Endpoint Jadwal Shift (baru)

### Karyawan

```
GET /karyawan
```
Ambil semua karyawan. Publik, tidak perlu login.

```
POST /karyawan
Header: Authorization: Bearer <token admin>
Body (JSON): { "nama": "Budi", "title": "NEK" }
```
Tambah karyawan baru. Khusus admin.

```
DELETE /karyawan/1
Header: Authorization: Bearer <token admin>
```
Hapus karyawan berdasarkan nomor (`no`). Khusus admin.

### Absensi

```
GET /absensi
```
Ambil semua log absensi (terbaru dulu). Publik.

```
POST /absensi
Body (multipart/form-data):
  nama: "Budi"
  foto: <file gambar>
```
Simpan absensi baru + upload foto. Publik, tidak perlu login. Foto tersimpan
di folder `uploads/` dan bisa diakses lewat `foto_url` yang dikembalikan
(misalnya `https://server-kamu/uploads/Budi_2026-07-21T...jpg`).

## Akun Admin

Akun admin dibuat **otomatis** saat server pertama kali jalan, berdasarkan
`ADMIN_EMAIL` dan `ADMIN_PASSWORD` di file `.env`. Login sebagai admin lewat
endpoint yang sama seperti user biasa:

```
POST /auth/login
Body (JSON): { "email": "admin@shiftapp.com", "password": "..." }
```

Token yang didapat dari login ini punya akses ke endpoint khusus admin
(`POST /karyawan`, `DELETE /karyawan/:no`).

## Cara App Mobile/Web Kamu Manggil Server Ini

Contoh dari JavaScript (web) atau React Native (mobile), sama caranya:

```js
// Login
const res = await fetch('http://ALAMAT-SERVER-KAMU:3000/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'budi@mail.com', password: 'rahasia123' }),
});
const data = await res.json();
const token = data.token; // simpan token ini

// Ambil data (butuh token)
const res2 = await fetch('http://ALAMAT-SERVER-KAMU:3000/data', {
  headers: { 'Authorization': `Bearer ${token}` },
});
const items = await res2.json();
```

Kalau develop di HP fisik/emulator, ganti `localhost` dengan alamat IP
komputer kamu di jaringan yang sama (misal `192.168.1.5`).

## Deploy ke Internet (biar bisa diakses dari mana saja)

Kalau mau app kamu bisa dipakai orang lain (bukan cuma di laptop sendiri),
server ini perlu di-deploy ke VPS/hosting, misalnya:
- **Railway** atau **Render** — paling gampang buat pemula, tinggal connect
  repo GitHub, otomatis jalan
- **DigitalOcean/Contabo VPS** — lebih fleksibel tapi perlu setup manual
  (install Node.js, pakai PM2 biar server nggak mati, Nginx buat domain)

Kalau sudah siap ke tahap ini, bilang aja, nanti aku bantu step-by-step
deploy-nya juga.
