// server.js
// Titik masuk utama aplikasi server.

require('dotenv').config();

const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const dataRoutes = require('./routes/data');
const karyawanRoutes = require('./routes/karyawan');
const absensiRoutes = require('./routes/absensi');
const breakRoutes = require('./routes/break');
const chatRoutes = require('./routes/chat'); // AI Chat

const checkToken = require('./middleware/checkToken');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Folder upload
app.use('/uploads', express.static('uploads'));

// Test server
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'ShiftBoard API Server',
        version: '2.0',
        ai: 'GPT-5.5',
        status: 'Running'
    });
});

// =====================
// AUTH
// =====================
app.use('/auth', authRoutes);

// =====================
// DATA (WAJIB LOGIN)
// =====================
app.use('/data', checkToken, dataRoutes);

// =====================
// KARYAWAN
// =====================
app.use('/karyawan', karyawanRoutes);

// =====================
// ABSENSI
// =====================
app.use('/absensi', absensiRoutes);

// =====================
// BREAK
// =====================
app.use('/break', breakRoutes);

// =====================
// AI CHAT
// Endpoint:
// POST /api/chat
// =====================
app.use('/api/chat', chatRoutes);

// =====================
// 404
// =====================
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint tidak ditemukan'
    });
});

// =====================
// Error Handler
// =====================
app.use((err, req, res, next) => {
    console.error(err);

    res.status(500).json({
        success: false,
        message: 'Internal Server Error'
    });
});

// =====================
// Start Server
// =====================
app.listen(PORT, () => {
    console.log('================================');
    console.log('ShiftBoard API berjalan');
    console.log(`Port : ${PORT}`);
    console.log(`URL  : http://localhost:${PORT}`);
    console.log('================================');
});
