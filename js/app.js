import { APP_NAME, SADHANA, SADHANA_WEEKLY_GOAL, VITAMIN_SLOTS, WATER } from './config.js';
import * as S from './store.js';

const ALL_VIT = VITAMIN_SLOTS.flatMap((s) => s.items);
const DAY_NAMES = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
const DAY_SHORT = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];

const ui = {
  view: 'today',
  key: S.todayKey(),
  weekKey: S.weekStart(S.todayKey()),
  settings: false,
};

const root = document.getElementById('app');

// ---------- helpers ----------
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const fmtDate = (key) => { const d = S.fromKey(key); return `${d.getDate()}.${d.getMonth() + 1}`; };
const emptyDay = () => ({ sadhana: {}, vitamins: {}, waterMl: 0 });

function dayStats(key) {
  const d = S.getDay(key);
  if (!d) return null;
  return {
    sad: SADHANA.filter((x) => d.sadhana[x.id]).length,
    vit: ALL_VIT.filter((x) => d.vitamins[x.id]).length,
    water: d.waterMl || 0,
  };
}

function currentSlotIndex() {
  const h = new Date().getHours();
  let idx = 0;
  VITAMIN_SLOTS.forEach((s, i) => { if (h >= s.fromHour) idx = i; });
  return idx;
}

function sadhanaWeek(key) {
  const ws = S.weekStart(key);
  let n = 0;
  for (let i = 0; i < 7; i++) {
    const st = dayStats(S.addDays(ws, i));
    if (st && st.sad > 0) n++;
  }
  return n;
}

function cupsLeft(water) {
  return Math.ceil(Math.max(0, WATER.goalMl - water) / WATER.cupMl);
}

// ---------- the single "next step" ----------
function nextStep(key) {
  const d = S.getDay(key) || emptyDay();
  const cur = currentSlotIndex();

  for (let i = 0; i <= cur; i++) {
    const slot = VITAMIN_SLOTS[i];
    const missing = slot.items.filter((it) => !d.vitamins[it.id]);
    if (missing.length) {
      return {
        what: `ויטמינים של ${slot.name} ${slot.icon}`,
        sub: missing.map((m) => m.name).join(' · '),
        btn: 'לקחתי ✓', action: 'slot-all', arg: slot.id,
      };
    }
  }

  const now = new Date();
  const water = d.waterMl || 0;
  const frac = clamp((now.getHours() + now.getMinutes() / 60 - WATER.dayStartHour) /
    (WATER.dayEndHour - WATER.dayStartHour), 0, 1);
  if (water < WATER.goalMl && water + WATER.cupMl * 0.5 < WATER.goalMl * frac) {
    return { what: 'כוס מים 💧', sub: 'כדי להישאר בקצב של היום', btn: 'שתיתי כוס', action: 'water-add' };
  }

  if (!SADHANA.some((x) => d.sadhana[x.id])) {
    return { what: 'סאדהנה 🌸', sub: 'אפילו תרגיל אחד נחשב', btn: 'לתרגול', action: 'scroll', arg: 'sadhana' };
  }

  if (water < WATER.goalMl) {
    const n = cupsLeft(water);
    return { what: 'כוס מים 💧', sub: n === 1 ? 'עוד כוס אחת ליעד!' : `עוד ${n} כוסות ליעד`, btn: 'שתיתי כוס', action: 'water-add' };
  }

  return { done: true };
}

