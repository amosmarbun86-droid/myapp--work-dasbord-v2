const express = require("express");

const router = express.Router();

// Cek apakah API aktif
router.get("/", (req, res) => {
  res.json({
    success: true,
    message: "ShiftBoard AI Chat API aktif (Groq)"
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

    const systemPrompt = `Kamu adalah ShiftBoard AI Assistant.

Tugasmu:
- Jawab dalam Bahasa Indonesia.
- Bersikap ramah, profesional, dan singkat.
- Membantu tentang absensi, jadwal kerja, shift, data karyawan, cuti, dan penggunaan aplikasi ShiftBoard.
- Jika pertanyaan di luar ShiftBoard, tetap jawab dengan baik.`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
        ],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(data);
      return res.status(500).json({
        success: false,
        reply: "Terjadi kesalahan pada Groq AI.",
        error: data.error?.message || "Unknown error",
      });
    }

    res.json({
      success: true,
      reply: data.choices[0].message.content,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      reply: "Terjadi kesalahan pada Groq AI.",
      error: err.message,
    });
  }
});

module.exports = router;
