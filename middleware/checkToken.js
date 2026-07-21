// middleware/checkToken.js
// Ini "penjaga pintu" — dipasang di endpoint yang cuma boleh diakses
// kalau user sudah login (bawa token yang valid).

const jwt = require('jsonwebtoken');

function checkToken(req, res, next) {
  const authHeader = req.headers['authorization']; // format: "Bearer <token>"
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Belum login. Token tidak ditemukan.' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Token tidak valid atau sudah kedaluwarsa.' });
    }
    req.userId = decoded.userId; // simpan info user yang login ke request
    next(); // lanjut ke handler berikutnya
  });
}

module.exports = checkToken;
