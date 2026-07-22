// routes/karyawan.js
// Data karyawan sekarang tersimpan permanen di Firestore.

const express = require('express');
const db = require('../models/db');
const checkAdmin = require('../middleware/checkAdmin');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const snapshot = await db.collection('karyawan').orderBy('no', 'asc').get();
    const karyawan = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.json(karyawan);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal mengambil data karyawan.' });
  }
});

router.post('/', checkAdmin, async (req, res) => {
  const { nama, title } = req.body;
  if (!nama) {
    return res.status(400).json({ error: 'Nama wajib diisi.' });
  }

  try {
    const snapshot = await db.collection('karyawan').orderBy('no', 'desc').limit(1).get();
    const noBaru = snapshot.empty ? 1 : snapshot.docs[0].data().no + 1;

    const karyawanBaru = {
      no: noBaru,
      nama,
      title: title || '',
      created_at: new Date().toISOString(),
    };
    const docRef = await db.collection('karyawan').add(karyawanBaru);

    res.status(201).json({ id: docRef.id, ...karyawanBaru });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal menambah karyawan.' });
  }
});

router.delete('/:no', checkAdmin, async (req, res) => {
  const no = Number(req.params.no);
  try {
    const snapshot = await db.collection('karyawan').where('no', '==', no).get();
    if (snapshot.empty) {
      return res.status(404).json({ error: 'Karyawan tidak ditemukan.' });
    }

    const batch = db.batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();

    res.json({ message: 'Karyawan dihapus.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal menghapus karyawan.' });
  }
});

module.exports = router;
