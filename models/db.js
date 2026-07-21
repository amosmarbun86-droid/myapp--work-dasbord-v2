// models/db.js
// Pakai lowdb: database murni JavaScript, tersimpan di 1 file "db.json".
// Tidak perlu compile/install database terpisah -> aman dijalankan di Termux.

const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const bcrypt = require('bcryptjs');

const adapter = new FileSync('db.json');
const db = low(adapter);

// Nilai awal kalau db.json masih kosong
db.defaults({ users: [], items: [], karyawan: [], absensi: [] }).write();

// ================== SEED ADMIN ==================
// Buat 1 akun admin otomatis saat server pertama kali jalan,
// berdasarkan ADMIN_EMAIL & ADMIN_PASSWORD di file .env.
// Kalau akun dengan email itu sudah ada, tidak dibuat ulang.
function seedAdmin() {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    console.warn('⚠️  ADMIN_EMAIL / ADMIN_PASSWORD belum diatur di .env — akun admin tidak dibuat.');
    return;
  }

  const existing = db.get('users').find({ email: adminEmail }).value();
  if (existing) {
    // Pastikan role-nya tetap admin walau akun sudah ada sebelumnya
    if (existing.role !== 'admin') {
      db.get('users').find({ email: adminEmail }).assign({ role: 'admin' }).write();
    }
    return;
  }

  const hashedPassword = bcrypt.hashSync(adminPassword, 10);

  db.get('users')
    .push({
      id: Date.now(),
      email: adminEmail,
      password: hashedPassword,
      role: 'admin',
      created_at: new Date().toISOString(),
    })
    .write();

  console.log(`✅ Akun admin dibuat otomatis: ${adminEmail}`);
}

seedAdmin();

module.exports = db;
