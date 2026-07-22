// models/db.js
// Database sekarang pakai Firestore (Firebase), bukan file lokal lagi.
// Jadi data aman permanen walau server Render restart/sleep.

const admin = require('firebase-admin');
const bcrypt = require('bcryptjs');

function loadServiceAccount() {
  const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (!b64) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_BASE64 belum diatur di Environment Variables.');
  }
  const json = Buffer.from(b64, 'base64').toString('utf8');
  return JSON.parse(json);
}

admin.initializeApp({
  credential: admin.credential.cert(loadServiceAccount()),
});

const db = admin.firestore();

// ================== SEED ADMIN ==================
// Buat 1 akun admin otomatis saat server pertama kali jalan,
// berdasarkan ADMIN_EMAIL & ADMIN_PASSWORD di Environment Variables.
async function seedAdmin() {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    console.warn('⚠️  ADMIN_EMAIL / ADMIN_PASSWORD belum diatur — akun admin tidak dibuat.');
    return;
  }

  const snapshot = await db.collection('users').where('email', '==', adminEmail).limit(1).get();

  if (!snapshot.empty) {
    const doc = snapshot.docs[0];
    if (doc.data().role !== 'admin') {
      await doc.ref.update({ role: 'admin' });
    }
    return;
  }

  const hashedPassword = bcrypt.hashSync(adminPassword, 10);
  await db.collection('users').add({
    email: adminEmail,
    password: hashedPassword,
    role: 'admin',
    created_at: new Date().toISOString(),
  });

  console.log(`✅ Akun admin dibuat otomatis: ${adminEmail}`);
}

seedAdmin().catch((err) => console.error('Gagal membuat akun admin:', err.message));

module.exports = db;
