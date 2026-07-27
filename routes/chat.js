const express = require("express");
const { GoogleGenAI } = require("@google/genai");

const router = express.Router();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// Cek apakah API aktif
router.get("/", (req, res) => {
  res.json({
    success: true,
    message: "ShiftBoard AI Chat API aktif (Gemini)"
  });
});

// Chat AI
router.post("/", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || message.trim() === "") {
      return res.status(400).json({
        success: false,
        reply: "Pesan tidak boleh kosong."
      });
    }

    const prompt = `
Kamu adalah ShiftBoard AI Assistant.

Tugasmu:
- Jawab dalam Bahasa Indonesia.
- Bersikap ramah, profesional, dan singkat.
- Membantu tentang absensi, jadwal kerja, shift, data karyawan, cuti, dan penggunaan aplikasi ShiftBoard.
- Jika pertanyaan di luar ShiftBoard, tetap jawab dengan baik.

Pertanyaan pengguna:
${message}
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    res.json({
      success: true,
      reply: response.text,
    });

  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      reply: "Terjadi kesalahan pada Gemini AI.",
      error: err.message,
    });
  }
});

module.exports = router;
