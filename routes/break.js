// routes/break.js
// Riwayat break karyawan tersimpan di Firestore, koleksi "break".
// Query sengaja TIDAK pakai .orderBy() di Firestore (supaya tidak butuh
// composite index) -- pengurutan dilakukan di kode JS setelah data diambil.

const express = require('express');
const db = require('../models/db');

const router = express.Router();

// Ambil record TERAKHIR (waktu paling baru) untuk 1 nama tertentu
async function ambilRecordTerakhir(nama) {
  const snapshot = await db.collection('break').where('nama', '==', nama).get();

  if (snapshot.empty) {
    return null;
  }

  let terbaru = null;

  snapshot.forEach((doc) => {
    const data = doc.data();
    if (!terbaru || new Date(data.waktu) > new Date(terbaru.waktu)) {
      terbaru = data;
    }
  });

  return terbaru;
}

// GET /break -> ambil semua riwayat break (terbaru dulu)
router.get('/', async (req, res) => {
  try {
    const snapshot = await db.collection('break').get();
    const daftar = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    daftar.sort((a, b) => new Date(b.waktu) - new Date(a.waktu));

    res.json(daftar);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal mengambil data break.' });
  }
});

// GET /break/status?nama=... -> cek apakah karyawan ini SEDANG break
router.get('/status', async (req, res) => {
  const { nama } = req.query;
  if (!nama) return res.status(400).json({ error: 'Parameter nama wajib diisi.' });

  try {
    const terakhir = await ambilRecordTerakhir(nama);

    if (!terakhir) {
      return res.json({ sedangBreak: false, waktuMulai: null });
    }

    if (terakhir.aksi === 'mulai') {
      return res.json({ sedangBreak: true, waktuMulai: terakhir.waktu });
    }

    return res.json({ sedangBreak: false, waktuMulai: null });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal mengambil status break.' });
  }
});

// POST /break -> catat mulai atau selesai break
router.post('/', async (req, res) => {
  const { nama, aksi, durasiDetik } = req.body;

  if (!nama) return res.status(400).json({ error: 'Nama wajib diisi.' });
  if (!aksi || !['mulai', 'selesai'].includes(aksi)) {
    return res.status(400).json({ error: 'Aksi tidak valid (harus "mulai" atau "selesai").' });
  }

  try {
    if (aksi === 'mulai') {
      const terakhir = await ambilRecordTerakhir(nama);
      if (terakhir && terakhir.aksi === 'mulai') {
        return res.status(400).json({ error: nama + ' sudah sedang break.' });
      }
    }

    const breakBaru = {
      nama,
      aksi,
      waktu: new Date().toISOString(),
      durasiDetik: aksi === 'selesai' ? (durasiDetik || 0) : null,
    };

    const docRef = await db.collection('break').add(breakBaru);
    res.status(201).json({ id: docRef.id, ...breakBaru });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal menyimpan data break.' });
  }
});

module.exports = router;
