/**
 * KoTemu - Web GIS Sebaran Kafe di Kota Palu
 * Core Application Engine: Peta Citra Satelit Kota Palu Resolusi Tinggi,
 * Batas Wilayah Resmi Kota Palu, OSRM Routing, & Firebase Integration
 */

// State Global Aplikasi
const AppState = {
  cafes: [],
  filteredCafes: [],
  selectedCafe: null,
  activeDistrict: 'all',
  selectedFacilities: new Set(),
  activeSort: 'rating_desc',
  searchQuery: '',
  isMapClickModeAdd: false,

  // GIS Layers
  map: null,
  baseLayers: {},
  currentBaseLayerName: 'Citra Satelit Hybrid',
  cityBoundaryLayer: null,
  roadsLayer: null,
  markersLayer: null,
  clusterLayer: null,
  heatLayer: null,
  activeRouteLayer: null,
  startPointMarker: null,

  // Visibility Toggles
  showCityBoundary: true,
  showRoads: true,
  showHeatmap: false,
  useCluster: false
};

// Inisialisasi Aplikasi saat Dokumen Siap
document.addEventListener('DOMContentLoaded', async () => {
  console.log("🚀 Menginisialisasi KoTemu Web GIS - Citra Satelit Kota Palu...");
  
  // 1. Inisialisasi Firebase & Ambil Data 30 Kafe
  initFirebaseApp();
  await loadCafeData();

  // 2. Inisialisasi Peta Leaflet Berbasis Citra Satelit
  initLeafletMap();

  // 3. Render Data Spasial GIS (Batas Kota Palu, Akses Jalan, 30 Kafe)
  renderSpatialLayers();

  // 4. Render UI List & Stats
  applyFiltersAndRender();

  // 5. Setup Event Listeners
  setupEventListeners();

  // 6. Cek Tema Dark/Light
  initTheme();

  showToast("Peta Citra Satelit Kota Palu & 30 Titik Kafe berhasil dimuat!", "info");
});

// ----------------------------------------------------
// 1. Data Loader
// ----------------------------------------------------
async function loadCafeData() {
  try {
    AppState.cafes = await FirebaseService.getAllCafes();
    AppState.filteredCafes = [...AppState.cafes];
    console.log(`✅ Berhasil memuat ${AppState.cafes.length} titik kafe.`);
  } catch (err) {
    console.error("Gagal memuat data kafe:", err);
    AppState.cafes = typeof INITIAL_CAFES_DATA !== 'undefined' ? [...INITIAL_CAFES_DATA] : [];
    AppState.filteredCafes = [...AppState.cafes];
  }
}

// ----------------------------------------------------
// 2. Leaflet Map Initialization (Default Citra Satelit)
// ----------------------------------------------------
function initLeafletMap() {
  // Titik tengah Kota Palu
  const paluCenter = [-0.8917, 119.8707];

  AppState.map = L.map('map', {
    center: paluCenter,
    zoom: 13,
    zoomControl: false,
    maxZoom: 19,
    minZoom: 10
  });

  // Tambahkan kontrol zoom kustom di kiri bawah
  L.control.zoom({ position: 'bottomleft' }).addTo(AppState.map);

  // Definisi Base Tile Layers dengan Citra Satelit Resolusi Tinggi & Peta Vektor
  // 1. Citra Satelit Hybrid (Esri World Imagery + Label Tempat/Jalan Resmi)
  const esriImagery = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, GIS User Community',
    maxZoom: 19
  });

  const esriLabels = L.tileLayer('https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
    attribution: '',
    maxZoom: 19
  });

  const satelliteHybrid = L.layerGroup([esriImagery, esriLabels]);

  // 2. Google Hybrid Satellite (Dengan Multi-Subdomain mt0-mt3 agar Cepat & Stabil)
  const googleHybrid = L.tileLayer('https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    attribution: '&copy; Google Maps Satellite',
    maxZoom: 20
  });

  // 3. Citra Satelit Murni (Pure Satellite tanpa label jalan)
  const pureSatellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri World Imagery',
    maxZoom: 19
  });

  // 4. Peta Jalan Resmi Esri (World Street Map - Vektor Detail & Bersih)
  const esriStreetMap = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri World Street Map',
    maxZoom: 19
  });

  // 5. Peta Topografi & Kontur Elevasi (Esri World Topo Map)
  const esriTopoMap = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', {
    attribution: 'Tiles &copy; Esri World Topo Map',
    maxZoom: 19
  });

  // 6. CartoDB Positron (Peta Terang Minimalis)
  const cartoPositron = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', {
    subdomains: 'abcd',
    attribution: '&copy; CARTO Positron',
    maxZoom: 19
  });

  // 7. OpenStreetMap Standard
  const osmLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19
  });

  AppState.baseLayers = {
    'Citra Satelit Hybrid': satelliteHybrid,
    'Google Satelit Hybrid': googleHybrid,
    'Citra Satelit Murni': pureSatellite,
    'Peta Jalan Esri': esriStreetMap,
    'Peta Topografi Esri': esriTopoMap,
    'Peta Vektor Positron': cartoPositron,
    'OpenStreetMap': osmLayer
  };

  // Set DEFAULT basemap ke Citra Satelit Hybrid
  satelliteHybrid.addTo(AppState.map);
  AppState.currentBaseLayerName = 'Citra Satelit Hybrid';

  // Inisialisasi Layer Groups Spasial
  AppState.cityBoundaryLayer = L.layerGroup().addTo(AppState.map);
  AppState.roadsLayer = L.layerGroup().addTo(AppState.map);
  AppState.markersLayer = L.layerGroup().addTo(AppState.map);
  
  if (typeof L.markerClusterGroup !== 'undefined') {
    AppState.clusterLayer = L.markerClusterGroup({
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true
    });
  }

  // Map Click Listener (Untuk Mode Tambah Kafe)
  AppState.map.on('click', (e) => {
    if (AppState.isMapClickModeAdd) {
      document.getElementById('input-cafe-lat').value = e.latlng.lat.toFixed(6);
      document.getElementById('input-cafe-lng').value = e.latlng.lng.toFixed(6);
      showToast(`Koordinat dipilih: ${e.latlng.lat.toFixed(4)}, ${e.latlng.lng.toFixed(4)}`, 'success');
      AppState.isMapClickModeAdd = false;
      document.getElementById('btn-pick-coord')?.classList.remove('active');
      openModal('modal-add-cafe');
    }
  });
}

