/**
 * Lectura y procesamiento de la base de datos (Google Sheet CSV)
 */

const DEFAULT_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQALxUiQ-2PXu7oNnLEF1RheNmiUbd_AHq3lKi93dfau4u7jA2xMcDgXzimVUGJTa6J6SEG5_VPu75p/pub?gid=1355428506&single=true&output=csv";

let cache = {
  badges: [],
  lastFetch: 0,
  error: null,
};

/**
 * Parsea una fecha flexible del sheet (ISO o texto en español)
 */
function parseDate(value) {
  if (!value || value.trim() === "") return null;
  const str = value.trim();

  // ISO o formato "2026-11-16 17:00"
  const iso = Date.parse(str.replace(" ", "T"));
  if (!Number.isNaN(iso)) return new Date(iso);

  // Formatos raros que a veces aparecen en el sheet
  // (dejar como null si no se puede parsear)
  return null;
}

/**
 * Parsea CSV simple (maneja comillas)
 */
function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const headers = splitCSVLine(lines[0]);
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = splitCSVLine(lines[i]);
    if (cols.length < 3) continue;

    const obj = {};
    headers.forEach((h, idx) => {
      obj[h.trim()] = (cols[idx] ?? "").trim();
    });
    rows.push(obj);
  }
  return rows;
}

function splitCSVLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

/**
 * Normaliza una fila del sheet a un objeto Badge limpio
 */
function normalizeBadge(row) {
  const startsAt = parseDate(row.startsAt);
  const endsAt = parseDate(row.endsAt);

  return {
    name: row.badge_name || row.name || "Sin nombre",
    image: row.badge_image || "",
    slug: (row.slug || "").toLowerCase(),
    status: (row.status || "inactive").toLowerCase(),
    type: (row.type || "").toLowerCase(), // sub | watch
    startsAt,
    endsAt,
    claimMethod: row.claimMethod || "",
    category: row.category || "",
    isNew: String(row.isNew || "").toUpperCase() === "TRUE",
    notes: row.notes || "",
    setId: row.set_id || "",
    version: row.version || "",
  };
}

/**
 * Calcula horas restantes hasta endsAt
 */
function hoursLeft(endsAt) {
  if (!endsAt) return null;
  const diff = endsAt.getTime() - Date.now();
  return diff / (1000 * 60 * 60);
}

/**
 * Formatea tiempo restante de forma legible
 */
export function formatTimeLeft(endsAt) {
  if (!endsAt) return "Sin fecha";
  const hours = hoursLeft(endsAt);
  if (hours === null) return "Sin fecha";
  if (hours <= 0) return "Caducada";

  const days = Math.floor(hours / 24);
  const h = Math.floor(hours % 24);
  if (days > 0) return `${days}d ${h}h`;
  return `${h}h`;
}

/**
 * Obtiene y cachea las insignias
 */
export async function fetchBadges(force = false) {
  const url = process.env.SHEET_CSV_URL || DEFAULT_CSV_URL;
  const refreshMs = (Number(process.env.REFRESH_MINUTES) || 5) * 60 * 1000;

  if (!force && cache.badges.length > 0 && Date.now() - cache.lastFetch < refreshMs) {
    return cache.badges;
  }

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "AlertaDropsMX-Bot/1.0" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const text = await res.text();
    const rows = parseCSV(text);
    const badges = rows.map(normalizeBadge).filter((b) => b.slug);

    cache = {
      badges,
      lastFetch: Date.now(),
      error: null,
    };
    console.log(`[Sheet] Cargadas ${badges.length} insignias`);
    return badges;
  } catch (err) {
    console.error("[Sheet] Error al cargar:", err.message);
    cache.error = err.message;
    // Devolver cache viejo si existe
    return cache.badges;
  }
}

/**
 * Helpers de filtrado
 */
export function getActive(badges) {
  return badges.filter((b) => b.status === "active");
}

export function getExpiringSoon(badges, hours = 72) {
  const limit = Number(process.env.EXPIRE_SOON_HOURS) || hours;
  return getActive(badges).filter((b) => {
    const h = hoursLeft(b.endsAt);
    return h !== null && h > 0 && h <= limit;
  });
}

export function findBadge(badges, query) {
  const q = query.toLowerCase().trim();
  if (!q) return null;

  // Exacto por slug
  let found = badges.find((b) => b.slug === q);
  if (found) return found;

  // Exacto por nombre
  found = badges.find((b) => b.name.toLowerCase() === q);
  if (found) return found;

  // Contiene
  found = badges.find(
    (b) =>
      b.name.toLowerCase().includes(q) ||
      b.slug.includes(q) ||
      b.category.toLowerCase().includes(q)
  );
  return found || null;
}

export function getByCategory(badges, category) {
  const q = category.toLowerCase().trim();
  return badges.filter(
    (b) =>
      b.status === "active" &&
      b.category.toLowerCase().includes(q)
  );
}

export function getCacheInfo() {
  return {
    count: cache.badges.length,
    lastFetch: cache.lastFetch,
    error: cache.error,
  };
}
