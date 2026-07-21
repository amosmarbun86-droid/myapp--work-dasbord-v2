// routes/absensi.js
// Endpoint untuk absensi karyawan + upload foto absen.
// Publik (tanpa login) supaya karyawan bisa absen langsung dari HP masing-masing.

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../models/db');

const router = express.Router();

// Folder penyimpanan foto absensi
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
  limits: { fileSize: 5 * 1024 * 1024 }, // maks 5MB per foto
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('File harus berupa gambar.'));
    }
    cb(null, true);
  },
});

// GET /absensi -> daftar log absensi, terbaru dulu (publik)
router.get('/', (req, res) => {
  const absensi = db.get('absensi').orderBy(['waktu'], ['desc']).value();
  res.json(absensi);
});

// POST /absensi -> simpan absensi baru + upload foto
// Kirim sebagai multipart/form-data dengan field: nama (text), foto (file)
router.post('/', upload.single('foto'), (req, res) => {
  const { nama } = req.body;

  if (!nama) {
    return res.status(400).json({ error: 'Nama wajib diisi.' });
  }
  if (!req.file) {
    return res.status(400).json({ error: 'Foto wajib diupload.' });
  }

  const absensiBaru = {
    id: Date.now(),
    nama,
    waktu: new Date().toISOString(),
    status: 'Hadir',
    foto_url: `/uploads/${req.file.filename}`,
  };

  db.get('absensi').push(absensiBaru).write();

  res.status(201).json(absensiBaru);
});

module.exports = router;
