// middleware/checkAdmin.js
// Sama seperti checkToken, tapi tambahan: user harus punya role "admin".
// Dipakai buat endpoint yang cuma boleh diakses admin (tambah/hapus karyawan, dll).

const jwt = require('jsonwebtoken');
const db = require('../models/db');

function checkAdmin(req, res, next) {
  const authHeader = req.headers['authorization']; // format: "Bearer <token>"
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Belum login. Token tidak ditemukan.' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Token tidak valid atau sudah kedaluwarsa.' });
    }

    const user = db.get('users').find({ id: decoded.userId }).value();

    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Hanya admin yang boleh melakukan ini.' });
    }

    req.userId = decoded.userId;
    next();
  });
}

module.exports = checkAdmin;
