const express = require("express");
const db = require("../models/db");

const router = express.Router();

// ===== Pola jadwal shift (sama persis dengan yang di app Android) =====
const POLA_SHIFT = ["OFF", "2", "2", "2", "OFF", "1", "1", "1", "OFF", "3", "3", "3"];
const ANCHOR_TANGGAL = Date.UTC(2026, 2, 1); // 1 Maret 2026 (bulan di JS mulai dari 0)

// ===== Jam mulai tiap shift (WIB) & toleransi telat =====
const JAM_MULAI_SHIFT = {
  "1": { jam: 0, menit: 0 },   // Malam
  "2": { jam: 8, menit: 0 },   // Pagi
  "3": { jam: 16, menit: 0 },  // Sore
};
const TOLERANSI_TELAT_MENIT = 15;

// Ambil waktu sekarang yang sudah dikonversi ke zona WIB (Asia/Jakarta)
function ambilWaktuJakartaSekarang() {
  const jakartaString = new Date().toLocaleString("en-US", { timeZone: "Asia/Jakarta" });
  return new Date(jakartaString);
}

// Konversi sembarang waktu (ISO string / Date) ke waktu WIB
function keWaktuJakarta(waktuInput) {
  const jakartaString = new Date(waktuInput).toLocaleString("en-US", { timeZone: "Asia/Jakarta" });
  return new Date(jakartaString);
}

function samaHari(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function getShiftTanggal(tahun, bulanIndex, tanggal) {
  const target = Date.UTC(tahun, bulanIndex, tanggal);
  const diffHari = Math.floor((target - ANCHOR_TANGGAL) / (24 * 60 * 60 * 1000));
  const posisi = ((diffHari % 12) + 12) % 12;
  return POLA_SHIFT[posisi];
}

function getDayName(date) {
  const namaHari = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  return namaHari[date.getDay()];
}

function buatRingkasanBulan(tahun, bulanIndex) {
  const namaBulan = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember",
  ];
  const jumlahHari = new Date(tahun, bulanIndex + 1, 0).getDate();
  const counts = { OFF: 0, "1": 0, "2": 0, "3": 0 };
  const baris = [];
  const labelShift = { "1": "Malam", "2": "Pagi", "3": "Sore" };

  for (let i = 1; i <= jumlahHari; i++) {
    const shift = getShiftTanggal(tahun, bulanIndex, i);
    counts[shift]++;

    const currentDate = new Date(tahun, bulanIndex, i);
    const namaHari = getDayName(currentDate);

    const keterangan = shift === "OFF" ? "OFF (libur)" : "Shift " + shift + " (" + labelShift[shift] + ")";
    baris.push(`${namaHari}, ${i} ${namaBulan[bulanIndex]}: ${keterangan}`);
  }

  return {
    judul: `${namaBulan[bulanIndex]} ${tahun}`,
    detail: baris.join("\n"),
    ringkasan: `Total di ${namaBulan[bulanIndex]} ${tahun}: OFF ${counts.OFF} hari, Shift 1 sebanyak ${counts["1"]} hari, Shift 2 sebanyak ${counts["2"]} hari, Shift 3 sebanyak ${counts["3"]} hari.`,
  };
}

// ===== Libur nasional resmi — sumber SAMA dengan app Android: Google Calendar ICS =====
const ICS_URL =
  "https://calendar.google.com/calendar/ical/en.indonesian%23holiday%40group.v.calendar.google.com/public/basic.ics";

