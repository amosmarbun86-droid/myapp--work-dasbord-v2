// routes/auth.js
// Endpoint untuk daftar akun baru dan login, sekarang pakai Firestore.

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../models/db');

const router = express.Router();

router.post('/register', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email dan password wajib diisi.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password minimal 6 karakter.' });
  }

  try {
    const existing = await db.collection('users').where('email', '==', email).limit(1).get();
    if (!existing.empty) {
      return res.status(409).json({ error: 'Email sudah terdaftar.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const docRef = await db.collection('users').add({
      email,
      password: hashedPassword,
      created_at: new Date().toISOString(),
    });

    res.status(201).json({ message: 'Berhasil daftar!', userId: docRef.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Terjadi kesalahan di server.' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email dan password wajib diisi.' });
  }

  try {
    const snapshot = await db.collection('users').where('email', '==', email).limit(1).get();
    if (snapshot.empty) {
      return res.status(401).json({ error: 'Email atau password salah.' });
    }

    const doc = snapshot.docs[0];
    const user = doc.data();
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Email atau password salah.' });
    }

    const token = jwt.sign({ userId: doc.id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({ message: 'Berhasil login!', token, user: { id: doc.id, email: user.email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Terjadi kesalahan di server.' });
  }
});

module.exports = router;