// ----------------------------------------------------
// 3. Render Data Spasial GIS (Batas Kota Palu, Jalan, Kafe)
// ----------------------------------------------------
function renderSpatialLayers() {
  // A. Batas Administrasi Resmi Kota Palu (Outline Tegas di atas Citra Satelit)
  renderCityBoundaryLayer();

  // B. Jaringan Jalan Utama Akses Kafe
  renderRoadsLayer();

  // C. 30 Titik Kafe Lapangan
  renderCafePoints();

  // D. Heatmap Layer
  updateHeatmapLayer();
}

// Render Batas Administrasi Resmi Kota Palu
function renderCityBoundaryLayer() {
  AppState.cityBoundaryLayer.clearLayers();

  if (typeof KOTA_PALU_BOUNDARY_GEOJSON !== 'undefined') {
    const boundaryLayer = L.geoJSON(KOTA_PALU_BOUNDARY_GEOJSON, {
      style: {
        color: '#fbbf24',          // Kuning emas kontras tinggi di atas citra satelit
        weight: 3.5,
        opacity: 0.95,
        dashArray: '8, 6',
        fillColor: '#000000',
        fillOpacity: 0.0           // Transparan total agar citra satelit bumi terlihat jelas tanpa tertutup
      },
      onEachFeature: (feature, layer) => {
        layer.bindTooltip(`
          <div style="font-size:0.82rem; font-weight:800; color:#78350f; padding:2px 4px;">
            🛰️ BATAS RESMI WILAYAH KOTA PALU<br>
            <span style="font-size:0.72rem; font-weight:normal; color:#451a03;">Citra Satelit Resolusi Tinggi • Luas: 395,06 km²</span>
          </div>
        `, { sticky: true, className: 'city-boundary-tooltip' });
      }
    });

    AppState.cityBoundaryLayer.addLayer(boundaryLayer);

    // Otomatis pusatkan kamera peta mencakup seluruh wilayah Kota Palu & 30 kafe
    try {
      const bounds = boundaryLayer.getBounds();
      if (bounds.isValid()) {
        AppState.map.fitBounds(bounds, { padding: [25, 25] });
      }
    } catch (e) {
      console.warn("Gagal fit bounds batas kota:", e);
    }
  }
}

// Render Unsur Line (Jaringan Jalan Utama)
function renderRoadsLayer() {
  AppState.roadsLayer.clearLayers();

  if (typeof JALAN_UTAMA_GEOJSON !== 'undefined') {
    const roadsLayer = L.geoJSON(JALAN_UTAMA_GEOJSON, {
      style: {
        color: '#38bdf8',          // Biru langit cerah terlihat kontras di atas citra satelit
        weight: 4,
        opacity: 0.9,
        lineCap: 'round',
        lineJoin: 'round'
      },
      onEachFeature: (feature, layer) => {
        const p = feature.properties;
        layer.bindPopup(`
          <div style="font-size:0.8rem; padding: 4px;">
            <b style="color:#0284c7;">🛣️ ${p.nama}</b><br>
            <span style="color:#64748b;">Kategori: ${p.kategori} (${p.panjangKm} km)</span><br>
            <div style="margin-top:4px; font-size:0.75rem;"><b>Akses Kafe Terkoneksi:</b><br>${p.kafeTerkoneksi}</div>
          </div>
        `);
      }
    });

    AppState.roadsLayer.addLayer(roadsLayer);
  }
}

