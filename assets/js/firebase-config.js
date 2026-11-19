/**
 * KoTemu - Firebase Database Configuration & Service Layer
 * Mendukung Cloud Firestore SDK, REST API Endpoint, & Fallback Local Storage Mode
 */

// Konfigurasi default Firebase untuk proyek KoTemu
const defaultFirebaseConfig = {
  apiKey: "AIzaSyKoTemuPaluPlaceholderApiKey2026",
  authDomain: "kotemu-palu.firebaseapp.com",
  projectId: "kotemu-palu",
  storageBucket: "kotemu-palu.appspot.com",
  messagingSenderId: "109876543210",
  appId: "1:109876543210:web:abcdef1234567890"
};

// Ambil konfigurasi aktif dari localStorage jika tersimpan
function getActiveFirebaseConfig() {
  const saved = localStorage.getItem('kotemu_firebase_config');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.apiKey && parsed.projectId) {
        return parsed;
      }
    } catch (e) {
      console.warn("Gagal parse saved firebase config:", e);
    }
  }
  return defaultFirebaseConfig;
}

let firebaseApp = null;
let firestoreDb = null;
let isFirebaseActive = false;
let databaseMode = "local"; // "firebase" atau "local"
let unsubscribeSnapshot = null;

// Inisialisasi Firebase App & Firestore
function initFirebaseApp() {
  const config = getActiveFirebaseConfig();
  
  if (typeof firebase !== 'undefined' && firebase.initializeApp) {
    try {
      if (!firebase.apps.length) {
        firebaseApp = firebase.initializeApp(config);
      } else {
        firebaseApp = firebase.app();
      }
      
      firestoreDb = firebase.firestore();
      
      // Deteksi apakah API key bukan placeholder
      if (config.apiKey && !config.apiKey.includes("Placeholder")) {
        isFirebaseActive = true;
        databaseMode = "firebase";
        console.log("🔥 Firebase Firestore connected successfully with API Key:", config.apiKey.substring(0, 8) + "...");
        
        // Aktifkan Real-Time Listener
        listenToFirestoreChanges();
      } else {
        isFirebaseActive = false;
        databaseMode = "local";
        console.log("ℹ️ KoTemu berjalan dalam Mode Local-First (Siap dihubungkan ke Firebase API)");
      }
    } catch (err) {
      console.warn("Firebase initialization notice:", err.message);
      isFirebaseActive = false;
      databaseMode = "local";
    }
  } else {
    databaseMode = "local";
    console.log("ℹ️ Firebase SDK belum dimuat, menggunakan penyimpanan lokal.");
  }

  updateDatabaseStatusUI();
}

// Real-Time Listener: Jika ada data kafe baru di Firebase, peta langsung terupdate otomatis!
function listenToFirestoreChanges() {
  if (!isFirebaseActive || !firestoreDb) return;

  try {
    if (unsubscribeSnapshot) unsubscribeSnapshot();

    unsubscribeSnapshot = firestoreDb.collection('cafes').onSnapshot((snapshot) => {
      if (!snapshot.empty) {
        const liveList = [];
        snapshot.forEach(doc => {
          liveList.push({ docId: doc.id, ...doc.data() });
        });
        console.log(`📡 Real-Time Firebase Update: ${liveList.length} kafe termutakhir diterima.`);
        
        // Simpan ke cache
        localStorage.setItem('kotemu_cafes_cache', JSON.stringify(liveList));
        
        // Update AppState jika app sudah siap
        if (typeof AppState !== 'undefined' && Array.isArray(AppState.cafes)) {
          AppState.cafes = liveList;
          if (typeof applyFiltersAndRender === 'function') {
            applyFiltersAndRender();
          }
        }
      }
    }, (error) => {
      console.warn("Real-time listener warning:", error.message);
    });
  } catch (e) {
    console.warn("Gagal inisialisasi onSnapshot listener:", e);
  }
}

// Update status badge di Navbar
function updateDatabaseStatusUI() {
  const badge = document.getElementById('firebase-status-badge');
  const text = document.getElementById('firebase-status-text');
  const dot = document.getElementById('firebase-status-dot');

  if (badge && text && dot) {
    if (databaseMode === "firebase" && isFirebaseActive) {
      dot.className = "firebase-dot firebase-dot--active";
      text.innerText = "Firebase API: Terhubung Aktif";
      badge.className = "firebase-badge firebase-badge--active";
    } else {
      dot.className = "firebase-dot firebase-dot--local";
      text.innerText = "Database: Siap Hubung Firebase API";
      badge.className = "firebase-badge firebase-badge--local";
    }
  }
}

