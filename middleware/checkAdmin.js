// middleware/checkAdmin.js
// Cek token JWT + pastikan user tersebut punya role "admin" di Firestore.

const jwt = require('jsonwebtoken');
const db = require('../models/db');

function checkAdmin(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Belum login. Token tidak ditemukan.' });
  }

  jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Token tidak valid atau sudah kedaluwarsa.' });
    }

    try {
      const doc = await db.collection('users').doc(decoded.userId).get();
      if (!doc.exists || doc.data().role !== 'admin') {
        return res.status(403).json({ error: 'Hanya admin yang boleh melakukan ini.' });
      }
      req.userId = decoded.userId;
      next();
    } catch (e) {
      res.status(500).json({ error: 'Terjadi kesalahan di server.' });
    }
  });
}

module.exports = checkAdmin;
