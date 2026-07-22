// routes/absensi.js
// Metadata absensi (nama, waktu, status) tersimpan permanen di Firestore.
// Catatan: foto masih disimpan di disk server (belum pakai Firebase Storage),
// jadi foto tetap bisa hilang kalau server restart -- ini bisa disambungkan
// ke Storage nanti kalau diaktifkan.

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../models/db');

const router = express.Router();

const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const namaKaryawan = (req.body.nama || 'unknown').replace(/[^a-zA-Z0-9_-]/g, '_');
    const waktu = new Date().toISOString().replace(/[:.]/g, '-');
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `${namaKaryawan}_${waktu}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('File harus berupa gambar.'));
    }
    cb(null, true);
  },
});

router.get('/', async (req, res) => {
  try {
    const snapshot = await db.collection('absensi').orderBy('waktu', 'desc').get();
    const absensi = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.json(absensi);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal mengambil data absensi.' });
  }
});

router.post('/', upload.single('foto'), async (req, res) => {
  const { nama } = req.body;
  if (!nama) {
    return res.status(400).json({ error: 'Nama wajib diisi.' });
  }
  if (!req.file) {
    return res.status(400).json({ error: 'Foto wajib diupload.' });
  }

  try {
    const absensiBaru = {
      nama,
      waktu: new Date().toISOString(),
      status: 'Hadir',
      foto_url: `/uploads/${req.file.filename}`,
    };
    const docRef = await db.collection('absensi').add(absensiBaru);
    res.status(201).json({ id: docRef.id, ...absensiBaru });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal menyimpan absensi.' });
  }
});

module.exports = router;
