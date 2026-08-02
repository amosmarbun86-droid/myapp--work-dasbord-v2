// routes/break.js
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

// GET /break/status?nama=... -> cek apakah karyawan ini SEDANG break
router.get('/status', async (req, res) => {
  const { nama } = req.query;
  if (!nama) return res.status(400).json({ error: 'Parameter nama wajib diisi.' });

  try {
    const snapshot = await db
      .collection('break')
      .where('nama', '==', nama)
      .orderBy('waktu', 'desc')
      .limit(1)
      .get();

    if (snapshot.empty) return res.json({ sedangBreak: false, waktuMulai: null });

    const terakhir = snapshot.docs[0].data();
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
      const cekSnapshot = await db
        .collection('break')
        .where('nama', '==', nama)
        .orderBy('waktu', 'desc')
        .limit(1)
        .get();

      if (!cekSnapshot.empty && cekSnapshot.docs[0].data().aksi === 'mulai') {
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