// Kamus terjemahan nama libur (sama persis dengan ActivityJadwalActivity.java)
const KAMUS_LIBUR = {
  "New Year's Day": "Tahun Baru Masehi",
  "New Year's Eve": "Malam Tahun Baru Masehi",
  "Chinese New Year's Day": "Tahun Baru Imlek",
  "Chinese New Year Joint Holiday": "Cuti Bersama Tahun Baru Imlek",
  "Ascension of the Prophet Muhammad": "Isra Mikraj Nabi Muhammad",
  "Bali's Day of Silence and Hindu New Year (Nyepi)": "Hari Raya Nyepi (Tahun Baru Saka)",
  "Joint Holiday for Bali's Day of Silence and Hindu New Year (Nyepi)": "Cuti Bersama Hari Raya Nyepi",
  "Idul Fitri": "Hari Raya Idul Fitri",
  "Idul Fitri Holiday": "Libur Idul Fitri",
  "Idul Fitri Joint Holiday": "Cuti Bersama Idul Fitri",
  "Good Friday": "Wafat Isa Almasih (Jumat Agung)",
  "Easter Sunday": "Hari Paskah",
  "International Labor Day": "Hari Buruh Internasional",
  "Ascension Day of Jesus Christ": "Kenaikan Isa Almasih",
  "Joint Holiday after Ascension Day": "Cuti Bersama setelah Kenaikan Isa Almasih",
  "Idul Adha": "Hari Raya Idul Adha",
  "Joint Holiday for Idul Adha": "Cuti Bersama Idul Adha",
  "Waisak Day (Buddha's Anniversary)": "Hari Raya Waisak",
  "Joint Holiday for Waisak Day": "Cuti Bersama Hari Raya Waisak",
  "Pancasila Day": "Hari Lahir Pancasila",
  "Muharram / Islamic New Year": "Tahun Baru Islam (1 Muharram)",
  "Muharram / Islamic New Year Holiday": "Libur Tahun Baru Islam",
  "Maulid Nabi Muhammad": "Maulid Nabi Muhammad",
  "Day off for Maulid Nabi Muhammad": "Cuti Bersama Maulid Nabi Muhammad",
  "Indonesian Independence Day": "Hari Kemerdekaan Republik Indonesia",
  "Indonesian Independence Day observed": "Peringatan Hari Kemerdekaan Republik Indonesia",
  "Christmas Eve": "Malam Natal",
  "Christmas Eve Joint Holiday": "Cuti Bersama Malam Natal",
  "Christmas Day": "Hari Raya Natal",
  "Boxing Day": "Hari Setelah Natal",
  "Joint Holiday (Cuti Bersama)": "Cuti Bersama",
  "Ramadan Start": "Awal Bulan Ramadan",
  "Election Day": "Hari Pemilihan Umum",
  "Diwali": "Hari Raya Diwali",
};

// Cache sederhana biar tidak fetch ICS berulang kali tiap ada chat masuk
let cacheLiburIcs = null;
let cacheLiburWaktu = 0;
const CACHE_DURASI_MS = 6 * 60 * 60 * 1000; // 6 jam

// Ambil ICS Google Calendar & parse jadi list event { tahun, bulan(1-12), tanggal, namaIndo }
// Logika regex-nya sama persis dengan yang di ActivityJadwalActivity.java (Android)
async function ambilLiburIcsMentah() {
  const sekarangMs = Date.now();
  if (cacheLiburIcs && sekarangMs - cacheLiburWaktu < CACHE_DURASI_MS) {
    return cacheLiburIcs;
  }

  try {
    const res = await fetch(ICS_URL);
    if (!res.ok) return cacheLiburIcs || [];

    const rawIcs = await res.text();
    // Unfold baris terlipat ICS (baris lanjutan diawali 1 spasi) — sama seperti di Android
    const ics = rawIcs.replace(/\r\n/g, "\n").replace(/\n /g, "");

    const pEvent = /BEGIN:VEVENT([\s\S]*?)END:VEVENT/g;
    const pDate = /DTSTART;VALUE=DATE:(\d{8})/;
    const pName = /SUMMARY:(.*)/;

    const daftar = [];
    let mEvent;
    while ((mEvent = pEvent.exec(ics)) !== null) {
      const block = mEvent[1];
      const mDate = pDate.exec(block);
      const mName = pName.exec(block);
      if (!mDate || !mName) continue;

      const tgl8 = mDate[1];
      const tahun = parseInt(tgl8.substring(0, 4), 10);
      const bulan = parseInt(tgl8.substring(4, 6), 10); // 1-12
      const tanggal = parseInt(tgl8.substring(6, 8), 10);
      const namaAsli = mName[1].replace(/\r/g, "").trim();

      const tentatif = namaAsli.endsWith("(tentative)");
      const namaBersih = tentatif
        ? namaAsli.slice(0, namaAsli.length - "(tentative)".length).trim()
        : namaAsli;
      let namaIndo = KAMUS_LIBUR[namaBersih] || namaAsli;
      if (tentatif) namaIndo = namaIndo + " (belum pasti)";

      daftar.push({ tahun, bulan, tanggal, namaIndo });
    }

    cacheLiburIcs = daftar;
    cacheLiburWaktu = sekarangMs;
    return daftar;
  } catch (err) {
    // Kalau fetch/parsing gagal, pakai cache lama kalau ada, biar tidak tiba-tiba kosong total
    return cacheLiburIcs || [];
  }
}