// ---------- views ----------
function renderToday() {
  const key = ui.key;
  const today = S.todayKey();
  const isToday = key === today;
  const raw = S.getDay(key);
  const d = raw || emptyDay();
  const dow = S.fromKey(key).getDay();

  let html = `
    <div class="datebar">
      <button class="icon-btn nav" data-action="day-prev" aria-label="יום קודם">›</button>
      <div class="title">
        <b>${isToday ? 'היום' : (key === S.addDays(today, -1) ? 'אתמול' : `יום ${DAY_NAMES[dow]}`)}</b>
        <small>יום ${DAY_NAMES[dow]} · ${fmtDate(key)}</small>
        ${isToday ? '' : '<br><button class="link-today" data-action="go-today">חזרה להיום</button>'}
      </div>
      <button class="icon-btn nav" data-action="day-next" aria-label="יום הבא" ${isToday ? 'disabled' : ''}>‹</button>
    </div>`;

  if (isToday) {
    const n = nextStep(key);
    html += n.done
      ? `<section class="card next"><div class="label">הצעד הבא</div>
           <div class="what">הכל בוצע להיום! 🎉<br><span class="muted">את מדהימה ✨</span></div></section>`
      : `<section class="card next"><div class="label">הצעד הבא ✨</div>
           <div class="what">${n.what}<br><span class="muted">${n.sub}</span></div>
           <button class="btn-main" data-action="${n.action}" data-arg="${n.arg || ''}">${n.btn}</button></section>`;
  } else if (!raw) {
    html += `<div class="banner">
        את היום הזה עוד לא הזנת – וזה בסדר גמור 💜<br>
        אפשר להשלים עכשיו רק את מה שזוכרים. גם מידע חלקי שווה הרבה.
        <div class="row">
          <button class="btn-soft" data-action="vit-all-day">לקחתי את כל הוויטמינים</button>
          <button class="btn-soft" data-action="mark-logged">לא תרגלתי ביום הזה</button>
        </div>
      </div>`;
  }

  // water
  const water = d.waterMl || 0;
  const cupCount = Math.ceil(WATER.goalMl / WATER.cupMl);
  let cups = '';
  for (let i = 0; i < cupCount; i++) {
    const cap = Math.min(WATER.cupMl, WATER.goalMl - i * WATER.cupMl);
    const fill = clamp((water - i * WATER.cupMl) / cap, 0, 1);
    cups += `<div class="cup"><i style="height:${fill * 100}%"></i></div>`;
  }
  const left = cupsLeft(water);
  html += `
    <section class="card" id="water">
      <h2>💧 מים <span class="count">${water} / ${WATER.goalMl} מ״ל</span></h2>
      <div class="cups">${cups}</div>
      <div class="bar"><i style="width:${clamp(water / WATER.goalMl, 0, 1) * 100}%;background:var(--sky)"></i></div>
      <p class="muted" style="text-align:center;margin:8px 0 0">
        ${left === 0 ? 'הגעת ליעד! 💙' : left === 1 ? 'נשארה עוד כוס אחת' : `נשארו עוד ${left} כוסות`}
      </p>
      <div class="water-actions">
        <button class="btn-minus" data-action="water-sub" aria-label="הורדת כוס">−</button>
        <button class="btn-water" data-action="water-add">+ כוס (${WATER.cupMl} מ״ל)</button>
      </div>
    </section>`;

  // vitamins
  const vitDone = ALL_VIT.filter((x) => d.vitamins[x.id]).length;
  const cur = currentSlotIndex();
  html += `<section class="card" id="vitamins"><h2>💊 ויטמינים ותוספים <span class="count">${vitDone}/${ALL_VIT.length}</span></h2>`;
  VITAMIN_SLOTS.forEach((slot, i) => {
    const allOn = slot.items.every((it) => d.vitamins[it.id]);
    html += `<div class="slot ${isToday && i === cur ? 'now' : ''}">
      <div class="slot-head">${slot.icon} ${slot.name}
        ${allOn ? '' : `<button class="btn-soft" data-action="slot-all" data-arg="${slot.id}">הכל ✓</button>`}
      </div>
      <div class="chips">${slot.items.map((it) =>
        `<button class="chip ${d.vitamins[it.id] ? 'on' : ''}" data-action="vit" data-arg="${it.id}">${it.name}</button>`).join('')}
      </div></div>`;
  });
  html += '</section>';

  // sadhana
  const sadDone = SADHANA.filter((x) => d.sadhana[x.id]).length;
  const weekN = sadhanaWeek(key);
  let dots = '';
  for (let i = 0; i < SADHANA_WEEKLY_GOAL; i++) dots += `<span class="dot ${i < weekN ? 'on' : ''}"></span>`;
  html += `
    <section class="card" id="sadhana">
      <h2>🌸 סאדהנה <span class="count">${sadDone}/${SADHANA.length}</span></h2>
      <div class="practice">${SADHANA.map((x) => `
        <button class="practice-item ${d.sadhana[x.id] ? 'on' : ''}" data-action="sad" data-arg="${x.id}">
          <span class="box">${d.sadhana[x.id] ? '✓' : ''}</span>${x.name}
        </button>`).join('')}
      </div>
      <div class="weekly-goal">
        ${dots}
        <span class="muted">${weekN >= SADHANA_WEEKLY_GOAL
          ? 'יעד שבועי הושג! 🌟'
          : `השבוע: ${weekN} מתוך ${SADHANA_WEEKLY_GOAL} ימים`}</span>
      </div>
    </section>`;

  return html;
}

