const express = require("express");
const OpenAI = require("openai");

const router = express.Router();

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});


router.get("/", (req, res) => {
  res.json({
    success: true,
    message: "ShiftBoard AI Chat API aktif"
  });
});

router.post("/", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || message.trim() === "") {
      return res.status(400).json({
        success: false,
        reply: "Pesan tidak boleh kosong."
      });
    }

    const response = await client.responses.create({
      model: "gpt-5.5",
      input: [
        {
          role: "system",
          content:
            "Kamu adalah ShiftBoard AI Assistant. Bantu pengguna mengenai absensi, jadwal kerja, data karyawan, dan pertanyaan umum. Jawablah dalam bahasa Indonesia yang sopan, jelas, dan singkat."
        },
        {
          role: "user",
          content: message
        }
      ]
    });

    res.json({
      success: true,
      reply: response.output_text
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      reply: "Terjadi kesalahan pada AI.",
      error: error.message
    });
  }
});

module.exports = router;
