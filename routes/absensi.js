// routes/absensi.js
// Metadata absensi tersimpan di Firestore, foto tersimpan permanen di Supabase Storage.

const express = require('express');
const multer = require('multer');
const db = require('../models/db');
const supabase = require('../models/supabase');

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
  const { nama } = req.body;
  if (!nama) {
    return res.status(400).json({ error: 'Nama wajib diisi.' });
  }
  if (!req.file) {
    return res.status(400).json({ error: 'Foto wajib diupload.' });
  }

  try {
    const namaKaryawan = nama.replace(/[^a-zA-Z0-9_-]/g, '_');
    const waktuFile = new Date().toISOString().replace(/[:.]/g, '-');
    const ext = req.file.originalname.split('.').pop() || 'jpg';
    const namaFile = `${namaKaryawan}_${waktuFile}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('absensi-foto')
      .upload(namaFile, req.file.buffer, { contentType: req.file.mimetype });

    if (uploadError) {
      console.error(uploadError);
      return res.status(500).json({ error: 'Gagal upload foto ke storage.' });
    }

    const { data: publicUrlData } = supabase.storage.from('absensi-foto').getPublicUrl(namaFile);
    const fotoUrl = publicUrlData.publicUrl;

    const absensiBaru = {
      nama,
      waktu: new Date().toISOString(),
      status: 'Hadir',
      foto_url: fotoUrl,
    };
    const docRef = await db.collection('absensi').add(absensiBaru);
    res.status(201).json({ id: docRef.id, ...absensiBaru });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal menyimpan absensi.' });
  }
});

module.exports = router;