function cell(state, frac, label, color) {
  if (state === 'future') return '<div class="cell future"></div>';
  if (state === 'unknown') return `<div class="cell unknown" data-action="open-day" data-arg="${label}"></div>`;
  if (frac <= 0) return `<div class="cell zero" data-action="open-day" data-arg="${label.key}"></div>`;
  const pct = Math.round(25 + frac * 75);
  return `<div class="cell" data-action="open-day" data-arg="${label.key}"
    style="background:color-mix(in srgb, ${color} ${pct}%, transparent)">${label.text}</div>`;
}

function renderWeek() {
  const ws = ui.weekKey;
  const today = S.todayKey();
  const thisWeek = S.weekStart(today);
  const keys = Array.from({ length: 7 }, (_, i) => S.addDays(ws, i));

  let html = `
    <div class="datebar">
      <button class="icon-btn nav" data-action="week-prev" aria-label="שבוע קודם">›</button>
      <div class="title"><b>${ws === thisWeek ? 'השבוע' : 'שבוע'}</b>
        <small><bdi>${fmtDate(keys[0])}</bdi> – <bdi>${fmtDate(keys[6])}</bdi></small></div>
      <button class="icon-btn nav" data-action="week-next" aria-label="שבוע הבא" ${ws >= thisWeek ? 'disabled' : ''}>‹</button>
    </div>`;

  const head = '<div></div>' + keys.map((k, i) =>
    `<div class="h ${k === today ? 'today' : ''}" data-action="open-day" data-arg="${k}">${DAY_SHORT[i]}<br>${fmtDate(k)}</div>`).join('');

  const row = (name, fn, color) => `<div class="rowname">${name}</div>` + keys.map((k) => {
    if (k > today) return cell('future');
    const st = dayStats(k);
    if (!st) return cell('unknown', 0, k);
    const [frac, text] = fn(st);
    return cell('ok', frac, { key: k, text }, color);
  }).join('');

  html += `<section class="card"><h2>📅 מבט שבועי</h2><div class="grid">${head}
    ${row('🌸 סאדהנה', (s) => [s.sad / SADHANA.length, s.sad || ''], 'var(--lav)')}
    ${row('💊 ויטמינים', (s) => [s.vit / ALL_VIT.length, s.vit || ''], 'var(--mint)')}
    ${row('💧 מים', (s) => [s.water / WATER.goalMl, s.water ? (s.water / 1000).toFixed(1) : ''], 'var(--sky)')}
    </div>
    <div class="legend">
      <span><i class="cell unknown"></i> לא הוזן (לא נספר)</span>
      <span><i class="cell" style="background:var(--lav)"></i> ככל שכהה יותר – יותר</span>
    </div>
    <p class="muted" style="margin:8px 0 0">לחיצה על יום פותחת אותו לעריכה</p>
  </section>`;

  // which practices on which days
  html += `<section class="card"><h2>🌸 מה תרגלתי בכל יום</h2><div class="grid">${head}` +
    SADHANA.map((x) => `<div class="rowname">${x.name}</div>` + keys.map((k) => {
      if (k > today) return cell('future');
      const d = S.getDay(k);
      if (!d) return cell('unknown', 0, k);
      return d.sadhana[x.id]
        ? `<div class="cell" style="background:var(--lav);color:#fff" data-action="open-day" data-arg="${k}">✓</div>`
        : `<div class="cell zero" data-action="open-day" data-arg="${k}"></div>`;
    }).join('')).join('') + '</div></section>';

  // summary – only over logged days
  const logged = keys.filter((k) => k <= today && dayStats(k)).map(dayStats);
  const unlogged = keys.filter((k) => k <= today && !dayStats(k)).length;
  const sadDays = logged.filter((s) => s.sad > 0).length;
  const avgWater = logged.length ? logged.reduce((a, s) => a + s.water, 0) / logged.length : 0;
  const vitPct = logged.length ? logged.reduce((a, s) => a + s.vit, 0) / (logged.length * ALL_VIT.length) : 0;
  html += `<section class="card"><h2>✨ סיכום השבוע</h2>
    <div class="stats">
      <div class="stat"><b>${sadDays}/${SADHANA_WEEKLY_GOAL}</b><small>ימי סאדהנה</small></div>
      <div class="stat"><b>${(avgWater / 1000).toFixed(1)} ל׳</b><small>מים בממוצע ליום</small></div>
      <div class="stat"><b>${Math.round(vitPct * 100)}%</b><small>ויטמינים שנלקחו</small></div>
      <div class="stat"><b>${logged.length}</b><small>ימים שהוזנו</small></div>
    </div>
    ${unlogged ? `<p class="muted" style="margin:10px 0 0">${unlogged} ימים לא הוזנו – הם לא נספרים, ואינם כישלון 💜</p>` : ''}
  </section>`;

  return html;
}

