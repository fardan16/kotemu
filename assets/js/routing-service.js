/**
 * KoTemu - Routing Service (GIS Line Feature Engine)
 * Menghitung rute perjalanan nyata (driving directions) dari posisi awal ke kafe tujuan
 * Menggunakan Open Source Routing Machine (OSRM) API
 */

const RoutingService = {
  currentRouteLayer: null,
  startMarker: null,

  // Hitung rute dari [lat1, lng1] ke [lat2, lng2]
  async calculateRoute(startCoords, destCoords, cafeName) {
    const [startLat, startLng] = startCoords;
    const [destLat, destLng] = destCoords;

    const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${destLng},${destLat}?overview=full&geometries=geojson&steps=true`;

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Gagal menghubungi server rute OSRM");
      const data = await response.json();

      if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
        throw new Error("Rute tidak ditemukan");
      }

      const route = data.routes[0];
      const distanceKm = (route.distance / 1000).toFixed(1);
      const durationMin = Math.round(route.duration / 60);

      // Ekstrak langkah arah
      const steps = [];
      if (route.legs && route.legs[0] && route.legs[0].steps) {
        route.legs[0].steps.forEach((step, idx) => {
          if (step.maneuver && step.name) {
            steps.push({
              instruction: this.translateManeuver(step.maneuver.type, step.maneuver.modifier, step.name),
              distance: Math.round(step.distance) + ' m'
            });
          }
        });
      }

      return {
        success: true,
        geometry: route.geometry,
        distanceKm,
        durationMin,
        steps,
        cafeName,
        startCoords,
        destCoords
      };
    } catch (err) {
      console.warn("Menggunakan rute garis lurus fallback:", err.message);
      // Fallback geodesic line jika OSRM sedang lambat
      const dKm = this.calculateDirectDistance(startLat, startLng, destLat, destLng).toFixed(1);
      const estMin = Math.max(3, Math.round(dKm * 2.5));

      return {
        success: true,
        isFallback: true,
        geometry: {
          type: "LineString",
          coordinates: [
            [startLng, startLat],
            [destLng, destLat]
          ]
        },
        distanceKm: dKm,
        durationMin: estMin,
        steps: [
          { instruction: `Mulai perjalanan dari lokasi awal`, distance: "0 m" },
          { instruction: `Ikuti jalur utama menuju ${cafeName}`, distance: `${dKm} km` }
        ],
        cafeName,
        startCoords,
        destCoords
      };
    }
  },

  // Terjemahkan instruksi OSRM ke Bahasa Indonesia
  translateManeuver(type, modifier, roadName) {
    const road = roadName ? `ke ${roadName}` : 'lurus';
    if (type === 'depart') return `Mulai perjalanan menuju ${road}`;
    if (type === 'arrive') return `Tiba di lokasi tujuan (${roadName || 'Kafe'})`;
    
    if (modifier === 'right' || modifier === 'slight right' || modifier === 'sharp right') {
      return `Belok kanan ${road}`;
    }
    if (modifier === 'left' || modifier === 'slight left' || modifier === 'sharp left') {
      return `Belok kiri ${road}`;
    }
    if (modifier === 'uturn') {
      return `Putar balik di ${roadName || 'jalan'}`;
    }
    return `Lanjutkan perjalanan ${road}`;
  },

  // Hitung jarak Haversine (km)
  calculateDirectDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius bumi km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
};
