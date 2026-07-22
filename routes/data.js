// routes/data.js
// Ikut disesuaikan ke Firestore biar konsisten (endpoint ini tidak dipakai
// aplikasi jadwal shift, tapi disesuaikan agar tidak error).

const express = require('express');
const db = require('../models/db');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const snapshot = await db.collection('items')
      .where('user_id', '==', req.userId)
      .orderBy('created_at', 'desc')
      .get();
    const items = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal mengambil data.' });
  }
});

router.post('/', async (req, res) => {
  const { title, content } = req.body;
  if (!title) {
    return res.status(400).json({ error: 'Judul (title) wajib diisi.' });
  }

  try {
    const newItem = { user_id: req.userId, title, content: content || '', created_at: new Date().toISOString() };
    const docRef = await db.collection('items').add(newItem);
    res.status(201).json({ id: docRef.id, ...newItem });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal menyimpan data.' });
  }
});

router.put('/:id', async (req, res) => {
  const { title, content } = req.body;
  try {
    const ref = db.collection('items').doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists || doc.data().user_id !== req.userId) {
      return res.status(404).json({ error: 'Data tidak ditemukan.' });
    }

    await ref.update({
      title: title || doc.data().title,
      content: content !== undefined ? content : doc.data().content,
    });
    res.json({ message: 'Berhasil diupdate.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal update data.' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const ref = db.collection('items').doc(req.params.id);
    const doc = await ref.get();
    if (!doc.exists || doc.data().user_id !== req.userId) {
      return res.status(404).json({ error: 'Data tidak ditemukan.' });
    }

    await ref.delete();
    res.json({ message: 'Berhasil dihapus.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal menghapus data.' });
  }
});

module.exports = router;