// Parser pintar input Firebase (mendukung JSON murni maupun salinan JavaScript dari Firebase Console)
function parseFirebaseInput(text) {
  if (!text) return null;
  text = text.trim();

  // Coba parse JSON murni
  try {
    const obj = JSON.parse(text);
    if (obj.apiKey && obj.projectId) return obj;
  } catch (e) {}

  // Parse dari sintaks JavaScript: apiKey: "...", projectId: "..."
  const apiKeyMatch = text.match(/apiKey\s*:\s*["']([^"']+)["']/);
  const projectIdMatch = text.match(/projectId\s*:\s*["']([^"']+)["']/);
  const authDomainMatch = text.match(/authDomain\s*:\s*["']([^"']+)["']/);
  const storageBucketMatch = text.match(/storageBucket\s*:\s*["']([^"']+)["']/);
  const messagingSenderIdMatch = text.match(/messagingSenderId\s*:\s*["']([^"']+)["']/);
  const appIdMatch = text.match(/appId\s*:\s*["']([^"']+)["']/);

  if (apiKeyMatch && projectIdMatch) {
    return {
      apiKey: apiKeyMatch[1],
      projectId: projectIdMatch[1],
      authDomain: authDomainMatch ? authDomainMatch[1] : `${projectIdMatch[1]}.firebaseapp.com`,
      storageBucket: storageBucketMatch ? storageBucketMatch[1] : `${projectIdMatch[1]}.appspot.com`,
      messagingSenderId: messagingSenderIdMatch ? messagingSenderIdMatch[1] : "109876543210",
      appId: appIdMatch ? appIdMatch[1] : "1:web:placeholder"
    };
  }

  return null;
}