function renderSettings() {
  return `<div class="overlay" data-action="close-settings">
    <section class="card sheet" data-stop>
      <h2>⚙️ הגדרות</h2>
      <p class="muted">כרגע הנתונים נשמרים רק במכשיר הזה. מומלץ לשמור גיבוי מדי פעם.</p>
      <div class="row">
        <button class="btn-soft" data-action="export">⬇️ שמירת גיבוי</button>
        <label class="btn-soft" style="cursor:pointer">⬆️ שחזור מגיבוי
          <input type="file" accept="application/json" id="import-file" hidden></label>
      </div>
      <div class="row" style="margin-top:16px"><button class="btn-main" data-action="close-settings">סגירה</button></div>
    </section></div>`;
}

function render() {
  root.innerHTML = `
    <div class="app">
      <header class="top">
        <div class="brand">${APP_NAME} <span>✨</span></div>
        <button class="icon-btn" data-action="open-settings" aria-label="הגדרות">⚙️</button>
      </header>
      ${ui.view === 'today' ? renderToday() : renderWeek()}
    </div>
    <nav class="tabs">
      <button class="tab ${ui.view === 'today' ? 'on' : ''}" data-action="tab" data-arg="today"><b>🌷</b>היום</button>
      <button class="tab ${ui.view === 'week' ? 'on' : ''}" data-action="tab" data-arg="week"><b>📅</b>השבוע</button>
    </nav>
    ${ui.settings ? renderSettings() : ''}`;
}

// ---------- feedback ----------
function sparkle(x, y) {
  const layer = document.getElementById('sparkles');
  const glyphs = ['✨', '⭐', '💫', '🌸'];
  for (let i = 0; i < 8; i++) {
    const s = document.createElement('span');
    s.className = 'spark';
    s.textContent = glyphs[i % glyphs.length];
    const a = (Math.PI * 2 * i) / 8;
    s.style.left = `${x - 8}px`;
    s.style.top = `${y - 8}px`;
    s.style.setProperty('--dx', `${Math.cos(a) * 60}px`);
    s.style.setProperty('--dy', `${Math.sin(a) * 60}px`);
    layer.appendChild(s);
    setTimeout(() => s.remove(), 1000);
  }
}