async function ambilLiburNasional(tahun) {
  const semua = await ambilLiburIcsMentah();
  return semua.filter((h) => h.tahun === tahun);
}

function formatLiburBulan(liburList, tahun, bulanIndex, judulBulan) {
  const bulanKe = bulanIndex + 1; // 1-12, cocok dengan field "bulan" hasil parsing ICS
  const cocok = liburList
    .filter((h) => h.tahun === tahun && h.bulan === bulanKe)
    .sort((a, b) => a.tanggal - b.tanggal);

  if (cocok.length === 0) {
    return `Tidak ada hari libur nasional resmi di bulan ${judulBulan}.`;
  }
  return cocok.map((h) => `- ${h.tanggal} ${judulBulan}: ${h.namaIndo}`).join("\n");
}

// ===== BARU: status break (sedang break / belum break hari ini) =====
async function ambilKonteksBreak(daftarNamaKaryawan, sekarangJakarta) {
  try {
    const snapshot = await db.collection("break").get();

    const semuaRecord = snapshot.docs.map((doc) => doc.data());

    // Cari record TERAKHIR per nama (untuk tahu status sekarang: sedang break atau tidak)
    const terakhirPerNama = {};
    semuaRecord.forEach((r) => {
      if (!terakhirPerNama[r.nama] || new Date(r.waktu) > new Date(terakhirPerNama[r.nama].waktu)) {
        terakhirPerNama[r.nama] = r;
      }
    });

    const sedangBreakRecords = Object.values(terakhirPerNama).filter((r) => r.aksi === "mulai");
    const sedangBreak = sedangBreakRecords.map((r) => r.nama);

    // Nama yang punya MINIMAL 1 record (apapun aksinya) HARI INI -> dianggap "sudah break hari ini"
    const sudahBreakHariIniSet = new Set();
    semuaRecord.forEach((r) => {
      const waktuRecordJakarta = keWaktuJakarta(r.waktu);
      if (samaHari(waktuRecordJakarta, sekarangJakarta)) {
        sudahBreakHariIniSet.add(r.nama);
      }
    });

    const belumBreakHariIni = daftarNamaKaryawan.filter(
      (nama) => !sudahBreakHariIniSet.has(nama) && !sedangBreak.includes(nama)
    );

    let teks = "\nStatus break karyawan (data real-time):\n";
    if (sedangBreakRecords.length > 0) {
      teks += "- Sedang break sekarang:\n";
      sedangBreakRecords.forEach((r) => {
        const mulaiJakarta = keWaktuJakarta(r.waktu);
        const menitBerjalan = Math.round((sekarangJakarta - mulaiJakarta) / 60000);
        const jamStr = String(mulaiJakarta.getHours()).padStart(2, "0") + ":" + String(mulaiJakarta.getMinutes()).padStart(2, "0");
        teks += `  * ${r.nama}: mulai break jam ${jamStr} WIB, sudah berjalan ${menitBerjalan} menit\n`;
      });
    } else {
      teks += "- Tidak ada yang sedang break sekarang.\n";
    }
    teks += belumBreakHariIni.length > 0
      ? `- Belum break sama sekali hari ini: ${belumBreakHariIni.join(", ")}\n`
      : "- Semua karyawan sudah break hari ini (atau sedang break).\n";

    return teks;
  } catch (err) {
    return "\n(Gagal mengambil status break)\n";
  }
}