// Service CRUD untuk Kafe melalui Firebase API
const FirebaseService = {
  // Ambil semua data kafe melalui Firebase Firestore API
  async getAllCafes() {
    // 1. Coba baca dari Firebase Firestore API jika aktif
    if (isFirebaseActive && firestoreDb) {
      try {
        const snapshot = await firestoreDb.collection('cafes').orderBy('id', 'asc').get();
        if (!snapshot.empty) {
          const list = [];
          snapshot.forEach(doc => {
            list.push({ docId: doc.id, ...doc.data() });
          });
          console.log(`🔥 Berhasil mengambil ${list.length} kafe dari Firebase API Firestore.`);
          localStorage.setItem('kotemu_cafes_cache', JSON.stringify(list));
          return list;
        } else {
          console.log("🔥 Koleksi 'cafes' di Firestore masih kosong. Melakukan auto-seed 30 data awal...");
          await this.syncAllToFirebase();
          return typeof INITIAL_CAFES_DATA !== 'undefined' ? INITIAL_CAFES_DATA : [];
        }
      } catch (err) {
        console.warn("Gagal membaca dari Firebase API Firestore:", err.message);
      }
    }

    // 2. Cek cache lokal
    const cached = localStorage.getItem('kotemu_cafes_cache');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          console.log(`📦 Mengambil ${parsed.length} kafe dari Cache Lokal.`);
          return parsed;
        }
      } catch (e) {
        console.warn("Gagal parse cache lokal:", e);
      }
    }

    // 3. Fallback ke 30 Titik Awal Bab 3 Laporan
    if (typeof INITIAL_CAFES_DATA !== 'undefined') {
      console.log(`📍 Menggunakan 30 titik kafe rencana awal Bab 3 Laporan.`);
      localStorage.setItem('kotemu_cafes_cache', JSON.stringify(INITIAL_CAFES_DATA));
      return INITIAL_CAFES_DATA;
    }

    return [];
  },

  // Tambah kafe baru ke Firebase Firestore API
  async addCafe(newCafe) {
    if (!newCafe.id) {
      newCafe.id = Date.now();
    }
    newCafe.createdAt = new Date().toISOString();

    // Simpan ke Firebase API jika aktif
    if (isFirebaseActive && firestoreDb) {
      try {
        const docRef = await firestoreDb.collection('cafes').add(newCafe);
        newCafe.docId = docRef.id;
        console.log("🔥 Berhasil menambahkan kafe ke Firebase API Firestore:", newCafe.name);
      } catch (err) {
        console.error("Gagal simpan ke Firebase Firestore:", err);
      }
    }

    // Simpan ke Local Cache
    const list = await this.getAllCafes();
    list.push(newCafe);
    localStorage.setItem('kotemu_cafes_cache', JSON.stringify(list));
    return newCafe;
  },

  // Perbarui kafe di Firebase API
  async updateCafe(id, updatedFields) {
    const list = await this.getAllCafes();
    const index = list.findIndex(c => c.id === id);
    if (index !== -1) {
      list[index] = { ...list[index], ...updatedFields };
      localStorage.setItem('kotemu_cafes_cache', JSON.stringify(list));

      if (isFirebaseActive && firestoreDb) {
        try {
          if (list[index].docId) {
            await firestoreDb.collection('cafes').doc(list[index].docId).update(updatedFields);
          } else {
            const snap = await firestoreDb.collection('cafes').where('id', '==', id).get();
            snap.forEach(async doc => {
              await doc.ref.update(updatedFields);
            });
          }
        } catch (err) {
          console.error("Gagal update di Firebase API:", err);
        }
      }
      return list[index];
    }
    return null;
  },

  // Hapus kafe dari Firebase API
  async deleteCafe(id) {
    let list = await this.getAllCafes();
    const cafeToDelete = list.find(c => c.id === id);
    list = list.filter(c => c.id !== id);
    localStorage.setItem('kotemu_cafes_cache', JSON.stringify(list));

    if (isFirebaseActive && firestoreDb && cafeToDelete) {
      try {
        if (cafeToDelete.docId) {
          await firestoreDb.collection('cafes').doc(cafeToDelete.docId).delete();
        } else {
          const snap = await firestoreDb.collection('cafes').where('id', '==', id).get();
          snap.forEach(async doc => {
            await doc.ref.delete();
          });
        }
      } catch (err) {
        console.error("Gagal hapus dari Firebase API:", err);
      }
    }
    return true;
  },

  // Sinkronisasi Batch 30 Kafe ke Firebase Firestore API
  async syncAllToFirebase(onProgress) {
    if (!firestoreDb) {
      throw new Error("Firebase SDK belum siap. Pastikan script Firebase termuat.");
    }

    const list = typeof INITIAL_CAFES_DATA !== 'undefined' ? INITIAL_CAFES_DATA : await this.getAllCafes();
    let successCount = 0;

    for (let i = 0; i < list.length; i++) {
      const item = { ...list[i] };
      delete item.docId; // hapus docId lama
      
      try {
        await firestoreDb.collection('cafes').doc(`cafe_${item.id}`).set(item);
        successCount++;
        if (onProgress) {
          onProgress(successCount, list.length, item.name);
        }
      } catch (e) {
        console.error(`Gagal sync kafe ${item.name}:`, e);
      }
    }

    return successCount;
  },

  // Tes Koneksi Langsung ke Firebase REST API
  async testFirebaseApi(config) {
    const startTime = Date.now();
    const url = `https://firestore.googleapis.com/v1/projects/${config.projectId}/databases/(default)/documents/cafes?key=${config.apiKey}`;
    
    try {
      const response = await fetch(url);
      const latency = Date.now() - startTime;
      
      if (response.ok) {
        const data = await response.json();
        const docCount = (data.documents || []).length;
        return {
          success: true,
          status: "TERKONEKSI_PENUH",
          message: `Koneksi API Firebase Berhasil (${latency}ms)! Firestore aktif dengan ${docCount} dokumen tersimpan.`,
          latency
        };
      } else if (response.status === 403 || response.status === 401) {
        return {
          success: true,
          status: "PERLU_RULES",
          message: `API Key & Project ID valid (${latency}ms)! Aturan keamanan Firestore di Firebase Console belum diubah menjadi 'allow read, write: if true;'.`,
          latency
        };
      } else {
        return {
          success: false,
          status: "ERROR",
          message: `Gagal menghubungi Firebase API (Status ${response.status}). Periksa Project ID '${config.projectId}' atau API Key.`
        };
      }
    } catch (e) {
      return {
        success: false,
        status: "NETWORK_ERROR",
        message: `Koneksi API gagal: ${e.message}`
      };
    }
  },

  // Simpan custom konfigurasi Firebase
  saveCustomConfig(configObj) {
    try {
      localStorage.setItem('kotemu_firebase_config', JSON.stringify(configObj));
      location.reload();
    } catch (e) {
      console.error("Gagal simpan konfigurasi Firebase:", e);
    }
  },

  // Reset ke data awal 30 kafe
  resetToDefaultData() {
    if (typeof INITIAL_CAFES_DATA !== 'undefined') {
      localStorage.setItem('kotemu_cafes_cache', JSON.stringify(INITIAL_CAFES_DATA));
      localStorage.removeItem('kotemu_firebase_config');
      location.reload();
    }
  }
};
