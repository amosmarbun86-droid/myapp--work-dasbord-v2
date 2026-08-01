// routes/break.js
// Riwayat break karyawan tersimpan di Firestore, koleksi "break".
// Dipakai karyawan biasa (tanpa login admin), sama seperti /absensi.

const express = require('express');
const db = require('../models/db');

const router = express.Router();

// GET /break -> ambil semua riwayat break (terbaru dulu)
router.get('/', async (req, res) => {
  try {
    const snapshot = await db.collection('break').orderBy('waktu', 'desc').get();
    const daftar = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.json(daftar);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal mengambil data break.' });
  }
});

// POST /break -> catat mulai atau selesai break
// Body mulai   : { nama, aksi: "mulai" }
// Body selesai : { nama, aksi: "selesai", durasiDetik }
router.post('/', async (req, res) => {
  const { nama, aksi, durasiDetik } = req.body;

  if (!nama) {
    return res.status(400).json({ error: 'Nama wajib diisi.' });
  }
  if (!aksi || !['mulai', 'selesai'].includes(aksi)) {
    return res.status(400).json({ error: 'Aksi tidak valid (harus "mulai" atau "selesai").' });
  }

  try {
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
