// models/supabase.js
// Klien Supabase, khusus dipakai buat upload foto absensi ke Storage.

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️  SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY belum diatur — upload foto akan gagal.');
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;
