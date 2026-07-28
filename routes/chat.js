const express = require("express");
const db = require("../models/db");

const router = express.Router();

// ===== Pola jadwal shift (sama persis dengan yang di app Android) =====
const POLA_SHIFT = ["OFF", "2", "2", "2", "OFF", "1", "1", "1", "OFF", "3", "3", "3"];
const ANCHOR_TANGGAL = Date.UTC(2026, 2, 1); // 1 Maret 2026 (bulan di JS mulai dari 0)

// Ambil waktu sekarang yang sudah dikonversi ke zona WIB (Asia/Jakarta),
// supaya tidak salah tanggal/hari akibat server Render pakai UTC.
function ambilWaktuJakartaSekarang() {
  const jakartaString = new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" });
  return new Date(jakartaString);
}

function getShiftTanggal(tahun, bulanIndex, tanggal) {
  const target = Date.UTC(tahun, bulanIndex, tanggal);
  const diffHari = Math.floor((target - ANCHOR_TANGGAL) / (24 * 60 * 60 * 1000));
  const posisi = ((diffHari % 12) + 12) % 12;
  return POLA_SHIFT[posisi];
}

function buatRingkasanBulan(tahun, bulanIndex) {
  const namaBulan = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
  ];
  const jumlahHari = new Date(tahun, bulanIndex + 1, 0).getDate();
  const counts = { OFF: 0, "1": 0, "2": 0, "3": 0 };
  const baris = [];

  for (let i = 1; i <= jumlahHari; i++) {
    const shift = getShiftTanggal(tahun, bulanIndex, i);
    counts[shift]++;
    baris.push(`${i} ${namaBulan[bulanIndex]}: ${shift === "OFF" ? "OFF (libur)" : "Shift " + shift}`);
  }

  return {
    judul: `${namaBulan[bulanIndex]} ${tahun}`,
    detail: baris.join("\n"),
    ringkasan: `Total di ${namaBulan[bulanIndex]} ${tahun}: OFF ${counts.OFF} hari, Shift 1 sebanyak ${counts["1"]} hari, Shift 2 sebanyak ${counts["2"]} hari, Shift 3 sebanyak ${counts["3"]} hari.`,
  };
}

// Cek apakah API aktif
router.get("/", (req, res) => {
  res.json({
    success: true,
    message: "ShiftBoard AI Chat API aktif (Groq + data project)",
  });
});

// Ambil ringkasan data project buat dikasih ke AI sebagai konteks
async function ambilKonteksData() {
  let teks = "";

  // Karyawan
  try {
    const karyawanSnap = await db.collection("karyawan").orderBy("no", "asc").get();
    const karyawan = karyawanSnap.docs.map((doc) => doc.data());
    if (karyawan.length > 0) {
      teks += "Daftar karyawan saat ini:\n";
      karyawan.forEach((k) => {
        teks += `- No ${k.no}: ${k.nama} (${k.title || "-"})\n`;
      });
    } else {
      teks += "Belum ada data karyawan.\n";
    }
  } catch (err) {
    teks += "(Gagal mengambil data karyawan)\n";
  }

  // Absensi
  try {
    const absensiSnap = await db.collection("absensi").orderBy("waktu", "desc").limit(10).get();
    const absensi = absensiSnap.docs.map((doc) => doc.data());
    if (absensi.length > 0) {
      teks += "\n10 absensi terbaru:\n";
      absensi.forEach((a) => {
        teks += `- ${a.nama} (${a.tipe}) pada ${a.waktu}\n`;
      });
    } else {
      teks += "\nBelum ada data absensi.\n";
    }
  } catch (err) {
    teks += "\n(Gagal mengambil data absensi)\n";
  }

  // Jadwal shift bulan ini & bulan depan (semua dihitung berdasarkan waktu WIB, bukan UTC server)
  const sekarang = ambilWaktuJakartaSekarang();
  const namaHari = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"][sekarang.getDay()];

  const bulanIni = buatRingkasanBulan(sekarang.getFullYear(), sekarang.getMonth());
  const tanggalBulanDepan = new Date(sekarang.getFullYear(), sekarang.getMonth() + 1, 1);
  const bulanDepan = buatRingkasanBulan(tanggalBulanDepan.getFullYear(), tanggalBulanDepan.getMonth());

  teks += `\nHari ini: ${namaHari}, ${sekarang.getDate()} ${bulanIni.judul.split(" ")[0]} ${sekarang.getFullYear()} (waktu WIB/Asia Jakarta, ini sumber kebenaran satu-satunya soal tanggal dan hari, jangan dihitung ulang).\n`;

  teks += `\nPola shift berlaku sama untuk semua karyawan tiap harinya, siklus 12 hari (OFF-2-2-2-OFF-1-1-1-OFF-3-3-3), dimulai dari 1 Maret 2026.\n`;

  teks += `\nJadwal shift bulan ${bulanIni.judul} (bulan berjalan):\n${bulanIni.detail}\n${bulanIni.ringkasan}\n`;

  teks += `\nJadwal shift bulan ${bulanDepan.judul} (bulan depan):\n${bulanDepan.detail}\n${bulanDepan.ringkasan}\n`;

  return teks;
}

// Chat AI
router.post("/", async (req, res) => {
  try {
    const { message, history } = req.body;

    if (!message || message.trim() === "") {
      return res.status(400).json({
        success: false,
        reply: "Pesan tidak boleh kosong.",
      });
    }

    const konteksData = await ambilKonteksData();

    const systemPrompt = `Kamu adalah ShiftBoard AI Assistant.

Tugasmu:
- Jawab dalam Bahasa Indonesia.
- Bersikap ramah, profesional, dan singkat.
- Membantu tentang absensi, jadwal kerja, shift, data karyawan, cuti, dan penggunaan aplikasi ShiftBoard.
- Kalau pertanyaan berhubungan dengan data karyawan/absensi/jadwal shift, jawab berdasarkan data di bawah ini. Jangan mengarang data yang tidak ada.
- SOAL TANGGAL DAN HARI: gunakan PERSIS informasi "Hari ini: ..." di data di bawah, JANGAN pernah menghitung atau menebak nama hari sendiri, karena kamu sering salah hitung.
- Kalau user tanya soal tanggal/bulan di luar data yang diberikan (misal lebih dari 2 bulan ke depan), bilang terus terang kalau datanya belum tersedia, jangan menebak.
- Jika pertanyaan di luar ShiftBoard, tetap jawab dengan baik.

Data project ShiftBoard saat ini:
${konteksData}`;

    const messages = [{ role: "system", content: systemPrompt }];

    if (Array.isArray(history)) {
      history.forEach((h) => {
        if (h && h.role && h.text) {
          messages.push({
            role: h.role === "ai" ? "assistant" : "user",
            content: h.text,
          });
        }
      });
    }

    messages.push({ role: "user", content: message });

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages,
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
