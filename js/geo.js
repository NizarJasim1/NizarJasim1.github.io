// =============================================================
//  Geo — تحويل الإحداثيات الحقيقية لإحداثيات المشهد + تضاريس الموصل الحقيقية
//  1 وحدة = 8 متر. الشمال = −z، الشرق = +x. y = 0 = سطح ماي دجلة (≈209.5م فوق البحر)
//  المرجع (0,0) = 36.345°N 43.137°E (قرب الجسر العتيق)
//  التضاريس: نموذج ارتفاعات Copernicus GLO-30 (data/dem.bin) مع حفر مجرى دجلة من OSM
//  المواقع: كلها من OpenStreetMap (مضلّعات ونقاط المعالم نفسها)
// =============================================================
export const M_PER_U = 8;
export const LAT0 = 36.345, LON0 = 43.137;
const phi = (LAT0 * Math.PI) / 180;
export const MLAT = 111132.92 - 559.82 * Math.cos(2 * phi) + 1.175 * Math.cos(4 * phi);       // متر لكل درجة عرض
export const MLON = 111412.84 * Math.cos(phi) - 93.5 * Math.cos(3 * phi) + 0.118 * Math.cos(5 * phi); // متر لكل درجة طول
export const ll = (lat, lon) => ({ x: ((lon - LON0) * MLON) / M_PER_U, z: (-(lat - LAT0) * MLAT) / M_PER_U });
export const WATER_LEVEL = 209.5;   // منسوب الماي (م)
export const WATER_Y = 0;

// ---------------- التضاريس ----------------
let DEM = null; // { lat0, lon0, dlat, dlon, nr, nc, h: Float32Array (متر فوق الماي) }
export function setDEM(buf) {
  const dv = new DataView(buf);
  const lat0 = dv.getFloat64(0, true), lon0 = dv.getFloat64(8, true), dlat = dv.getFloat64(16, true), dlon = dv.getFloat64(24, true);
  const nr = dv.getUint32(32, true), nc = dv.getUint32(36, true);
  const raw = new Int16Array(buf, 40, nr * nc), h = new Float32Array(nr * nc);
  for (let i = 0; i < raw.length; i++) h[i] = raw[i] / 10;
  DEM = { lat0, lon0, dlat, dlon, nr, nc, h };
  return DEM;
}
export const getDEM = () => DEM;
// تسوية الأرض تحت المعالم الكبيرة: نموذج Copernicus سطحي (DSM) ويحسب كتلة المبنى نفسه أرض
// كل رقعة: دائرة نصف قطرها r (وحدات) تتسوّى على أوطى قيمة حولها، وتنساب للأرض الأصلية خلال fall
const FLATS = [];
export function addFlat(x, z, r, fall = 4, h = null) {
  if (h === null) { let m = Infinity; for (let a = 0; a < 24; a++) for (const k of [1, 1.15]) { const ang = (a / 24) * Math.PI * 2; m = Math.min(m, rawTerrain(x + Math.cos(ang) * r * k, z + Math.sin(ang) * r * k)); } h = m; }
  FLATS.push({ x, z, r, fall, h }); return h;
}
export function terrain(x, z) {
  let v = rawTerrain(x, z);
  for (const f of FLATS) { const d = Math.hypot(x - f.x, z - f.z); if (d < f.r) return f.h; if (d < f.r + f.fall) { const t = (d - f.r) / f.fall, s = t * t * (3 - 2 * t); v = f.h + (v - f.h) * s; } }
  return v;
}
// ارتفاع الأرض بوحدات المشهد عند (x,z) — بدون التسوية
export function rawTerrain(x, z) {
  if (!DEM) return 0;
  const lat = LAT0 - (z * M_PER_U) / MLAT, lon = LON0 + (x * M_PER_U) / MLON;
  let r = (DEM.lat0 - lat) / DEM.dlat, c = (lon - DEM.lon0) / DEM.dlon;   // الصف 0 = الشمال
  r = Math.max(0, Math.min(DEM.nr - 1.001, r)); c = Math.max(0, Math.min(DEM.nc - 1.001, c));
  const r0 = r | 0, c0 = c | 0, fr = r - r0, fc = c - c0, n = DEM.nc, H = DEM.h;
  const v = (H[r0 * n + c0] * (1 - fc) + H[r0 * n + c0 + 1] * fc) * (1 - fr) + (H[(r0 + 1) * n + c0] * (1 - fc) + H[(r0 + 1) * n + c0 + 1] * fc) * fr;
  return v / M_PER_U;
}

// ---------------- المعالم (من OSM) ----------------
export const PLACES = {
  // منارة الحدباء: مركز مضلّع قاعدتها (OSM way 994409254) — 36.34342°N 43.12643°E
  hadba:    { name: "منارة الحدباء", lat: 36.343422, lon: 43.12643 },
  // مصلى جامع النوري: مضلّع OSM 936237804 (53×25م، محوره مايل −5.8°)
  nuriHall: { name: "مصلى جامع النوري", ring: [[36.3426536, 43.1264589], [36.3426046, 43.127052], [36.3428293, 43.1270791], [36.3428731, 43.1265156]] },
  // الجسر العتيق (way 77464164) والجسر الجديد الموازي له جنوباً (way 1155390876)
  bridge:   { name: "الجسر العتيق", a: [36.34541, 43.136529], b: [36.346759, 43.139165], lat: 36.346085, lon: 43.137847 },
  bridgeNew:{ name: "الجسر الموازي", a: [36.345324, 43.13652], b: [36.346674, 43.139242] },
  // الجسر الحجري على نهر الخوصر (بقايا الجسر العثماني) way 77464168
  stone:    { a: [36.347872, 43.141311], b: [36.347376, 43.140321] },
  // جامع الموصل الكبير: مركز القبة الكبيرة (أجزاء OSM 2478129046/2478148524)
  grand:    { name: "جامع الموصل الكبير", lat: 36.357408, lon: 43.141476 },
  // منصة الاحتفالات: نقطة OSM 4774573644 (+ ساحة الاحتفالات 4790142325)
  platform: { name: "منصة الاحتفالات", lat: 36.37686, lon: 43.15511 },
  // جامع النبي يونس: مضلّع البناية OSM 2265896384، والنقطة 12919557661
  yunus:    { name: "جامع النبي يونس", lat: 36.34799, lon: 43.1592 },
  kuyunjik: { name: "تل قوينجق", lat: 36.3597, lon: 43.152 },
};
for (const p of Object.values(PLACES)) if (p.lat) Object.assign(p, ll(p.lat, p.lon));
