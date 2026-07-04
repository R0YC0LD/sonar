export interface GeoResult {
  lat: number;
  lng: number;
  city?: string;
  country?: string;
  source: "gps" | "ip";
}

/** Tarayici GPS/konum izni ister. Reddedilirse null doner. */
function getBrowserPosition(): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (!("geolocation" in navigator)) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 600_000 }
    );
  });
}

/** IP tabanli konum (izin gerekmez, sehir hassasiyeti dusuk). */
async function getIpLocation(): Promise<GeoResult | null> {
  try {
    const res = await fetch("https://ipapi.co/json/");
    if (!res.ok) return null;
    const d = await res.json();
    if (typeof d.latitude !== "number") return null;
    return {
      lat: d.latitude,
      lng: d.longitude,
      city: d.city,
      country: d.country_name,
      source: "ip",
    };
  } catch {
    return null;
  }
}

/** Enlem/boylamdan sehir + ulke (anahtarsiz, ucretsiz servis). */
async function reverseGeocode(lat: number, lng: number): Promise<{ city?: string; country?: string }> {
  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=tr`
    );
    if (!res.ok) return {};
    const d = await res.json();
    return { city: d.city || d.locality, country: d.countryName };
  } catch {
    return {};
  }
}

/**
 * En iyi konumu belirler: once GPS dener, olmazsa IP'ye duser.
 */
export async function resolveLocation(): Promise<GeoResult | null> {
  const gps = await getBrowserPosition();
  if (gps) {
    const place = await reverseGeocode(gps.lat, gps.lng);
    return { ...gps, ...place, source: "gps" };
  }
  return getIpLocation();
}
