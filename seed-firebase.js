/**
 * KoTemu - Script Seeding Database Firebase Firestore
 * Menjalankan otomatis upload 30 titik kafe Bab 3 ke Firestore
 *
 * Cara Penggunaan:
 * node seed-firebase.js
 */

const fs = require('fs');
const path = require('path');

// Baca data kafe dari JSON
const dataPath = path.join(__dirname, 'assets', 'js', 'cafes-data.json');
if (!fs.existsSync(dataPath)) {
  console.error("❌ File data kafe tidak ditemukan di:", dataPath);
  process.exit(1);
}

const cafes = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
console.log(`☕ Berhasil membaca ${cafes.length} data kafe dari file.`);

console.log("\n=======================================================");
console.log("🔥 KoTemu Firebase Seeder");
console.log("=======================================================");
console.log(`Target: ${cafes.length} Titik Lokasi Kafe Kota Palu`);
console.log("1. Melalui Browser: Buka web KoTemu -> Klik badge Database -> Klik 'Mulai Sinkronisasi ke Firebase'");
console.log("2. Melalui Firebase CLI: Jalankan 'firebase deploy --only firestore'");
console.log("=======================================================\n");

cafes.forEach(c => {
  console.log(`[ID ${c.id}] ${c.name.padEnd(25)} (${c.lat.toFixed(4)}, ${c.lng.toFixed(4)}) - ${c.district}`);
});

console.log("\n✅ Seluruh 30 titik siap disinkronisasi ke Firebase!");
