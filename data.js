// routes/data.js
// Endpoint untuk simpan & ambil data (contoh: "items"/catatan milik user).
// Semua endpoint di sini butuh login (lihat checkToken di server.js).

const express = require('express');
const db = require('../models/db');

const router = express.Router();

// GET /data -> ambil semua data milik user yang login
router.get('/', (req, res) => {
  const items = db.get('items')
    .filter({ user_id: req.userId })
    .orderBy(['created_at'], ['desc'])
    .value();
  res.json(items);
});

// POST /data -> simpan data baru
router.post('/', (req, res) => {
  const { title, content } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'Judul (title) wajib diisi.' });
  }

  const newItem = {
    id: Date.now(),
    user_id: req.userId,
    title,
    content: content || '',
    created_at: new Date().toISOString(),
  };

  db.get('items').push(newItem).write();

  res.status(201).json(newItem);
});

// PUT /data/:id -> update data
router.put('/:id', (req, res) => {
  const { title, content } = req.body;
  const id = Number(req.params.id);

  const item = db.get('items').find({ id, user_id: req.userId }).value();
  if (!item) {
    return res.status(404).json({ error: 'Data tidak ditemukan.' });
  }

  db.get('items')
    .find({ id, user_id: req.userId })
    .assign({
      title: title || item.title,
      content: content !== undefined ? content : item.content,
    })
    .write();

  res.json({ message: 'Berhasil diupdate.' });
});

// DELETE /data/:id -> hapus data
router.delete('/:id', (req, res) => {
  const id = Number(req.params.id);

  const item = db.get('items').find({ id, user_id: req.userId }).value();
  if (!item) {
    return res.status(404).json({ error: 'Data tidak ditemukan.' });
  }

  db.get('items').remove({ id, user_id: req.userId }).write();
  res.json({ message: 'Berhasil dihapus.' });
});

module.exports = router;
