// routes/absensi.js
// Metadata absensi tersimpan di Firestore, foto tersimpan permanen di Supabase Storage.
// Termasuk penanda tipe (masuk/keluar) dan endpoint hapus.

const express = require('express');
const multer = require('multer');
const db = require('../models/db');
const supabase = require('../models/supabase');
const checkAdmin = require('../middleware/checkAdmin');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
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
  const { nama, tipe } = req.body;
  if (!nama) {
    return res.status(400).json({ error: 'Nama wajib diisi.' });
  }
  if (!tipe || !['masuk', 'keluar'].includes(tipe)) {
    return res.status(400).json({ error: 'Tipe absensi tidak valid.' });
  }
  if (!req.file) {
    return res.status(400).json({ error: 'Foto wajib diupload.' });
  }

  try {
    const namaKaryawan = nama.replace(/[^a-zA-Z0-9_-]/g, '_');
    const waktuFile = new Date().toISOString().replace(/[:.]/g, '-');
    const ext = (req.file.originalname.split('.').pop() || 'jpg').toLowerCase();
    const namaFile = `${namaKaryawan}_${tipe}_${waktuFile}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('absensi-foto')
      .upload(namaFile, req.file.buffer, { contentType: req.file.mimetype });

    if (uploadError) {
      console.error(uploadError);
      return res.status(500).json({ error: 'Gagal upload foto ke storage.' });
    }

    const { data: publicUrlData } = supabase.storage.from('absensi-foto').getPublicUrl(namaFile);

    const absensiBaru = {
      nama,
      tipe,
      waktu: new Date().toISOString(),
      foto_url: publicUrlData.publicUrl,
      foto_path: namaFile,
    };
    const docRef = await db.collection('absensi').add(absensiBaru);
    res.status(201).json({ id: docRef.id, ...absensiBaru });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal menyimpan absensi.' });
  }
});

router.delete('/:id', checkAdmin, async (req, res) => {
  try {
    const ref = db.collection('absensi').doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Data absensi tidak ditemukan.' });
    }

    const data = doc.data();
    if (data.foto_path) {
      await supabase.storage.from('absensi-foto').remove([data.foto_path]);
    }
    await ref.delete();
    res.json({ message: 'Absensi dihapus.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal menghapus absensi.' });
  }
});

module.exports = router;