// ===== BARU: status telat (absen masuk lewat jam mulai shift + toleransi) =====
async function ambilKonteksTelat(daftarKaryawan, sekarangJakarta) {
  try {
    const shiftHariIni = getShiftTanggal(sekarangJakarta.getFullYear(), sekarangJakarta.getMonth(), sekarangJakarta.getDate());

    if (shiftHariIni === "OFF") {
      return "\nStatus kehadiran hari ini: Hari ini jadwal semua karyawan OFF, tidak ada pengecekan telat.\n";
    }

    const jamMulai = JAM_MULAI_SHIFT[shiftHariIni];
    const batasWaktu = new Date(sekarangJakarta);
    batasWaktu.setHours(jamMulai.jam, jamMulai.menit + TOLERANSI_TELAT_MENIT, 0, 0);

    // Ambil absensi "masuk" hari ini, per nama ambil yang paling awal
    const absensiSnap = await db.collection("absensi").where("tipe", "==", "masuk").get();
    const absensiHariIni = absensiSnap.docs
      .map((doc) => doc.data())
      .filter((a) => samaHari(keWaktuJakarta(a.waktu), sekarangJakarta));

    const absenPalingAwalPerNama = {};
    absensiHariIni.forEach((a) => {
      if (!absenPalingAwalPerNama[a.nama] || new Date(a.waktu) < new Date(absenPalingAwalPerNama[a.nama].waktu)) {
        absenPalingAwalPerNama[a.nama] = a;
      }
    });

    const namaLabel = { "1": "Malam", "2": "Pagi", "3": "Sore" };
    const jamMulaiStr = String(jamMulai.jam).padStart(2, "0") + ":" + String(jamMulai.menit).padStart(2, "0");

    let teks = `\nStatus kehadiran hari ini (Shift ${shiftHariIni}/${namaLabel[shiftHariIni]}, jam mulai ${jamMulaiStr} WIB, toleransi ${TOLERANSI_TELAT_MENIT} menit):\n`;

    const telat = [];
    const tepatWaktu = [];
    const belumAbsen = [];

    daftarKaryawan.forEach((nama) => {
      const absen = absenPalingAwalPerNama[nama];

      if (absen) {
        const waktuAbsenJakarta = keWaktuJakarta(absen.waktu);
        if (waktuAbsenJakarta > batasWaktu) {
          const menitTelat = Math.round((waktuAbsenJakarta - batasWaktu) / 60000);
          telat.push(`${nama} (telat ${menitTelat} menit)`);
        } else {
          tepatWaktu.push(nama);
        }
      } else if (sekarangJakarta > batasWaktu) {
        belumAbsen.push(nama);
      }
    });

    teks += telat.length > 0 ? `- Telat: ${telat.join(", ")}\n` : "- Tidak ada yang telat.\n";
    teks += belumAbsen.length > 0 ? `- Belum absen masuk sama sekali (sudah lewat jam mulai + toleransi): ${belumAbsen.join(", ")}\n` : "";
    teks += tepatWaktu.length > 0 ? `- Tepat waktu: ${tepatWaktu.join(", ")}\n` : "";

    return teks;
  } catch (err) {
    return "\n(Gagal mengambil status telat)\n";
  }
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
  let daftarNamaKaryawan = [];

  // Karyawan
  try {
    const karyawanSnap = await db.collection("karyawan").orderBy("no", "asc").get();
    const karyawan = karyawanSnap.docs.map((doc) => doc.data());
    daftarNamaKaryawan = karyawan.map((k) => k.nama).filter(Boolean);

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

  // Jadwal shift bulan ini & bulan depan (semua dihitung berdasarkan waktu WIB)
  const sekarang = ambilWaktuJakartaSekarang();
  const namaHariIni = getDayName(sekarang);

  const bulanIni = buatRingkasanBulan(sekarang.getFullYear(), sekarang.getMonth());
  const tanggalBulanDepan = new Date(sekarang.getFullYear(), sekarang.getMonth() + 1, 1);
  const bulanDepan = buatRingkasanBulan(tanggalBulanDepan.getFullYear(), tanggalBulanDepan.getMonth());

  teks += `\nHari ini: ${namaHariIni}, ${sekarang.getDate()} ${bulanIni.judul.split(" ")[0]} ${sekarang.getFullYear()} (waktu WIB/Asia Jakarta, ini sumber kebenaran satu-satunya soal tanggal dan hari, jangan dihitung ulang).\n`;

  teks += `\nPola shift berlaku sama untuk semua karyawan tiap harinya, siklus 12 hari (OFF-2-2-2-OFF-1-1-1-OFF-3-3-3), dimulai dari 1 Maret 2026.\n`;

  teks += `\nKeterangan jam kerja: Shift 1 = Malam, Shift 2 = Pagi, Shift 3 = Sore.\n`;

  teks += `\nJadwal shift LENGKAP bulan ${bulanIni.judul} (bulan berjalan) - format: Hari, Tanggal: Shift:\n${bulanIni.detail}\n${bulanIni.ringkasan}\n`;

  teks += `\nJadwal shift LENGKAP bulan ${bulanDepan.judul} (bulan depan) - format: Hari, Tanggal: Shift:\n${bulanDepan.detail}\n${bulanDepan.ringkasan}\n`;

  // Libur nasional resmi bulan ini & bulan depan
  const tahunIni = sekarang.getFullYear();
  const tahunDepan = tanggalBulanDepan.getFullYear();

  const liburTahunIni = await ambilLiburNasional(tahunIni);
  const liburTahunDepan = tahunDepan !== tahunIni ? await ambilLiburNasional(tahunDepan) : liburTahunIni;

  teks += `\nLibur nasional resmi bulan ${bulanIni.judul}:\n${formatLiburBulan(liburTahunIni, tahunIni, sekarang.getMonth(), bulanIni.judul)}\n`;
  teks += `\nLibur nasional resmi bulan ${bulanDepan.judul}:\n${formatLiburBulan(liburTahunDepan, tahunDepan, tanggalBulanDepan.getMonth(), bulanDepan.judul)}\n`;

  // BARU: status break & status telat
  teks += await ambilKonteksBreak(daftarNamaKaryawan, sekarang);
  teks += await ambilKonteksTelat(daftarNamaKaryawan, sekarang);

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

    const systemPrompt = `Kamu adalah ShiftBoard AI Assistant, asisten resmi aplikasi ShiftBoard.

=== TENTANG APLIKASI SHIFTBOARD ===
ShiftBoard adalah aplikasi manajemen jadwal shift kerja & absensi karyawan, tersedia dalam 2 bentuk: versi web (browser) dan versi Android native.

Fitur-fitur yang tersedia:
1. JADWAL SHIFT — jadwal otomatis berdasarkan pola berulang 12 hari: OFF, Shift 2 (Pagi), Shift 2, Shift 2, OFF, Shift 1 (Malam), Shift 1, Shift 1, OFF, Shift 3 (Sore), Shift 3, Shift 3 -- lalu berulang. Pola ini sama untuk semua karyawan, mulai dihitung dari 1 Maret 2026. Bisa dilihat per bulan, dan bisa dibagikan sebagai gambar ke WhatsApp/galeri/dll.
2. ABSENSI — karyawan absen Masuk atau Keluar dengan mengambil foto lewat kamera langsung di aplikasi. Foto dan waktu absen tersimpan otomatis ke server.
3. BREAK — admin bisa mencatat kapan karyawan mulai dan selesai istirahat/break, per karyawan, bisa banyak orang break bersamaan.
4. ADMIN PANEL — khusus admin (login dengan email & password), bisa menambah karyawan baru dan menghapus karyawan.
5. CHATBOT AI (ini kamu) — membantu menjawab pertanyaan seputar jadwal, absensi, break, dan cara pakai aplikasi.

Cara pakai singkat:
- Untuk absen: buka menu Absensi, pilih tombol Absen Masuk atau Absen Keluar, lalu ambil foto lewat kamera.
- Untuk lihat jadwal: buka menu Jadwal Shift, pilih bulan dan tahun, lalu jadwal akan tampil per karyawan dalam bentuk kotak berwarna (biru=Malam, hijau=Pagi, kuning=Sore, merah=OFF).
- Untuk break: buka menu Break, pilih nama karyawan, tekan Mulai Break saat mulai istirahat, tekan Selesai Break saat kembali kerja.
- Untuk tambah/hapus karyawan: hanya admin yang login yang bisa melakukan ini lewat menu Admin.

=== TUGASMU ===
- Jawab dalam Bahasa Indonesia, ramah, profesional, dan tidak bertele-tele.
- Kalau ditanya soal fitur atau cara pakai aplikasi, jawab berdasarkan penjelasan di atas.
- Kalau pertanyaan berhubungan dengan data karyawan/absensi/jadwal shift/break/telat, jawab berdasarkan data di bawah ini. Jangan mengarang data yang tidak ada.
- SOAL TANGGAL DAN HARI: gunakan data jadwal di bawah yang SUDAH LENGKAP dengan hari dan tanggal. Jawab PERSIS dari data yang diberikan, JANGAN pernah menghitung atau menebak nama hari sendiri.
- SOAL LIBUR NASIONAL: gunakan PERSIS data libur nasional resmi yang tertera di bawah, jangan menebak tanggal merah sendiri.
- SOAL BREAK DAN TELAT: gunakan PERSIS status real-time yang tertera di bawah (siapa sedang break, siapa belum break, siapa telat, siapa belum absen). Jangan menebak atau mengasumsikan status siapapun yang tidak disebutkan di data.
- Kalau user tanya soal tanggal/bulan di luar data yang diberikan (misal lebih dari 2 bulan ke depan), bilang terus terang kalau datanya belum tersedia, jangan menebak.
- Jika pertanyaan di luar topik ShiftBoard, tetap jawab dengan baik seperti asisten pada umumnya.

=== DATA PROJECT SHIFTBOARD SAAT INI ===
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
