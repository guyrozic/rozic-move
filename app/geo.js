// Shared address/distance/floor helpers — ports of the identical logic duplicated in
// Hovalot's DeliveryDetailsScreen.tsx and SmallMoveAddressScreen.tsx (byte-identical
// in both screens, confirmed by direct code review). Web version geocodes via
// Nominatim/OpenStreetMap only (no Google Places key available to this site) — the
// app treats Nominatim as its own fallback path already, so the distance math itself
// (haversine × 1.3 road-distance fudge factor) is unchanged, only the *lookup* source
// is simplified from "Google Places autocomplete, Nominatim as fallback" down to
// "Nominatim only, no autocomplete suggestions."
export const FLOORS = ['קרקע', '1', '2', '3', '4', '5', '6+'];

export function getFloorNumber(floor) {
  if (floor === 'קרקע') return 0;
  if (floor === '6+') return 6;
  return parseInt(floor, 10) || 0;
}

/** Flat one-time crane surcharge by the item's own floor — NOT the unused hourly APARTMENT_CRANE_PRICE_PER_HOUR in pricing.ts (confirmed dead code in the app; this table is what's actually wired to both flows' UI). */
export const CRANE_PRICE_PER_FLOOR = { 'קרקע': 0, '1': 300, '2': 400, '3': 500, '4': 600, '5': 700, '6+': 900 };

export function craneCostFor(floor) {
  return CRANE_PRICE_PER_FLOOR[floor] ?? 500;
}

export async function geocode(address) {
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address + ' ישראל')}&format=json&limit=1`;
    const res = await fetch(url, { headers: { 'Accept-Language': 'he' } });
    const data = await res.json();
    if (data.length > 0) return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
    return null;
  } catch {
    return null;
  }
}

export function calcDistanceKm(a, b) {
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLon = (b.lon - a.lon) * Math.PI / 180;
  const x = Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return Math.ceil(R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x)) * 1.3);
}

/** Geocodes two free-text addresses and returns the km distance, or 0 if either lookup fails (mirrors the app: distance stays 0, never blocks continuing). */
export async function distanceBetween(fromFullAddress, toFullAddress) {
  const [a, b] = await Promise.all([geocode(fromFullAddress), geocode(toFullAddress)]);
  if (!a || !b) return 0;
  return calcDistanceKm(a, b);
}

export function formatDateApp(d) {
  return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
}

export function parseDateApp(str) {
  const parts = (str || '').split('/').map(Number);
  return parts.length === 3 ? new Date(parts[2], parts[1] - 1, parts[0]) : new Date();
}