// Render Unsur Point (30 Kafe)
function renderCafePoints() {
  AppState.markersLayer.clearLayers();
  if (AppState.clusterLayer) AppState.clusterLayer.clearLayers();

  AppState.filteredCafes.forEach((cafe) => {
    // Custom HTML Marker Pin dengan kontras tajam di atas satelit
    const customIcon = L.divIcon({
      className: 'custom-coffee-pin',
      html: `
        <div class="pin-wrapper" data-id="${cafe.id}">
          <div class="pin-pulse"></div>
          <div class="pin-circle" style="box-shadow: 0 4px 14px rgba(0,0,0,0.8);">
            <i class="fa-solid fa-mug-hot"></i>
          </div>
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
      popupAnchor: [0, -18]
    });

    const marker = L.marker([cafe.lat, cafe.lng], { icon: customIcon });

    // Custom Popup Content
    const popupContent = `
      <div class="leaflet-popup-content">
        <img src="${cafe.image}" alt="${cafe.name}" class="popup-img" onerror="this.src='assets/images/logo.svg'" />
        <div class="popup-body">
          <div class="popup-title">${cafe.name}</div>
          <div class="popup-district"><i class="fa-solid fa-location-dot"></i> ${cafe.district} &bull; ${cafe.category}</div>
          <div class="popup-address">${cafe.address}</div>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <span style="color:#fbbf24; font-weight:700; font-size:0.8rem;">★ ${cafe.rating} <span style="color:#94a3b8; font-weight:normal;">(${cafe.reviewsCount})</span></span>
            <span style="color:#d97706; font-weight:700; font-size:0.75rem;">${cafe.priceRange}</span>
          </div>
          <div class="popup-btn-row">
            <button class="popup-btn popup-btn-route" onclick="triggerRouteTo(${cafe.id})">
              <i class="fa-solid fa-diamond-turn-right"></i> Rute
            </button>
            <button class="popup-btn popup-btn-detail" onclick="openCafeDetailModal(${cafe.id})">
              <i class="fa-solid fa-circle-info"></i> Detail
            </button>
          </div>
        </div>
      </div>
    `;

    marker.bindPopup(popupContent, { maxWidth: 300 });

    marker.on('click', () => {
      highlightSidebarCard(cafe.id);
    });

    if (AppState.useCluster && AppState.clusterLayer) {
      AppState.clusterLayer.addLayer(marker);
    } else {
      AppState.markersLayer.addLayer(marker);
    }
  });

  if (AppState.useCluster && AppState.clusterLayer) {
    AppState.map.addLayer(AppState.clusterLayer);
  }
}

// Update Heatmap Spasial
function updateHeatmapLayer() {
  if (AppState.heatLayer) {
    AppState.map.removeLayer(AppState.heatLayer);
    AppState.heatLayer = null;
  }

  if (AppState.showHeatmap) {
    if (typeof L.heatLayer === 'undefined') {
      console.warn("Library Leaflet.heat belum termuat.");
      return;
    }

    const heatPoints = AppState.filteredCafes.map(c => [c.lat, c.lng, 1.0]);
    AppState.heatLayer = L.heatLayer(heatPoints, {
      radius: 35,
      blur: 20,
      maxZoom: 16,
      minOpacity: 0.35,
      gradient: { 0.2: '#38bdf8', 0.4: '#a3e635', 0.6: '#facc15', 0.8: '#fb923c', 1.0: '#ef4444' }
    }).addTo(AppState.map);
  }
}

// ----------------------------------------------------
// 4. Filtering, Searching, & UI Rendering
// ----------------------------------------------------
function applyFiltersAndRender() {
  const query = AppState.searchQuery.toLowerCase().trim();

  AppState.filteredCafes = AppState.cafes.filter((cafe) => {
    // 1. Text Search Filter
    const matchQuery = !query ||
      cafe.name.toLowerCase().includes(query) ||
      cafe.address.toLowerCase().includes(query) ||
      cafe.district.toLowerCase().includes(query) ||
      cafe.popularMenu.toLowerCase().includes(query);

    // 2. District Filter
    const matchDistrict = AppState.activeDistrict === 'all' ||
      cafe.district.toLowerCase().includes(AppState.activeDistrict.toLowerCase());

    // 3. Facilities Filter
    let matchFacilities = true;
    if (AppState.selectedFacilities.size > 0) {
      for (const fac of AppState.selectedFacilities) {
        const hasFac = cafe.facilities.some(f => f.toLowerCase().includes(fac.toLowerCase()));
        if (!hasFac) {
          matchFacilities = false;
          break;
        }
      }
    }

    return matchQuery && matchDistrict && matchFacilities;
  });

  // Sorting
  sortFilteredCafes();

  // Render UI
  renderCafeListCards();
  renderStatsRibbon();
  renderCafePoints();
  updateHeatmapLayer();
}

function sortFilteredCafes() {
  if (AppState.activeSort === 'rating_desc') {
    AppState.filteredCafes.sort((a, b) => b.rating - a.rating);
  } else if (AppState.activeSort === 'reviews_desc') {
    AppState.filteredCafes.sort((a, b) => b.reviewsCount - a.reviewsCount);
  } else if (AppState.activeSort === 'name_asc') {
    AppState.filteredCafes.sort((a, b) => a.name.localeCompare(b.name));
  }
}

// Render Sidebar Cards
function renderCafeListCards() {
  const container = document.getElementById('cafe-list-container');
  const countEl = document.getElementById('results-count');

  if (countEl) {
    countEl.innerText = `${AppState.filteredCafes.length} Kafe Ditemukan`;
  }

  if (!container) return;

  if (AppState.filteredCafes.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding: 40px 20px; color: var(--text-muted);">
        <i class="fa-solid fa-mug-saucer" style="font-size: 2.5rem; color: var(--coffee-300); margin-bottom: 12px;"></i>
        <h4 style="font-size: 1rem; font-weight:700;">Tidak ada kafe yang cocok</h4>
        <p style="font-size: 0.78rem; margin-top: 6px;">Coba ubah kata kunci pencarian atau reset filter kecamatan.</p>
        <button class="btn-primary" style="margin: 16px auto 0 auto;" onclick="resetAllFilters()">Reset Filter</button>
      </div>
    `;
    return;
  }

  let html = '';
  AppState.filteredCafes.forEach((cafe) => {
    const facilitiesBadges = cafe.facilities.slice(0, 3).map(f => `
      <span class="facility-tag">${f}</span>
    `).join('');

    html += `
      <div class="cafe-card" id="card-cafe-${cafe.id}" onclick="selectCafeOnMap(${cafe.id})">
        <div class="card-img-container">
          <img src="${cafe.image}" alt="${cafe.name}" loading="lazy" onerror="this.src='assets/images/logo.svg'" />
          <div class="card-badge-district">${cafe.district}</div>
          <div class="card-badge-rating">★ ${cafe.rating}</div>
        </div>
        <div class="card-content">
          <div class="card-title">${cafe.name}</div>
          <div class="card-address"><i class="fa-solid fa-location-dot"></i> ${cafe.address}</div>
          <div class="card-tags">
            ${facilitiesBadges}
            ${cafe.facilities.length > 3 ? `<span class="facility-tag">+${cafe.facilities.length - 3}</span>` : ''}
          </div>
        </div>
        <div class="card-footer">
          <div class="card-price">${cafe.priceRange}</div>
          <div class="card-actions" onclick="event.stopPropagation()">
            <button class="btn-card-route" onclick="triggerRouteTo(${cafe.id})">
              <i class="fa-solid fa-diamond-turn-right"></i> Rute
            </button>
            <button class="btn-card-detail" onclick="openCafeDetailModal(${cafe.id})">
              Detail
            </button>
          </div>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

// Render Statistik Singkat
function renderStatsRibbon() {
  const totalCountEl = document.getElementById('stat-total-cafes');
  const districtsCountEl = document.getElementById('stat-districts');
  const avgRatingEl = document.getElementById('stat-avg-rating');

  if (totalCountEl) totalCountEl.innerText = AppState.filteredCafes.length;

  if (districtsCountEl) {
    const distinctDistricts = new Set(AppState.filteredCafes.map(c => c.district));
    districtsCountEl.innerText = distinctDistricts.size;
  }

  if (avgRatingEl) {
    if (AppState.filteredCafes.length > 0) {
      const sum = AppState.filteredCafes.reduce((acc, c) => acc + c.rating, 0);
      avgRatingEl.innerText = (sum / AppState.filteredCafes.length).toFixed(1) + '★';
    } else {
      avgRatingEl.innerText = '0.0★';
    }
  }
}

// ----------------------------------------------------
// 5. Interaksi Map & Card
// ----------------------------------------------------
function selectCafeOnMap(id) {
  const cafe = AppState.cafes.find(c => c.id === id);
  if (!cafe) return;

  AppState.selectedCafe = cafe;
  highlightSidebarCard(id);

  // Pusatkan peta ke lokasi kafe
  AppState.map.flyTo([cafe.lat, cafe.lng], 16, {
    animate: true,
    duration: 1
  });

  // Buka popup jika marker ditemukan
  AppState.markersLayer.eachLayer((marker) => {
    const latlng = marker.getLatLng();
    if (Math.abs(latlng.lat - cafe.lat) < 0.0001 && Math.abs(latlng.lng - cafe.lng) < 0.0001) {
      marker.openPopup();
    }
  });

  // Di layar kecil, tutup sidebar otomatis agar peta terlihat
  if (window.innerWidth <= 900) {
    toggleSidebar(false);
  }
}

function highlightSidebarCard(id) {
  document.querySelectorAll('.cafe-card').forEach(el => el.classList.remove('active-selected'));
  const card = document.getElementById(`card-cafe-${id}`);
  if (card) {
    card.classList.add('active-selected');
    card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

// ----------------------------------------------------
// 6. Interactive Routing (Line Feature GIS)
// ----------------------------------------------------
async function triggerRouteTo(cafeId) {
  const cafe = AppState.cafes.find(c => c.id === cafeId);
  if (!cafe) return;

  showToast(`Mempersiapkan rute menuju ${cafe.name}...`, 'info');

  // Gunakan Titik Nol Palu sebagai titik awal default
  let startCoords = [-0.8986, 119.8705]; // Tugu Nol Kilometer Palu

  // Coba ambil lokasi GPS pengguna jika diizinkan
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        startCoords = [pos.coords.latitude, pos.coords.longitude];
        await executeRouting(startCoords, [cafe.lat, cafe.lng], cafe.name);
      },
      async (err) => {
        console.log("GPS tidak aktif/ditolak, menggunakan Tugu Nol Palu:", err.message);
        await executeRouting(startCoords, [cafe.lat, cafe.lng], cafe.name);
      },
      { timeout: 4000 }
    );
  } else {
    await executeRouting(startCoords, [cafe.lat, cafe.lng], cafe.name);
  }
}

async function executeRouting(startCoords, destCoords, cafeName) {
  // Hapus rute lama jika ada
  clearCurrentRoute();

  const routeData = await RoutingService.calculateRoute(startCoords, destCoords, cafeName);

  if (!routeData.success) {
    showToast("Gagal menghitung rute.", "error");
    return;
  }

  // Gambar Garis Rute Spasial (Unsur Line GIS) dengan warna kontras tajam di atas satelit
  const routeGeoJson = {
    type: "Feature",
    geometry: routeData.geometry
  };

  AppState.activeRouteLayer = L.geoJSON(routeGeoJson, {
    style: {
      color: '#f59e0b',
      weight: 6,
      opacity: 0.95,
      dashArray: routeData.isFallback ? '8, 8' : ''
    }
  }).addTo(AppState.map);

  // Marker Titik Awal
  AppState.startPointMarker = L.circleMarker(startCoords, {
    radius: 9,
    fillColor: '#38bdf8',
    color: '#ffffff',
    weight: 3,
    opacity: 1,
    fillOpacity: 0.95
  }).addTo(AppState.map).bindPopup("<b>Titik Awal Anda</b> (Tugu Nol Palu / GPS)");

  // Zoom ke seluruh rute
  AppState.map.fitBounds(AppState.activeRouteLayer.getBounds(), { padding: [50, 50] });

  // Tampilkan Floating Panel Rute
  showRoutePanel(routeData);
  showToast(`Rute ke ${cafeName} berhasil ditampilkan (${routeData.distanceKm} km)`, "success");
}

function showRoutePanel(routeData) {
  const panel = document.getElementById('route-floating-panel');
  if (!panel) return;

  panel.style.display = 'flex';
  document.getElementById('route-dest-name').innerText = routeData.cafeName;
  document.getElementById('route-distance').innerText = `${routeData.distanceKm} km`;
  document.getElementById('route-duration').innerText = `${routeData.durationMin} mnt`;
}

function clearCurrentRoute() {
  if (AppState.activeRouteLayer) {
    AppState.map.removeLayer(AppState.activeRouteLayer);
    AppState.activeRouteLayer = null;
  }
  if (AppState.startPointMarker) {
    AppState.map.removeLayer(AppState.startPointMarker);
    AppState.startPointMarker = null;
  }
  const panel = document.getElementById('route-floating-panel');
  if (panel) panel.style.display = 'none';
}

// ----------------------------------------------------
// 7. Modals Handling
// ----------------------------------------------------
function openCafeDetailModal(id) {
  const cafe = AppState.cafes.find(c => c.id === id);
  if (!cafe) return;

  document.getElementById('modal-detail-title').innerText = cafe.name;
  document.getElementById('modal-detail-img').src = cafe.image;
  document.getElementById('modal-detail-district').innerText = `${cafe.district} • ${cafe.category}`;
  document.getElementById('modal-detail-rating').innerText = `★ ${cafe.rating} (${cafe.reviewsCount} ulasan)`;
  document.getElementById('modal-detail-address').innerText = cafe.address;
  document.getElementById('modal-detail-hours').innerText = cafe.openingHours;
  document.getElementById('modal-detail-price').innerText = cafe.priceRange;
  document.getElementById('modal-detail-menu').innerText = cafe.popularMenu;
  document.getElementById('modal-detail-desc').innerText = cafe.description;
  document.getElementById('modal-detail-phone').innerText = cafe.phone || '-';
  document.getElementById('modal-detail-ig').innerText = cafe.instagram || '-';

  const gmapsBtn = document.getElementById('modal-detail-gmaps');
  if (gmapsBtn) {
    gmapsBtn.href = cafe.gmapsUrl;
  }

  const routeBtn = document.getElementById('modal-detail-btn-route');
  if (routeBtn) {
    routeBtn.onclick = () => {
      closeModal('modal-cafe-detail');
      triggerRouteTo(cafe.id);
    };
  }

  // Render Fasilitas Badges
  const facContainer = document.getElementById('modal-detail-facilities');
  if (facContainer) {
    facContainer.innerHTML = cafe.facilities.map(f => `
      <span class="facility-tag" style="font-size:0.75rem; padding: 4px 10px;">
        <i class="fa-solid fa-check" style="color:var(--emerald-success); margin-right:4px;"></i>${f}
      </span>
    `).join('');
  }

  initOrderSectionForCafe(cafe);
  openModal('modal-cafe-detail');
}

function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add('active');
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove('active');
}

// ----------------------------------------------------
// 8. Event Listeners Setup
// ----------------------------------------------------
function setupEventListeners() {
  // Search Input
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      AppState.searchQuery = e.target.value;
      applyFiltersAndRender();
    });
  }

  // Sort Dropdown
  const sortSelect = document.getElementById('sort-select');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      AppState.activeSort = e.target.value;
      applyFiltersAndRender();
    });
  }

  // District Filter Buttons
  document.querySelectorAll('.district-pill').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const clicked = e.currentTarget;
      document.querySelectorAll('.district-pill').forEach(b => b.classList.remove('active'));
      clicked.classList.add('active');
      AppState.activeDistrict = clicked.getAttribute('data-district');
      applyFiltersAndRender();
    });
  });

  // Facility Filter Chips
  document.querySelectorAll('.facility-filter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const clicked = e.currentTarget;
      const fac = clicked.getAttribute('data-facility');
      if (!fac) return;
      if (AppState.selectedFacilities.has(fac)) {
        AppState.selectedFacilities.delete(fac);
        clicked.classList.remove('active');
      } else {
        AppState.selectedFacilities.add(fac);
        clicked.classList.add('active');
      }
      applyFiltersAndRender();
    });
  });

  // Layer Toggle: Batas Wilayah Resmi Kota Palu
  const toggleCityBtn = document.getElementById('btn-toggle-city');
  if (toggleCityBtn) {
    toggleCityBtn.addEventListener('click', () => {
      AppState.showCityBoundary = !AppState.showCityBoundary;
      toggleCityBtn.classList.toggle('active', AppState.showCityBoundary);
      if (AppState.showCityBoundary) {
        AppState.map.addLayer(AppState.cityBoundaryLayer);
        showToast("Batas Administrasi Resmi Kota Palu ditampilkan", "info");
      } else {
        AppState.map.removeLayer(AppState.cityBoundaryLayer);
        showToast("Batas Kota Palu disembunyikan", "info");
      }
    });
  }

  // Layer Toggle: Jaringan Jalan Utama (Line)
  const toggleRoadsBtn = document.getElementById('btn-toggle-roads');
  if (toggleRoadsBtn) {
    toggleRoadsBtn.addEventListener('click', () => {
      AppState.showRoads = !AppState.showRoads;
      toggleRoadsBtn.classList.toggle('active', AppState.showRoads);
      if (AppState.showRoads) {
        AppState.map.addLayer(AppState.roadsLayer);
        showToast("Layer Jaringan Jalan Utama aktif", "info");
      } else {
        AppState.map.removeLayer(AppState.roadsLayer);
        showToast("Layer Jaringan Jalan dinonaktifkan", "info");
      }
    });
  }

  // Layer Toggle: Heatmap Kepadatan Spasial
  const toggleHeatmapBtn = document.getElementById('btn-toggle-heatmap');
  if (toggleHeatmapBtn) {
    toggleHeatmapBtn.addEventListener('click', () => {
      AppState.showHeatmap = !AppState.showHeatmap;
      toggleHeatmapBtn.classList.toggle('active', AppState.showHeatmap);
      updateHeatmapLayer();
      showToast(AppState.showHeatmap ? "Heatmap Kepadatan Spasial aktif" : "Heatmap dinonaktifkan", "info");
    });
  }

  // Switch Base Tile Layer (Citra Satelit & Peta Vektor)
  const baseTileSelect = document.getElementById('base-tile-select');
  if (baseTileSelect) {
    baseTileSelect.addEventListener('change', (e) => {
      const selectedName = e.target.value;
      switchBaseMap(selectedName);
    });
  }

  // Zoom / Fit Seluruh Peta Kota Palu
  const fitPaluBtn = document.getElementById('btn-fit-palu');
  if (fitPaluBtn) {
    fitPaluBtn.addEventListener('click', () => {
      fitMapToPaluCity();
      showToast("Tampilan peta difokuskan ke seluruh wilayah Kota Palu", "info");
    });
  }

  // Form Tambah Kafe Baru
  const addCafeForm = document.getElementById('form-add-cafe');
  if (addCafeForm) {
    addCafeForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const name = document.getElementById('input-cafe-name').value;
      const district = document.getElementById('input-cafe-district').value;
      const lat = parseFloat(document.getElementById('input-cafe-lat').value);
      const lng = parseFloat(document.getElementById('input-cafe-lng').value);
      const address = document.getElementById('input-cafe-address').value;
      const category = document.getElementById('input-cafe-category').value;
      const priceRange = document.getElementById('input-cafe-price').value;
      const openingHours = document.getElementById('input-cafe-hours').value;
      const popularMenu = document.getElementById('input-cafe-menu').value;
      const description = document.getElementById('input-cafe-desc').value;

      const newCafe = {
        name,
        district,
        lat,
        lng,
        address,
        category,
        priceRange,
        priceLevel: "$$",
        rating: 4.8,
        reviewsCount: 1,
        openingHours,
        status: "Buka",
        facilities: ["Wi-Fi", "Stopkontak", "AC", "Area Parkir"],
        popularMenu,
        description,
        image: "assets/images/logo.svg",
        gmapsUrl: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
      };

      await FirebaseService.addCafe(newCafe);
      await loadCafeData();
      applyFiltersAndRender();
      closeModal('modal-add-cafe');
      addCafeForm.reset();
      showToast(`Kafe "${name}" berhasil ditambahkan ke database!`, "success");
    });
  }

  // Sync to Firebase Button
  const btnSyncFirebase = document.getElementById('btn-sync-firebase');
  if (btnSyncFirebase) {
    btnSyncFirebase.addEventListener('click', async () => {
      btnSyncFirebase.disabled = true;
      btnSyncFirebase.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Mensinkronisasi...';

      try {
        const count = await FirebaseService.syncAllToFirebase((curr, total, name) => {
          document.getElementById('sync-status-msg').innerText = `Mengunggah (${curr}/${total}): ${name}`;
        });
        showToast(`Berhasil mengunggah ${count} titik kafe ke Firestore!`, "success");
      } catch (err) {
        showToast(`Sync gagal: ${err.message}`, "error");
      } finally {
        btnSyncFirebase.disabled = false;
        btnSyncFirebase.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> Mulai Sinkronisasi ke Firebase';
      }
    });
  }
}

// Fungsi Alih Base Map (Basemap Switcher Engine)
function switchBaseMap(selectedName) {
  if (!AppState.baseLayers || !AppState.baseLayers[selectedName]) return;

  // Hapus semua base layer yang sedang menempel di peta
  Object.keys(AppState.baseLayers).forEach(name => {
    const layer = AppState.baseLayers[name];
    if (AppState.map.hasLayer(layer)) {
      AppState.map.removeLayer(layer);
    }
  });

  // Tambahkan base layer yang baru dipilih
  const newLayer = AppState.baseLayers[selectedName];
  AppState.map.addLayer(newLayer);

  // Pastikan basemap selalu diletakkan di layer paling belakang (bringToBack)
  if (typeof newLayer.bringToBack === 'function') {
    newLayer.bringToBack();
  } else if (newLayer.eachLayer) {
    newLayer.eachLayer(sub => {
      if (typeof sub.bringToBack === 'function') sub.bringToBack();
    });
  }

  AppState.currentBaseLayerName = selectedName;
  showToast(`Tampilan peta diubah ke: ${selectedName}`, "info");
}

function fitMapToPaluCity() {
  if (AppState.cityBoundaryLayer && AppState.cityBoundaryLayer.getLayers().length > 0) {
    const b = AppState.cityBoundaryLayer.getLayers()[0].getBounds();
    AppState.map.fitBounds(b, { padding: [30, 30] });
  } else {
    AppState.map.flyTo([-0.8917, 119.8707], 12);
  }
}

function setDistrictFilter(districtName) {
  AppState.activeDistrict = districtName;
  document.querySelectorAll('.district-pill').forEach(btn => {
    if (btn.getAttribute('data-district').toLowerCase() === districtName.toLowerCase()) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
  applyFiltersAndRender();
}

function resetAllFilters() {
  AppState.activeDistrict = 'all';
  AppState.searchQuery = '';
  AppState.selectedFacilities.clear();
  document.getElementById('search-input').value = '';
  document.querySelectorAll('.district-pill').forEach(b => b.classList.remove('active'));
  document.querySelector('.district-pill[data-district="all"]')?.classList.add('active');
  document.querySelectorAll('.facility-filter-btn').forEach(b => b.classList.remove('active'));
  applyFiltersAndRender();
}

function toggleSidebar(forceState) {
  const sidebar = document.getElementById('sidebar');
  if (sidebar) {
    if (typeof forceState !== 'undefined') {
      sidebar.classList.toggle('open', forceState);
    } else {
      sidebar.classList.toggle('open');
    }
  }
}

function toggleTheme() {
  const isDark = document.body.classList.toggle('dark-mode');
  localStorage.setItem('kotemu_theme', isDark ? 'dark' : 'light');
  
  const icon = document.getElementById('theme-icon');
  if (icon) {
    icon.className = isDark ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
  }
}

function initTheme() {
  const saved = localStorage.getItem('kotemu_theme');
  if (saved === 'dark') {
    document.body.classList.add('dark-mode');
    const icon = document.getElementById('theme-icon');
    if (icon) icon.className = 'fa-solid fa-sun';
  }
}

function triggerPickCoordinateOnMap() {
  AppState.isMapClickModeAdd = true;
  closeModal('modal-add-cafe');
  document.getElementById('btn-pick-coord')?.classList.add('active');
  showToast("Klik sembarang titik di peta untuk mengambil koordinat...", "info");
}

function showToast(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'toast';
  
  let icon = 'fa-circle-info';
  let color = '#d97706';
  if (type === 'success') {
    icon = 'fa-circle-check';
    color = '#10b981';
  } else if (type === 'error') {
    icon = 'fa-circle-exclamation';
    color = '#ef4444';
  }

  toast.innerHTML = `<i class="fa-solid ${icon}" style="color:${color};"></i> <span>${msg}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px)';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}


// ==========================================================================
// REKAYASA PERANGKAT LUNAK (RPL) - SIKLUS TRANSAKSI & ADMIN KASIR
// Memenuhi DFD Proses 1.0 (Login), 3.0 (Pemesanan), dan 5.0 (Laporan Transaksi)
// ==========================================================================

AppState.isAdminLoggedIn = false;
AppState.activeOrderCafe = null;
AppState.currentOrderMenu = [];
AppState.currentOrderQuantities = {};

// Default Sample Menu Builder
function buildCafeMenuList(cafe) {
  const popMenu = cafe.popularMenu ? cafe.popularMenu.split(',')[0].trim() : 'Kopi Susu Gula Aren';
  return [
    { id: 1, name: popMenu, category: 'Minuman Kopi', price: 20000 },
    { id: 2, name: 'Americano Ice / Hot', category: 'Minuman Kopi', price: 18000 },
    { id: 3, name: 'Matcha Latte Premium', category: 'Non-Kopi', price: 22000 },
    { id: 4, name: 'Croissant Butter Pastry', category: 'Camilan', price: 25000 },
    { id: 5, name: 'Nasi Goreng Spesial Kafe', category: 'Makanan Berat', price: 28000 }
  ];
}

// Inisialisasi Area Pemesanan Menu pada Modal Kafe (Proses 3.0)
function initOrderSectionForCafe(cafe) {
  AppState.activeOrderCafe = cafe;
  AppState.currentOrderMenu = buildCafeMenuList(cafe);
  AppState.currentOrderQuantities = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  renderOrderMenuList();
  updateOrderTotalDisplay();
}

// Render Menu Items dalam Modal
function renderOrderMenuList() {
  const container = document.getElementById('order-menu-list');
  if (!container) return;

  container.innerHTML = AppState.currentOrderMenu.map(item => {
    const qty = AppState.currentOrderQuantities[item.id] || 0;
    return `
      <div style="display:flex; justify-content:space-between; align-items:center; background:var(--bg-surface); padding:8px 12px; border-radius:8px; border:1px solid var(--border-color);">
        <div>
          <div style="font-size:0.82rem; font-weight:700; color:var(--text-main);">${item.name}</div>
          <div style="font-size:0.75rem; color:var(--amber-primary); font-weight:700;">Rp ${item.price.toLocaleString('id-ID')} <span style="color:var(--text-muted); font-weight:normal;">(${item.category})</span></div>
        </div>
        <div style="display:flex; align-items:center; gap:8px;">
          <button type="button" class="btn-icon" style="width:28px; height:28px; border-radius:6px; background:var(--bg-app); border:1px solid var(--border-color);" onclick="changeOrderQty(${item.id}, -1)">
            <i class="fa-solid fa-minus" style="font-size:0.7rem;"></i>
          </button>
          <span id="order-qty-${item.id}" style="font-size:0.85rem; font-weight:800; min-width:20px; text-align:center; color:var(--text-main);">${qty}</span>
          <button type="button" class="btn-icon" style="width:28px; height:28px; border-radius:6px; background:var(--amber-primary); color:#fff; border:none;" onclick="changeOrderQty(${item.id}, 1)">
            <i class="fa-solid fa-plus" style="font-size:0.7rem;"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// Tambah / Kurang Jumlah Menu
function changeOrderQty(itemId, delta) {
  let cur = AppState.currentOrderQuantities[itemId] || 0;
  cur = Math.max(0, cur + delta);
  AppState.currentOrderQuantities[itemId] = cur;

  const qtyEl = document.getElementById(`order-qty-${itemId}`);
  if (qtyEl) qtyEl.innerText = cur;

  updateOrderTotalDisplay();
}

// Hitung Total Tagihan Otomatis
function calculateOrderTotal() {
  let total = 0;
  AppState.currentOrderMenu.forEach(item => {
    const qty = AppState.currentOrderQuantities[item.id] || 0;
    total += qty * item.price;
  });
  return total;
}

function updateOrderTotalDisplay() {
  const total = calculateOrderTotal();
  const el = document.getElementById('order-total-price');
  if (el) el.innerText = `Rp ${total.toLocaleString('id-ID')}`;
}

// Konfirmasi Pesanan Pelanggan & Tampilkan Struk (Proses 3.0 DFD)
function confirmCustomerOrder() {
  const total = calculateOrderTotal();
  if (total === 0) {
    showToast("Silakan tambahkan minimal 1 item menu pesanan terlebih dahulu.", "error");
    return;
  }

  const cafeName = AppState.activeOrderCafe ? AppState.activeOrderCafe.name : 'KoTemu Coffee';
  const now = new Date();
  const dateStr = now.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' +
                  now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  const trxId = 'TRX-' + now.getFullYear() + String(now.getMonth()+1).padStart(2,'0') + String(now.getDate()).padStart(2,'0') + '-' + Math.floor(1000 + Math.random() * 9000);

  // Kumpulkan item pesanan
  const orderedItems = [];
  AppState.currentOrderMenu.forEach(item => {
    const qty = AppState.currentOrderQuantities[item.id] || 0;
    if (qty > 0) {
      orderedItems.push({
        name: item.name,
        qty: qty,
        price: item.price,
        subtotal: qty * item.price
      });
    }
  });

  // Simpan record transaksi ke basis data lokal (D3 Data Transaksi)
  const newTrx = {
    id: trxId,
    cafeName: cafeName,
    date: dateStr,
    items: orderedItems,
    total: total,
    status: 'LUNAS (D3)'
  };

  saveTransactionToStore(newTrx);

  // Isi data ke modal struk
  document.getElementById('struk-cafe-name').innerText = cafeName.toUpperCase();
  document.getElementById('struk-id').innerText = trxId;
  document.getElementById('struk-date').innerText = dateStr;
  document.getElementById('struk-total').innerText = `Rp ${total.toLocaleString('id-ID')}`;

  const strukItemsContainer = document.getElementById('struk-items');
  if (strukItemsContainer) {
    strukItemsContainer.innerHTML = orderedItems.map(it => `
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <span>${it.name} (x${it.qty})</span>
        <b>Rp ${it.subtotal.toLocaleString('id-ID')}</b>
      </div>
    `).join('');
  }

  closeModal('modal-cafe-detail');
  openModal('modal-struk-transaksi');
  showToast("Pesanan berhasil dikonfirmasi dan disimpan ke D3 Data Transaksi!", "success");
}

// Simpan ke localStorage
function getSavedTransactions() {
  const raw = localStorage.getItem('kotemu_rpl_transactions');
  if (!raw) {
    // Initial Seed Data sesuai Bab IV Laporan
    const seed = [
      { id: 'TRX-20261119-1021', cafeName: 'BRKH TINOMBALA', date: '19/11/2026 09:30', items: [{ name: 'Kopi Susu Aren', qty: 2, price: 20000, subtotal: 40000 }], total: 40000, status: 'LUNAS (D3)' },
      { id: 'TRX-20261119-1045', cafeName: 'RENJANA', date: '19/11/2026 10:15', items: [{ name: 'Americano Ice', qty: 1, price: 18000, subtotal: 18000 }, { name: 'Croissant', qty: 1, price: 25000, subtotal: 25000 }], total: 43000, status: 'LUNAS (D3)' },
      { id: 'TRX-20261119-1120', cafeName: 'KORIRU JUANDA', date: '19/11/2026 11:20', items: [{ name: 'Matcha Latte', qty: 2, price: 22000, subtotal: 44000 }, { name: 'Nasi Goreng', qty: 1, price: 28000, subtotal: 28000 }], total: 72000, status: 'LUNAS (D3)' }
    ];
    localStorage.setItem('kotemu_rpl_transactions', JSON.stringify(seed));
    return seed;
  }
  try {
    return JSON.parse(raw);
  } catch(e) {
    return [];
  }
}

function saveTransactionToStore(trx) {
  const current = getSavedTransactions();
  current.unshift(trx); // Masukkan di baris paling atas
  localStorage.setItem('kotemu_rpl_transactions', JSON.stringify(current));
}

function resetTransactionHistory() {
  if (confirm("Bersihkan seluruh riwayat transaksi simulasi?")) {
    localStorage.removeItem('kotemu_rpl_transactions');
    renderTransactionReport();
    showToast("Riwayat transaksi telah diatur ulang ke data awal.", "info");
  }
}

// Autentikasi Admin Kasir (Proses 1.0 DFD)
function openAdminModal() {
  if (AppState.isAdminLoggedIn) {
    if (confirm("Anda sedang aktif sebagai Admin Kasir. Apakah Anda ingin keluar (Logout)?")) {
      handleAdminLogout();
    }
  } else {
    openModal('modal-admin-login');
  }
}

function submitAdminLogin() {
  const user = document.getElementById('input-admin-user').value.trim();
  const pass = document.getElementById('input-admin-pass').value.trim();

  if (user === 'admin' && pass === 'admin123') {
    AppState.isAdminLoggedIn = true;
    document.getElementById('admin-btn-text').innerText = 'Admin (Keluar)';
    document.getElementById('btn-rekap-transaksi').style.display = 'inline-flex';
    closeModal('modal-admin-login');
    showToast("Login Berhasil! Selamat datang Admin Kasir di Panel Sistem.", "success");
  } else {
    showToast("Login gagal! Username atau kata sandi admin tidak sesuai.", "error");
  }
}

function handleAdminLogout() {
  AppState.isAdminLoggedIn = false;
  document.getElementById('admin-btn-text').innerText = 'Login Admin';
  document.getElementById('btn-rekap-transaksi').style.display = 'none';
  showToast("Anda telah keluar dari sesi Admin.", "info");
}

// Rekapitulasi Laporan Transaksi Harian (Proses 5.0 DFD)
function renderTransactionReport() {
  const transactions = getSavedTransactions();
  const tbody = document.getElementById('rekap-table-body');
  if (!tbody) return;

  let totalOmzet = 0;
  transactions.forEach(t => totalOmzet += t.total);
  const count = transactions.length;
  const avg = count > 0 ? Math.round(totalOmzet / count) : 0;

  document.getElementById('rekap-total-trx').innerText = `${count} Pesanan`;
  document.getElementById('rekap-total-omzet').innerText = `Rp ${totalOmzet.toLocaleString('id-ID')}`;
  document.getElementById('rekap-avg-trx').innerText = `Rp ${avg.toLocaleString('id-ID')}`;

  if (transactions.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="padding:16px; text-align:center; color:var(--text-muted);">Belum ada riwayat transaksi.</td></tr>`;
    return;
  }

  tbody.innerHTML = transactions.map((t, i) => {
    const itemSummary = t.items.map(it => `${it.name} (x${it.qty})`).join(', ');
    return `
      <tr style="border-bottom:1px solid var(--border-color); ${i%2===1 ? 'background:var(--bg-app);' : ''}">
        <td style="padding:10px; font-weight:700; font-family:monospace; color:var(--amber-primary);">${t.id}</td>
        <td style="padding:10px; font-weight:700; color:var(--text-main);">${t.cafeName}</td>
        <td style="padding:10px; color:var(--text-muted); font-size:0.75rem;">${t.date}</td>
        <td style="padding:10px; color:var(--text-main); font-size:0.75rem;">${itemSummary}</td>
        <td style="padding:10px; font-weight:800; color:#059669;">Rp ${t.total.toLocaleString('id-ID')}</td>
        <td style="padding:10px;"><span style="font-size:0.7rem; background:#10b98120; color:#10b981; padding:2px 6px; border-radius:4px; font-weight:700;">${t.status}</span></td>
      </tr>
    `;
  }).join('');
}

function printReportSummary() {
  showToast("Menyiapkan dokumen cetak laporan transaksi harian...", "info");
  window.print();
}
