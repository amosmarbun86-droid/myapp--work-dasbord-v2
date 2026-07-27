const express = require("express");
const { GoogleGenAI } = require("@google/genai");

const router = express.Router();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

router.get("/", (req, res) => {
  res.json({
    success: true,
    message: "ShiftBoard AI Chat API aktif (Gemini)"
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

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `
Kamu adalah ShiftBoard AI Assistant.

Jawablah dalam Bahasa Indonesia.

Pengguna bertanya:
${message}
`
    });

    res.json({
      success: true,
      reply: response.text
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      reply: "Terjadi kesalahan pada Gemini AI.",
      error: error.message
    });
  }
});

module.exports = router;