function toast(msg) {
  document.querySelectorAll('.toast').forEach((t) => t.remove());
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2500);
}

// ---------- actions ----------
function act(action, arg, ev) {
  const key = ui.key;
  const before = dayStats(key) || { sad: 0, vit: 0, water: 0 };
  let positive = false;

  switch (action) {
    case 'tab': ui.view = arg; if (arg === 'week') ui.weekKey = S.weekStart(ui.key); window.scrollTo(0, 0); break;
    case 'day-prev': ui.key = S.addDays(ui.key, -1); break;
    case 'day-next': if (ui.key < S.todayKey()) ui.key = S.addDays(ui.key, 1); break;
    case 'go-today': ui.key = S.todayKey(); break;
    case 'week-prev': ui.weekKey = S.addDays(ui.weekKey, -7); break;
    case 'week-next': ui.weekKey = S.addDays(ui.weekKey, 7); break;
    case 'open-day': ui.key = arg; ui.view = 'today'; window.scrollTo(0, 0); break;
    case 'sad': positive = S.toggleSadhana(key, arg); break;
    case 'vit': positive = S.toggleVitamin(key, arg); break;
    case 'slot-all': {
      const slot = VITAMIN_SLOTS.find((s) => s.id === arg);
      S.setVitamins(key, slot.items.map((i) => i.id), true); positive = true; break;
    }
    case 'vit-all-day': S.setVitamins(key, ALL_VIT.map((i) => i.id), true); positive = true; break;
    case 'mark-logged': S.markDayLogged(key); toast('נרשם. מחר יום חדש 💜'); break;
    case 'water-add': S.addWater(key, WATER.cupMl); positive = true; break;
    case 'water-sub': S.addWater(key, -WATER.cupMl); break;
    case 'scroll': document.getElementById(arg)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); return;
    case 'open-settings': ui.settings = true; break;
    case 'close-settings': ui.settings = false; break;
    case 'export': {
      const blob = new Blob([S.exportData()], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `nitzotz-backup-${S.todayKey()}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      return;
    }
    default: return;
  }

  render();

  if (positive && ev) sparkle(ev.clientX, ev.clientY);
  const after = dayStats(key);
  if (after) {
    if (before.sad === 0 && after.sad === 1) toast('התחלת! כל תרגיל נחשב ✨');
    else if (before.sad < SADHANA.length && after.sad === SADHANA.length) toast('כל הסאדהנה הושלמה! 🌸');
    if (before.vit < ALL_VIT.length && after.vit === ALL_VIT.length) toast('כל הוויטמינים נלקחו 💊✨');
    if (before.water < WATER.goalMl && after.water >= WATER.goalMl) toast('הגעת ליעד המים! 💧🎉');
  }
}

document.addEventListener('click', (ev) => {
  if (ev.target.closest('[data-stop]') && !ev.target.closest('[data-action]')) return;
  const el = ev.target.closest('[data-action]');
  if (!el || el.disabled) return;
  if (el.dataset.action === 'close-settings' && el.classList.contains('overlay') && ev.target !== el) return;
  act(el.dataset.action, el.dataset.arg, ev);
});

document.addEventListener('change', async (ev) => {
  if (ev.target.id !== 'import-file') return;
  const file = ev.target.files[0];
  if (!file) return;
  try {
    S.importData(await file.text());
    ui.settings = false;
    render();
    toast('הגיבוי שוחזר ✨');
  } catch (e) {
    toast('לא הצלחתי לקרוא את הקובץ');
  }
});

// כשחוזרים לאפליקציה אחרי חצות – לעבור ליום החדש
let lastToday = S.todayKey();
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  const t = S.todayKey();
  if (t !== lastToday) {
    if (ui.key === lastToday) ui.key = t;
    lastToday = t;
  }
  render();
});

render();
