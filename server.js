// server.js
// Titik masuk utama aplikasi server.

require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const dataRoutes = require('./routes/data');
const karyawanRoutes = require('./routes/karyawan');
const absensiRoutes = require('./routes/absensi');
const checkToken = require('./middleware/checkToken');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors()); // biar app mobile & web boleh akses server ini
app.use(express.json()); // biar server bisa baca data JSON dari request

// Biar foto absensi yang diupload bisa diakses lewat URL, misal:
// https://server-kamu/uploads/nama_file.jpg
app.use('/uploads', express.static('uploads'));

// Endpoint tes, buka di browser: http://localhost:3000
app.get('/', (req, res) => {
  res.send('Server jalan! 🚀');
});

// Endpoint auth: /auth/register, /auth/login (tidak butuh login dulu)
app.use('/auth', authRoutes);

// Endpoint data: /data (WAJIB login, makanya dikasih checkToken)
app.use('/data', checkToken, dataRoutes);

// Endpoint karyawan: GET publik, POST/DELETE khusus admin (dicek di dalam route-nya)
app.use('/karyawan', karyawanRoutes);

// Endpoint absensi: publik (karyawan absen tanpa perlu login)
app.use('/absensi', absensiRoutes);

app.listen(PORT, () => {
  console.log(`Server nyala di http://localhost:${PORT}`);
});
