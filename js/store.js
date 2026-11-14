// שמירת נתונים במכשיר (localStorage).
// עיקרון חשוב: יום שאין עליו רשומה = "לא הוזן" (לא ידוע), ולא "לא עשיתי".

const KEY = 'nitzotz.v1';

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* ignore */ }
  return { days: {} };
}

let state = load();
const listeners = new Set();

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  listeners.forEach((fn) => fn());
}

export function onChange(fn) { listeners.add(fn); }

export function getDay(key) {
  return state.days[key] || null;
}

function ensureDay(key) {
  if (!state.days[key]) state.days[key] = { sadhana: {}, vitamins: {}, waterMl: 0 };
  return state.days[key];
}

export function toggleSadhana(key, id) {
  const d = ensureDay(key);
  d.sadhana[id] = !d.sadhana[id];
  save();
  return d.sadhana[id];
}

export function setSadhana(key, ids, value) {
  const d = ensureDay(key);
  ids.forEach((id) => { d.sadhana[id] = value; });
  save();
}

export function toggleVitamin(key, id) {
  const d = ensureDay(key);
  d.vitamins[id] = !d.vitamins[id];
  save();
  return d.vitamins[id];
}

export function setVitamins(key, ids, value) {
  const d = ensureDay(key);
  ids.forEach((id) => { d.vitamins[id] = value; });
  save();
}

export function addWater(key, ml) {
  const d = ensureDay(key);
  d.waterMl = (d.waterMl || 0) + ml;
  d.waterLog = [...(d.waterLog || []), ml];
  save();
}

// ביטול ההוספה האחרונה (בכל גודל שהיה)
export function undoWater(key, fallbackMl) {
  const d = ensureDay(key);
  const log = d.waterLog || [];
  const ml = log.length ? log[log.length - 1] : fallbackMl;
  d.waterLog = log.slice(0, -1);
  d.waterMl = Math.max(0, (d.waterMl || 0) - ml);
  save();
}

// ---- הגדרות ----
export function getSetting(name, fallback) {
  return state.settings && name in state.settings ? state.settings[name] : fallback;
}

export function setSetting(name, value) {
  state.settings = { ...(state.settings || {}), [name]: value };
  save();
}

// ---- גיבויים אוטומטיים בתוך המכשיר ----
// פעם ביום נשמר "צילום מצב" של כל הנתונים. נשמרים 14 האחרונים.
const SNAP_KEY = 'nitzotz.snapshots';
const SNAP_KEEP = 14;

export function listSnapshots() {
  try { return JSON.parse(localStorage.getItem(SNAP_KEY)) || []; } catch (e) { return []; }
}

export function takeDailySnapshot() {
  const snaps = listSnapshots();
  const today = todayKey();
  if (snaps.length && snaps[0].date === today) return;
  if (!Object.keys(state.days).length) return;
  snaps.unshift({ date: today, data: state });
  try { localStorage.setItem(SNAP_KEY, JSON.stringify(snaps.slice(0, SNAP_KEEP))); } catch (e) { /* ignore */ }
}

export function restoreSnapshot(date) {
  const snap = listSnapshots().find((s) => s.date === date);
  if (!snap) return false;
  state = snap.data;
  save();
  return true;
}

// "סימנתי את היום" – יום שהוזן אבל בלי פעולות (למשל: לא עשיתי כלום, וזה בסדר)
export function markDayLogged(key) {
  ensureDay(key);
  save();
}

export function hasData() {
  return Object.keys(state.days).length > 0;
}

export function exportData() {
  return JSON.stringify(state, null, 2);
}

export function importData(json) {
  const parsed = JSON.parse(json);
  if (!parsed || typeof parsed.days !== 'object') throw new Error('קובץ לא תקין');
  state = parsed;
  save();
}

// ---- תאריכים ----
export function dateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function fromKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key, n) {
  const d = fromKey(key);
  d.setDate(d.getDate() + n);
  return dateKey(d);
}

export function todayKey() { return dateKey(new Date()); }

// שבוע ישראלי: ראשון עד שבת
export function weekStart(key) {
  const d = fromKey(key);
  d.setDate(d.getDate() - d.getDay());
  return dateKey(d);
}
