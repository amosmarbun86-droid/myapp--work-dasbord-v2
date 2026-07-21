// routes/karyawan.js
// Endpoint untuk data karyawan (dipakai buat generate jadwal shift).
// GET boleh diakses siapa saja (buat lihat jadwal). Tambah/hapus khusus admin.

const express = require('express');
const db = require('../models/db');
const checkAdmin = require('../middleware/checkAdmin');

const router = express.Router();

// GET /karyawan -> daftar semua karyawan (publik)
router.get('/', (req, res) => {
  const karyawan = db.get('karyawan').orderBy(['no'], ['asc']).value();
  res.json(karyawan);
});

// POST /karyawan -> tambah karyawan baru (khusus admin)
// Body (JSON): { "nama": "Budi", "title": "NEK" }
router.post('/', checkAdmin, (req, res) => {
  const { nama, title } = req.body;

  if (!nama) {
    return res.status(400).json({ error: 'Nama wajib diisi.' });
  }

  const semua = db.get('karyawan').value();
  const noBaru = semua.length > 0 ? Math.max(...semua.map((k) => k.no)) + 1 : 1;

  const karyawanBaru = {
    no: noBaru,
    nama,
    title: title || '',
    created_at: new Date().toISOString(),
  };

  db.get('karyawan').push(karyawanBaru).write();

  res.status(201).json(karyawanBaru);
});

// DELETE /karyawan/:no -> hapus karyawan berdasarkan nomor (khusus admin)
router.delete('/:no', checkAdmin, (req, res) => {
  const no = Number(req.params.no);

  const karyawan = db.get('karyawan').find({ no }).value();
  if (!karyawan) {
    return res.status(404).json({ error: 'Karyawan tidak ditemukan.' });
  }

  db.get('karyawan').remove({ no }).write();
  res.json({ message: 'Karyawan dihapus.' });
});

module.exports = router;
