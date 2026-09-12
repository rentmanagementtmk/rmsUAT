'use strict';

// CONFIG is defined in config.js (loaded before this file) — kept separate so it can
// differ per environment (Prod/UAT) without touching this file.

// ─── CONSTANTS ───────────────────────────────────────────────────────────────
const BUILDINGS = ['Jalanidhi', 'Spatika', 'Manikya', 'Vaidurya', 'Aparanji'];

const FLOOR_LABELS = { GF: 'Ground Floor', FF: 'First Floor', SF: 'Second Floor' };

const HOUSES = [
  { id: 'JLN-GF-01', building: 'Jalanidhi', floor: 'GF', num: '01', displayNum: 1 },
  { id: 'JLN-GF-02', building: 'Jalanidhi', floor: 'GF', num: '02', displayNum: 2 },
  { id: 'JLN-FF-01', building: 'Jalanidhi', floor: 'FF', num: '01', displayNum: 3 },
  { id: 'JLN-FF-02', building: 'Jalanidhi', floor: 'FF', num: '02', displayNum: 4 },
  { id: 'JLN-SF-01', building: 'Jalanidhi', floor: 'SF', num: '01', displayNum: 5 },
  { id: 'JLN-SF-02', building: 'Jalanidhi', floor: 'SF', num: '02', displayNum: 6 },
  { id: 'SPT-GF-01', building: 'Spatika',   floor: 'GF', num: '01', displayNum: 1 },
  { id: 'SPT-GF-02', building: 'Spatika',   floor: 'GF', num: '02', displayNum: 2 },
  { id: 'SPT-FF-01', building: 'Spatika',   floor: 'FF', num: '01', displayNum: 3 },
  { id: 'SPT-FF-02', building: 'Spatika',   floor: 'FF', num: '02', displayNum: 4 },
  { id: 'MNK-GF-01', building: 'Manikya',   floor: 'GF', num: '01', displayNum: 1 },
  { id: 'MNK-GF-02', building: 'Manikya',   floor: 'GF', num: '02', displayNum: 2 },
  { id: 'MNK-FF-01', building: 'Manikya',   floor: 'FF', num: '01', displayNum: 3 },
  { id: 'MNK-FF-02', building: 'Manikya',   floor: 'FF', num: '02', displayNum: 4 },
  { id: 'VDR-GF-01', building: 'Vaidurya',  floor: 'GF', num: '01', displayNum: 1 },
  { id: 'VDR-GF-02', building: 'Vaidurya',  floor: 'GF', num: '02', displayNum: 2 },
  { id: 'VDR-FF-01', building: 'Vaidurya',  floor: 'FF', num: '01', displayNum: 3 },
  { id: 'VDR-FF-02', building: 'Vaidurya',  floor: 'FF', num: '02', displayNum: 4 },
  { id: 'APR-GF-01', building: 'Aparanji',  floor: 'GF', num: '01', displayNum: 1 },
  { id: 'APR-GF-02', building: 'Aparanji',  floor: 'GF', num: '02', displayNum: 2 },
  { id: 'APR-FF-01', building: 'Aparanji',  floor: 'FF', num: '01', displayNum: 3 },
  { id: 'APR-FF-02', building: 'Aparanji',  floor: 'FF', num: '02', displayNum: 4 },
  { id: 'APR-SF-01', building: 'Aparanji',  floor: 'SF', num: '01', displayNum: 5 },
  { id: 'APR-SF-02', building: 'Aparanji',  floor: 'SF', num: '02', displayNum: 6 },
];

// ─── AUTH ──────────────────────────────────────────────────────────────────────
const AUTH_TOKEN_KEY = 'rms_auth_token';
const AUTH_INFO_KEY  = 'rms_auth_info';

function getAuthToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY) || sessionStorage.getItem(AUTH_TOKEN_KEY) || '';
}

function setAuthSession(token, info, remember) {
  const store = remember ? localStorage : sessionStorage;
  store.setItem(AUTH_TOKEN_KEY, token);
  store.setItem(AUTH_INFO_KEY, JSON.stringify(info));
}

function getAuthInfo() {
  const raw = localStorage.getItem(AUTH_INFO_KEY) || sessionStorage.getItem(AUTH_INFO_KEY);
  try { return raw ? JSON.parse(raw) : null; } catch (_) { return null; }
}

function clearAuth() {
  localStorage.removeItem(AUTH_TOKEN_KEY); localStorage.removeItem(AUTH_INFO_KEY);
  sessionStorage.removeItem(AUTH_TOKEN_KEY); sessionStorage.removeItem(AUTH_INFO_KEY);
}

/** Redirects to login if no token is present; call at the top of every protected page init */
function requireAuth() {
  // Public, unauthenticated pages — never redirected to login
  if (['login', 'door-ledger'].includes(document.body.dataset.page)) return true;
  if (!getAuthToken()) {
    const redirect = encodeURIComponent(location.pathname.split('/').pop() + location.search);
    location.href = `login.html?redirect=${redirect}`;
    return false;
  }
  return true;
}

function handleUnauthorized() {
  clearAuth();
  location.href = 'login.html';
}

// ─── API ──────────────────────────────────────────────────────────────────────
async function apiGet(params, { forceRefresh = false } = {}) {
  const url = new URL(CONFIG.API_URL);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  url.searchParams.set('token', getAuthToken());
  if (forceRefresh) url.searchParams.set('_t', Date.now()); // bust browser HTTP cache
  const resp = await fetch(url.toString(), forceRefresh ? { cache: 'reload' } : {});
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const data = await resp.json();
  if (data.error === 'UNAUTHORIZED') { handleUnauthorized(); throw new Error('UNAUTHORIZED'); }
  return data;
}

// Omitting Content-Type keeps this a "simple request" — no CORS preflight needed
async function apiPost(body) {
  const resp = await fetch(CONFIG.API_URL, {
    method: 'POST',
    body: JSON.stringify({ ...body, token: getAuthToken() }),
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const data = await resp.json();
  if (data.error === 'UNAUTHORIZED') { handleUnauthorized(); throw new Error('UNAUTHORIZED'); }
  return data;
}

// ─── UTILITIES ───────────────────────────────────────────────────────────────
function showToast(msg, type = 'info', ms) {
  // duration by type: success 4s, warning 5s, error 6s
  const duration = ms ?? (type === 'success' ? 4000 : type === 'error' ? 6000 : 5000);
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.className = `toast ${type}`;
  el.classList.remove('hidden');
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.classList.add('hidden'), duration);
}

/** Returns { month, year } of the previous calendar month (1-based month) */
function prevMonth() {
  const now = new Date();
  const m = now.getMonth() + 1;
  const y = now.getFullYear();
  return m === 1 ? { month: 12, year: y - 1 } : { month: m - 1, year: y };
}

function showLoader() { document.getElementById('page-loader')?.classList.remove('hidden'); }
function hideLoader() { document.getElementById('page-loader')?.classList.add('hidden'); }

function showValidateResult(res) {
  const renderItem = item => {
    const msg = t('validate.err.' + item.code).replace('{value}', item.value || '');
    return `<li><strong>${item.house}:</strong> ${msg}</li>`;
  };

  const summary = `✅ ${res.passed} ${t('validate.passed')}  ❌ ${res.issues.length} ${t('validate.issues_count')}  ⚠️ ${res.warnings.length} ${t('validate.warnings_count')}`;

  const lines = [
    `<div class="val-summary">${summary}</div>`,
    ...(res.issues.length   ? [`<p class="val-section-label">${t('validate.issues')}</p>`,   `<ul class="val-list">${res.issues.map(renderItem).join('')}</ul>`]   : []),
    ...(res.warnings.length ? [`<p class="val-section-label">${t('validate.warnings')}</p>`, `<ul class="val-list">${res.warnings.map(renderItem).join('')}</ul>`] : []),
    ...(res.issues.length === 0 && res.warnings.length === 0 ? [`<p class="val-ok">${t('validate.all_ok')}</p>`] : []),
  ].join('');

  // Reuse dup-modal structure for the result overlay
  const modal    = document.getElementById('dup-modal');
  const detailEl = document.getElementById('dup-existing');
  const cancelBtn  = document.getElementById('dup-cancel');
  const confirmBtn = document.getElementById('dup-confirm');

  document.getElementById('dup-title').textContent    = t('validate.title');
  document.getElementById('dup-body').textContent     = '';
  document.getElementById('dup-question').textContent = '';
  cancelBtn.textContent  = t('validate.close');
  confirmBtn.classList.add('hidden');
  detailEl.innerHTML = lines;
  modal.classList.remove('hidden');

  function close() {
    modal.classList.add('hidden');
    confirmBtn.classList.remove('hidden');
    cancelBtn.removeEventListener('click', close);
  }
  cancelBtn.addEventListener('click', close);
}

function showDupModal(records) {
  return new Promise(resolve => {
    const modal      = document.getElementById('dup-modal');
    const detailEl   = document.getElementById('dup-existing');
    const cancelBtn  = document.getElementById('dup-cancel');
    const confirmBtn = document.getElementById('dup-confirm');

    const first    = records[0];
    const entry    = HOUSES.find(x => x.id === first.HouseID);
    const name     = entry ? houseLabel(entry) : first.HouseLabel;
    const monthYear = `${t('month.' + first.RentForMonth)} ${first.RentForYear}`;
    const multi    = records.length > 1;

    // House + month context in body; table focuses on Amount / Date columns only
    const bodyText = `${name} \u00b7 ${monthYear} \u00b7 ${records.length} ${t('msg.payments')}`;

    const dataRows = records.map(r => `
      <tr>
        <td class="dt-amount">${inr(r.AmountReceived)}</td>
        <td class="dt-date">${formatDate(r.CollectedDate)}</td>
      </tr>`).join('');

    const totalRow = multi
      ? `<tr class="dt-total-row">
          <td class="dt-total-label">${t('modal.total')}</td>
          <td class="dt-total-val">${inr(records.reduce((s, r) => s + r.AmountReceived, 0))}</td>
         </tr>`
      : '';

    detailEl.innerHTML = `
      <table class="dup-table">
        <thead>
          <tr>
            <th>${t('modal.amount')}</th>
            <th>${t('modal.collected')}</th>
          </tr>
        </thead>
        <tbody>${dataRows}</tbody>
        ${totalRow ? `<tfoot>${totalRow}</tfoot>` : ''}
      </table>`;

    document.getElementById('dup-title').textContent    = t('modal.dup_title');
    document.getElementById('dup-body').textContent     = bodyText;
    document.getElementById('dup-question').textContent = t('modal.dup_question');
    cancelBtn.textContent  = t('collect.cancel');
    confirmBtn.textContent = t('modal.save_anyway');

    modal.classList.remove('hidden');

    function cleanup() {
      modal.classList.add('hidden');
      cancelBtn.removeEventListener('click', onCancel);
      confirmBtn.removeEventListener('click', onConfirm);
    }
    function onCancel()  { cleanup(); resolve(false); }
    function onConfirm() { cleanup(); resolve(true);  }

    cancelBtn.addEventListener('click', onCancel);
    confirmBtn.addEventListener('click', onConfirm);
  });
}

function inr(amount) {
  const n = Number(amount);
  const opts = Number.isInteger(n)
    ? { minimumFractionDigits: 0, maximumFractionDigits: 0 }
    : { minimumFractionDigits: 2, maximumFractionDigits: 2 };
  return '₹' + n.toLocaleString('en-IN', opts);
}

// Escapes user-editable text (tenant names, descriptions, messages) before innerHTML insertion —
// prevents a malicious/compromised operator's sheet entry from executing as script in other viewers' browsers
function escapeHtml(str) {
  return String(str ?? '').replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[ch]));
}

const _MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function formatDate(isoStr) {
  if (!isoStr) return '';
  const d  = new Date(isoStr);
  const dd = String(d.getDate()).padStart(2, '0');
  const mo = _MONTHS_SHORT[d.getMonth()];
  const yr = d.getFullYear();
  let   h  = d.getHours();
  const mi = String(d.getMinutes()).padStart(2, '0');
  const ap = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${dd}-${mo}-${yr} ${h}:${mi} ${ap}`;
}

function populateMonthSelect(el) {
  for (let i = 1; i <= 12; i++) {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = t('month.' + i);
    el.appendChild(opt);
  }
}

function populateYearSelect(el) {
  const y = new Date().getFullYear();
  [y - 1, y, y + 1].forEach((yr, i) => {
    const opt = document.createElement('option');
    opt.value = yr;
    opt.textContent = yr;
    if (i === 1) opt.selected = true;
    el.appendChild(opt);
  });
}

// Single source of truth for house display name — update here when tenant name is added
function houseLabel(h) {
  const base   = `${h.building} ${h.displayNum}`;
  const tenant = HOUSE_CACHE[h.id]?.TenantName || '';
  return tenant ? `${base} - ${escapeHtml(tenant)}` : base;
}

// houseId → full house row from Masters_Houses (loaded once on page init)
let HOUSE_CACHE = {};
let _dashboardRecords = null; // last rendered records, used for silent re-render after cache refresh
let _dashboardBalances = null; // last rendered balances, kept in sync with _dashboardRecords

const LS_HOUSE_KEY = 'rms_houses';
const LS_TTL_MS    = 60 * 60 * 1000; // 1 hour

const _houseSelectEls = new Set(); // tracks all house <select> elements for silent refresh

/** Returns true when a notification was not successfully delivered */
function notifFailed(status) {
  return status !== 'SENT' && status !== true && status !== '' && status != null;
}

/** Balance status dot with tooltip. isVacant shows orange (no tenant, not pre-booked). */
function balDot(balance, expectedRent, today, isVacant) {
  if (isVacant)
    return `<span class="bal-dot tip dot-orange" data-tip="${t('dot.vacant')}"></span>`;
  if (balance === 0)
    return `<span class="bal-dot tip dot-green" data-tip="${t('dot.paid')}"></span>`;
  if (today.getDate() <= 10) return '';
  if (expectedRent > 0 && balance >= 2 * expectedRent)
    return `<span class="bal-dot tip dot-red" data-tip="${t('dot.overdue')}"></span>`;
  if (expectedRent > 0 && balance < 2 * expectedRent)
    return `<span class="bal-dot tip dot-yellow" data-tip="${t('dot.due')}"></span>`;
  return '';
}

// Mobile tap: toggle tooltip visibility; click elsewhere dismisses
document.addEventListener('click', e => {
  const tip = e.target.closest('.tip');
  document.querySelectorAll('.tip.show-tip').forEach(el => { if (el !== tip) el.classList.remove('show-tip'); });
  if (tip) tip.classList.toggle('show-tip');
});

/** Loads from localStorage instantly, then silently refreshes from API in background */
function loadHouseCache() {
  // Synchronous: populate from localStorage if fresh
  try {
    const raw = localStorage.getItem(LS_HOUSE_KEY);
    if (raw) {
      const { ts, data } = JSON.parse(raw);
      if (Date.now() - ts < LS_TTL_MS) Object.assign(HOUSE_CACHE, data);
    }
  } catch (_) {}

  // Async background refresh — silently updates cache and selects when done
  apiGet({ action: 'getHouses' }).then(res => {
    if (!res.houses) return;
    const fresh = {};
    res.houses.forEach(h => { fresh[h.HouseID] = h; });
    Object.assign(HOUSE_CACHE, fresh);
    try { localStorage.setItem(LS_HOUSE_KEY, JSON.stringify({ ts: Date.now(), data: fresh })); } catch (_) {}
    _refreshHouseSelects();
  }).catch(() => {});
}

function _renderHouseSelect(el) {
  const savedVal        = el.value;
  const includeBuildings = el.dataset.buildings === 'true';
  Array.from(el.children).filter(c => c.tagName === 'OPTGROUP').forEach(c => c.remove());
  BUILDINGS.forEach(building => {
    const grp = document.createElement('optgroup');
    grp.label = building;

    if (includeBuildings) {
      const count   = HOUSES.filter(h => h.building === building).length;
      const bldgOpt = document.createElement('option');
      bldgOpt.value       = `BLDG:${building}`;
      bldgOpt.textContent = t('dashboard.all_building').replace('{name}', building).replace('{count}', count);
      grp.appendChild(bldgOpt);
    }
    HOUSES.filter(h => h.building === building).forEach(h => {
      const opt    = document.createElement('option');
      opt.value    = h.id;
      const cached = HOUSE_CACHE[h.id];
      // IsActive can be boolean true or string 'TRUE' depending on sheet format
      const active  = cached ? (cached.IsActive === true || String(cached.IsActive).toUpperCase() === 'TRUE') : true;
      const tenant  = cached?.TenantName || '';
      const base    = `${h.building} ${h.displayNum}`;
      if (!active) {
        opt.textContent = `${base} — Vacant`;
        opt.disabled    = true;
      } else if (!tenant) {
        opt.textContent = `${base} ⚠️`;
      } else {
        opt.textContent = `${base} - ${tenant}`;
      }
      grp.appendChild(opt);
    });
    el.appendChild(grp);
  });
  el.value = savedVal;
}

function _refreshHouseSelects() {
  _houseSelectEls.forEach(el => _renderHouseSelect(el));
  // Re-render dashboard rows silently if they are already on screen
  if (_dashboardRecords) {
    const resultsEl = document.getElementById('results');
    if (resultsEl && resultsEl.children.length > 0) {
      const renderFn = resultsEl._render;
      if (typeof renderFn === 'function') renderFn(_dashboardRecords, _dashboardBalances);
    }
  }
  // Re-render Misc Charges house checklist, if that page registered a refresh hook
  if (typeof _refreshMiscHouseList === 'function') _refreshMiscHouseList();
  // Re-render Collect page's house grid, if that page registered a refresh hook
  if (typeof _refreshCollectHouseGrid === 'function') _refreshCollectHouseGrid();
}

let _refreshMiscHouseList = null;
let _refreshCollectHouseGrid = null;

function populateHouseSelect(el) {
  _houseSelectEls.add(el);
  _renderHouseSelect(el);
}

// ─── COLLECT PAGE ─────────────────────────────────────────────────────────────
async function initCollectPage() {
  loadHouseCache(); // localStorage (instant) + background API refresh

  const monthSel  = document.getElementById('rent-month');
  const yearSel   = document.getElementById('rent-year');
  populateMonthSelect(monthSel);
  populateYearSelect(yearSel);
  const { month, year } = prevMonth();
  monthSel.value = month;
  yearSel.value  = year;

  const scanSection  = document.getElementById('scan-section');
  const formSection  = document.getElementById('form-section');
  const buildingTabsEl = document.getElementById('collect-building-tabs');
  const houseGridEl  = document.getElementById('collect-house-grid');
  const rescanBtn    = document.getElementById('rescan-btn');
  const rentForm     = document.getElementById('rent-form');
  const houseInfoEl  = document.getElementById('house-info');
  const saveBtn      = document.getElementById('save-btn');
  const amountEl     = document.getElementById('amount');
  const paymentModeEl = document.getElementById('payment-mode');
  const paymentModeToggleEl = document.getElementById('payment-mode-toggle');

  const previewWrap     = document.getElementById('collect-preview'); // may be null after markup change
  const previewDue      = document.getElementById('preview-due');
  const previewPost     = document.getElementById('preview-post');

  let currentHouse = null;
  let _previewBase = null;
  let _previewTimer = null;
  let _activeBuilding = BUILDINGS[0];

  function renderBuildingTabs() {
    buildingTabsEl.innerHTML = BUILDINGS.map(b =>
      `<button type="button" class="building-tab${b === _activeBuilding ? ' active' : ''}" data-building="${b}">${b}</button>`
    ).join('');
    buildingTabsEl.querySelectorAll('.building-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        _activeBuilding = btn.dataset.building;
        renderBuildingTabs();
        renderHouseGrid();
      });
    });
  }

  function renderHouseGrid() {
    houseGridEl.innerHTML = HOUSES.filter(h => h.building === _activeBuilding).map(h => {
      const cached = HOUSE_CACHE[h.id];
      const active = cached ? (cached.IsActive === true || String(cached.IsActive).toUpperCase() === 'TRUE') : true;
      const tenant = cached?.TenantName || '';
      return `<button type="button" class="house-grid-btn${active ? '' : ' house-grid-btn--vacant'}" data-house="${h.id}" ${active ? '' : 'disabled'}>
        <span class="house-grid-num">${h.displayNum}</span>
        <span class="house-grid-tenant">${active ? (escapeHtml(tenant) || '—') : t('misc.vacant_label')}</span>
      </button>`;
    }).join('');
    houseGridEl.querySelectorAll('.house-grid-btn:not(:disabled)').forEach(btn => {
      btn.addEventListener('click', () => selectHouse(btn.dataset.house));
    });
  }

  renderBuildingTabs();
  renderHouseGrid();
  _refreshCollectHouseGrid = renderHouseGrid;

  function setPaymentMode(mode) {
    const normalized = String(mode || 'ONLINE').toUpperCase() === 'CASH' ? 'CASH' : 'ONLINE';
    paymentModeEl.value = normalized;
    if (!paymentModeToggleEl) return;
    paymentModeToggleEl.querySelectorAll('.mode-option').forEach(btn => {
      const isActive = btn.dataset.mode === normalized;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-checked', isActive ? 'true' : 'false');
    });
  }

  setPaymentMode('ONLINE');

  function renderPreview(base) {
    _previewBase = base || null;
    if (!base) {
      if (previewDue)  previewDue.textContent  = '—';
      if (previewPost) previewPost.textContent = '—';
      if (previewWrap) previewWrap.classList.add('hidden');
      return;
    }
    if (previewDue) previewDue.textContent = inr(base.currentBalance || 0);
    updatePostPayment();
    if (previewWrap) previewWrap.classList.remove('hidden');
    // update banner rent line once preview data is available
    const rentEl = houseInfoEl?.querySelector('.house-rent');
    if (rentEl) rentEl.textContent = `${t('collect.preview_rent')} ${inr(base.expectedRent || 0)}`;
  }

  function updatePostPayment() {
    if (!_previewBase) return;
    const amt = parseFloat(amountEl.value);
    const paid = isNaN(amt) || amt < 0 ? 0 : amt;
    const post = Math.max(0, (_previewBase.currentBalance || 0) - paid);
    previewPost.textContent = inr(post);
  }

  async function refreshPreview() {
    if (!currentHouse) return;
    const year = parseInt(yearSel.value, 10);
    const month = parseInt(monthSel.value, 10);
    if (!year || !month) return;
    try {
      const res = await apiGet({
        action: 'getCollectionPreview',
        houseId: currentHouse.HouseID,
        year,
        month,
      });
      if (res.error) {
        renderPreview(null);
        return;
      }
      renderPreview(res);
    } catch {
      renderPreview(null);
    }
  }

  function schedulePreviewRefresh() {
    clearTimeout(_previewTimer);
    _previewTimer = setTimeout(refreshPreview, 220);
  }

  // preview is included in the same response as house to avoid a second round-trip
  function showForm(house, preview) {
    currentHouse = house;
    const entry       = HOUSES.find(x => x.id === house.HouseID);
    const baseName    = entry ? `${entry.building} ${entry.displayNum}` : house.HouseLabel;
    const tenantName  = house.TenantName || '';
    const displayLine = tenantName ? `${baseName} - ${escapeHtml(tenantName)}` : baseName;
    houseInfoEl.innerHTML = `
      <p class="house-building">${escapeHtml(house.BuildingName)}</p>
      <p class="house-name">${displayLine}</p>
      <p class="house-rent"></p>
    `;
    scanSection.classList.add('hidden');
    formSection.classList.remove('hidden');
    amountEl.value = '';
    setPaymentMode('ONLINE');
    renderPreview(preview?.success !== false ? preview : null);
    amountEl.focus();
  }

  function resetToScan() {
    currentHouse = null;
    formSection.classList.add('hidden');
    scanSection.classList.remove('hidden');
    _previewBase = null;
    if (previewDue)  previewDue.textContent  = '—';
    if (previewPost) previewPost.textContent = '—';
    if (previewWrap) previewWrap.classList.add('hidden');
    const p = prevMonth();
    monthSel.value = p.month;
    yearSel.value  = p.year;
  }

  async function selectHouse(houseId) {
    if (!houseId) return;
    showLoader();
    try {
      const { month, year } = prevMonth();
      const res = await apiGet({ action: 'getHouseWithPreview', qr: houseId,
        year: parseInt(yearSel.value, 10) || year,
        month: parseInt(monthSel.value, 10) || month });
      if (res.error === 'VACANT') { showToast(t('msg.house_vacant'), 'warning'); return; }
      if (res.error) { showToast(t('msg.house_not_found'), 'error'); return; }
      showForm(res.house, res.preview);
    } catch {
      showToast(t('msg.network_error'), 'error');
    } finally {
      hideLoader();
    }
  }

  rescanBtn.addEventListener('click', resetToScan);
  amountEl.addEventListener('input', updatePostPayment);
  // Localized "Please fill out this field" message (browser default ignores the page's language)
  amountEl.addEventListener('invalid', () => amountEl.setCustomValidity(t('msg.fill_field')));
  amountEl.addEventListener('input', () => amountEl.setCustomValidity(''));
  monthSel.addEventListener('change', schedulePreviewRefresh);
  yearSel.addEventListener('change', schedulePreviewRefresh);
  if (paymentModeToggleEl) {
    paymentModeToggleEl.addEventListener('click', (e) => {
      const btn = e.target.closest('.mode-option');
      if (!btn) return;
      setPaymentMode(btn.dataset.mode);
    });
  }

  rentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentHouse) return;

    const amount    = parseFloat(document.getElementById('amount').value);
    const rentMonth = parseInt(monthSel.value);
    const rentYear  = parseInt(yearSel.value);
    const paymentMode = (paymentModeEl.value || 'ONLINE').toUpperCase();

    if (isNaN(amount) || amount <= 0) return showToast(t('msg.invalid_amount'), 'error');

    saveBtn.disabled    = true;
    saveBtn.textContent = t('collect.saving');

    try {
      // Pre-check: show details + confirmation if a record already exists
      const dupCheck = await apiGet({ action: 'getDashboard', year: rentYear, month: rentMonth, houseId: currentHouse.HouseID });
      if (dupCheck.records?.length > 0) {
        saveBtn.disabled    = false;
        saveBtn.textContent = t('collect.save');
        const proceed = await showDupModal(dupCheck.records);
        if (!proceed) return;
        saveBtn.disabled    = true;
        saveBtn.textContent = t('collect.saving');
      }

      const res = await apiPost({
        action: 'saveRent',
        houseId: currentHouse.HouseID,
        rentForYear: rentYear,
        rentForMonth: rentMonth,
        amount,
        paymentMode,
      });

      if (res.error) {
        showToast(res.error, 'error');
      } else {
        const entry = HOUSES.find(x => x.id === currentHouse.HouseID);
        const friendlyName = entry ? `${entry.building} ${entry.displayNum}` : currentHouse.HouseLabel;
        const msg = res.duplicate
          ? `${t('msg.duplicate_prefix')} ${t('month.' + rentMonth)} ${rentYear}`
          : `${t('msg.saved')} ${friendlyName} — ${inr(amount)}`;
        showToast(msg, res.duplicate ? 'warning' : 'success');
        resetToScan();
      }
    } catch {
      showToast(t('msg.network_error'), 'error');
    } finally {
      saveBtn.disabled    = false;
      saveBtn.textContent = t('collect.save');
    }
  });
}

// ─── DASHBOARD PAGE ───────────────────────────────────────────────────────────
async function initDashboardPage() {
  loadHouseCache(); // localStorage (instant) + background API refresh

  const filterYear  = document.getElementById('filter-year');
  const filterMonth = document.getElementById('filter-month');
  const filterHouse = document.getElementById('filter-house');
  const loadingEl   = document.getElementById('loading');
  const resultsEl   = document.getElementById('results');

  populateYearSelect(filterYear);
  populateMonthSelect(filterMonth);
  populateHouseSelect(filterHouse);

  filterMonth.value = prevMonth().month;

  async function load(forceRefresh = false) {
    loadingEl.classList.remove('hidden');
    resultsEl.innerHTML = '';

    const params = { action: 'getDashboard', year: filterYear.value };
    if (filterMonth.value) params.month = filterMonth.value;
    // BLDG: prefix = building-level filter, handled client-side; don't send houseId to server
    if (filterHouse.value && !filterHouse.value.startsWith('BLDG:')) params.houseId = filterHouse.value;
    if (forceRefresh) params.forceRefresh = '1';
    // balMonth: the balance summary's own required month, separate from the dashboard's
    // optional month filter (blank in the "All Months" view)
    params.balMonth = filterMonth.value || new Date().getMonth() + 1;

    // Combined into a single Apps Script round-trip (getDashboardData) instead of two —
    // each Apps Script Web App call costs its own redirect round-trip (~1-4s per HAR analysis)
    let balances = {};
    try {
      const dashRes = await apiGet({ ...params, action: 'getDashboardData' }, { forceRefresh });
      if (dashRes.error) { resultsEl.innerHTML = `<p class="msg-error">${dashRes.error}</p>`; return; }
      if (dashRes.balances) balances = dashRes.balances;
      render(dashRes.records, balances);
    } catch {
      resultsEl.innerHTML = `<p class="msg-error">${t('msg.net_check')}</p>`;
    } finally {
      loadingEl.classList.add('hidden');
    }
  }

  function render(records, balances) {
    balances = balances || {};
    _dashboardRecords  = records;
    _dashboardBalances = balances;
    resultsEl._render  = render;
    // Build a lookup: houseId → [payment, ...]
    const byHouse = {};
    records.forEach(r => (byHouse[r.HouseID] = byHouse[r.HouseID] || []).push(r));

    // Derive which building (and optionally which single house) to show
    const isBldgFilter  = filterHouse.value.startsWith('BLDG:');
    const targetBuilding = isBldgFilter
      ? filterHouse.value.slice(5)
      : (filterHouse.value ? HOUSES.find(h => h.id === filterHouse.value)?.building : null);

    const isMonthSelected = !!filterMonth.value;
    let grandTotal = 0;
    let cardsHtml  = '';

    BUILDINGS.forEach(building => {
      if (targetBuilding && building !== targetBuilding) return;

      let buildingTotal = 0;
      let rowsHtml = '';

      HOUSES.filter(h => h.building === building).forEach(h => {
        if (filterHouse.value && !isBldgFilter && h.id !== filterHouse.value) return;
        if (_activeWidgetIds && !_activeWidgetIds.has(h.id)) return;

        const payments = byHouse[h.id] || [];

        const bEntry      = balances[h.id] || {};
        const isFuture     = !!bEntry.futureOccupancy;
        const isVacant     = !balances[h.id] && !isFuture; // no active balance entry = no tenant
        const futureClass  = isFuture ? ' future-house' : '';
        const vacantClass  = isVacant ? ' vacant' : '';
        const today        = new Date();
        // Guard against stale boolean (pre-redeploy) — only use if object with expected fields
        const inc     = (bEntry.upcomingIncrement && typeof bEntry.upcomingIncrement === 'object')
          ? bEntry.upcomingIncrement : null;
        const notif   = (!inc && bEntry.recentIncrement && typeof bEntry.recentIncrement === 'object')
          ? bEntry.recentIncrement : null;
        const incIcon0 = inc
          ? ` <span class="tip" data-tip="${t('tip.increment')}">⬆️</span>`
          : (notif ? ` <span class="tip" data-tip="${t('tip.increment_notified')}">📩</span>` : '');
        const incLine  = inc
          ? `<span class="row-sub row-increment">${t('msg.increment_detail').replace('{rent}', inr(inc.newRent)).replace('{date}', inc.effectiveDate).replace('{inc}', inr(inc.increment))}</span>`
          : (notif
            ? `<span class="row-sub row-increment-notified">${t('msg.increment_notified').replace('{rent}', inr(notif.newRent)).replace('{date}', notif.effectiveDate)}</span>`
            : '');

        if (payments.length === 0) {
          const bal     = bEntry.balance || 0;
          const incIcon = bEntry.upcomingIncrement ? ` <span class="tip" data-tip="${t('tip.increment')}">⬆️</span>` : '';
          const dot     = isFuture ? '' : balDot(bal, bEntry.expectedRent || 0, today, isVacant);
          const subLine = isFuture
            ? `<span class="row-sub">${t('msg.prebooked')} ${bEntry.futureOccupancy}</span>`
            : (bal > 0 ? `<span class="row-sub row-balance">${t('msg.balance')} ${inr(bal)}</span>` : '');
          rowsHtml += `
            <a href="ledger.html?house=${h.id}" class="house-row unpaid${futureClass}${vacantClass}">
              <div class="row-info">
                <span class="row-label">${houseLabel(h)}${incIcon}${dot}</span>
                ${subLine}
                ${incLine}
              </div>
              <span class="row-amount no-pay row-chevron">›</span>
            </a>`;
        } else {
          const hasDup = isMonthSelected && payments.length > 1;

          if (hasDup) {
            const total    = payments.reduce((s, p) => s + p.AmountReceived, 0);
            buildingTotal += total;
            grandTotal    += total;
            const monthLabel  = `${t('month.' + payments[0].RentForMonth)} ${payments[0].RentForYear}`;
            const tenant      = HOUSE_CACHE[h.id]?.TenantName || '';
            const rowLabel    = tenant ? `${h.building} ${h.displayNum} - ${escapeHtml(tenant)}` : `${h.building} ${h.displayNum}`;
            const bell        = payments.some(p => notifFailed(p.NotificationSent)) ? ` <span class="tip" data-tip="${t('tip.notif_failed')}">🔕</span>` : '';
            const incIcon     = incIcon0;
            const histBal     = bEntry.balance || 0;
            const dot         = balDot(histBal, bEntry.expectedRent || 0, today, false);
            const balLine     = histBal > 0 ? `<span class="row-sub row-balance">${t('msg.balance')} ${inr(histBal)}</span>` : '';
            const splitLines  = payments.map(p =>
              `<div class="dup-split">
                <span class="split-amount">${inr(p.AmountReceived)}</span>
                <span class="split-date">${formatDate(p.CollectedDate)}</span>
              </div>`
            ).join('');
            rowsHtml += `
              <a href="ledger.html?house=${h.id}" class="house-row paid dup-entry${futureClass}">
                <div class="row-info">
                  <span class="row-label">${rowLabel} <span class="tip" data-tip="${t('tip.duplicate')}">⚠️</span>${bell}${incIcon}${dot}</span>
                  <span class="row-sub">${monthLabel} · ${payments.length} ${t('msg.payments')}</span>
                  ${balLine}
                  ${incLine}
                  <div class="dup-splits">${splitLines}</div>
                </div>
                <span class="row-amount">${inr(total)} <span class="row-chevron">›</span></span>
              </a>`;
          } else {
            payments.forEach(p => {
              buildingTotal += p.AmountReceived;
              grandTotal    += p.AmountReceived;
              const tenant2   = HOUSE_CACHE[h.id]?.TenantName || '';
              const rowLabel2 = tenant2 ? `${h.building} ${h.displayNum} - ${escapeHtml(tenant2)}` : `${h.building} ${h.displayNum}`;
              const bell2     = notifFailed(p.NotificationSent) ? ` <span class="tip" data-tip="${t('tip.notif_failed')}">🔕</span>` : '';
              const incIcon2  = incIcon0;
              const histBal2  = bEntry.balance || 0;
              const dot2      = balDot(histBal2, bEntry.expectedRent || 0, today, false);
              const balLine2  = histBal2 > 0 ? `<span class="row-sub row-balance">${t('msg.balance')} ${inr(histBal2)}</span>` : '';
              rowsHtml += `
              <a href="ledger.html?house=${h.id}" class="house-row paid${futureClass}">
                <div class="row-info">
                  <span class="row-label">${rowLabel2}${bell2}${incIcon2}${dot2}</span>
                  <span class="row-sub">${t('month.' + p.RentForMonth)} ${p.RentForYear}</span>
                  <span class="row-date">${formatDate(p.CollectedDate)}</span>
                  ${balLine2}
                  ${incLine}
                </div>
                <span class="row-amount">${inr(p.AmountReceived)} <span class="row-chevron">›</span></span>
              </a>`;
            });
          }
        }
      });

      if (!rowsHtml) return;

      cardsHtml += `
        <div class="building-card">
          <div class="building-head">
            <span>${building}</span>
            <span class="building-total">${inr(buildingTotal)}</span>
          </div>
          <div class="building-rows">${rowsHtml}</div>
        </div>`;
    });

    if (!cardsHtml) {
      resultsEl.innerHTML = `<p class="msg-empty">${t('msg.no_records')}</p>`;
      document.getElementById('retry-btn')?.classList.add('hidden');
      return;
    }

    // Show retry button when any visible record has a retryable failed notification
    const hasRetryable = records.some(r => {
      const s = String(r.NotificationSent || '').toUpperCase();
      return s === 'DISCONNECTED' || s === 'FAILED';
    });
    document.getElementById('retry-btn')?.classList.toggle('hidden', !hasRetryable);

    const periodLabel = filterMonth.value
      ? `${t('month.' + filterMonth.value)} ${filterYear.value}`
      : `${t('msg.all_of')} ${filterYear.value}`;

    renderPriorityStrip(balances, records);

    resultsEl.innerHTML = `
      <div class="summary-bar">
        <div>
          <div class="summary-label">${t('dashboard.total')}</div>
          <div class="summary-period">${periodLabel}</div>
        </div>
        <div class="summary-amount">${inr(grandTotal)}</div>
      </div>
      ${cardsHtml}`;
  }

  let _activeWidgetIds   = null;
  let _activeWidgetType  = null; // persists across re-renders to restore active class

  // Debounce: wait 350ms after last change before firing API call
  let _loadTimer = null;
  function debouncedLoad() {
    clearTimeout(_loadTimer);
    // manual filter change clears any active widget selection
    _activeWidgetIds  = null;
    _activeWidgetType = null;
    document.querySelectorAll('.priority-pill').forEach(p => p.classList.remove('active'));
    _loadTimer = setTimeout(load, 350);
  }
  [filterYear, filterMonth, filterHouse].forEach(el => el.addEventListener('change', debouncedLoad));

  // builds the houseId sets used by the priority strip tap handlers
  function _houseIdsForWidget(type, balances, records) {
    const today = new Date();
    if (type === 'overdue') {
      return Object.entries(balances)
        .filter(([, b]) => !b.futureOccupancy && b.expectedRent > 0 && today.getDate() > 10
          && b.balance >= 2 * b.expectedRent)
        .map(([id]) => id);
    }
    if (type === 'increment') {
      return Object.entries(balances)
        .filter(([, b]) => (b.upcomingIncrement && typeof b.upcomingIncrement === 'object')
                        || (b.recentIncrement  && typeof b.recentIncrement  === 'object'))
        .map(([id]) => id);
    }
    if (type === 'failed') {
      const ids = new Set();
      records.forEach(r => {
        const s = String(r.NotificationSent || '').toUpperCase();
        if (s === 'FAILED' || s === 'DISCONNECTED') ids.add(r.HouseID);
      });
      return [...ids];
    }
    return [];
  }

  function renderPriorityStrip(balances, records) {
    const stripEl = document.getElementById('priority-strip');
    if (!stripEl) return;

    const widgets = [
      { type: 'overdue',    icon: '🔴', labelKey: 'dashboard.widget_overdue' },
      { type: 'increment',  icon: '⬆️', labelKey: 'dashboard.widget_increment' },
      { type: 'failed',     icon: '🔕', labelKey: 'dashboard.widget_failed' },
    ];

    const pills = widgets.map(w => {
      const ids = _houseIdsForWidget(w.type, balances, records);
      return { ...w, ids, count: ids.length };
    }).filter(w => w.count > 0);

    if (pills.length === 0) { stripEl.innerHTML = ''; return; }

    stripEl.innerHTML = `<div class="priority-strip">${
      pills.map(w =>
        `<button class="priority-pill priority-pill--${w.type}${_activeWidgetType === w.type ? ' active' : ''}" data-widget="${w.type}">
          <span class="pp-count">${w.count} <span class="pp-icon">${w.icon}</span></span>
          <span class="pp-label">${t(w.labelKey)}</span>
        </button>`
      ).join('')
    }</div>`;

    // tap: filter rows to widget houses; tap again to deselect and show all
    stripEl.querySelectorAll('.priority-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        const type = btn.dataset.widget;
        const isActive = _activeWidgetType === type;
        if (isActive) {
          _activeWidgetIds  = null;
          _activeWidgetType = null;
          filterHouse.value = '';
        } else {
          const ids = _houseIdsForWidget(type, _dashboardBalances, _dashboardRecords);
          if (!ids.length) return;
          _activeWidgetIds  = new Set(ids);
          _activeWidgetType = type;
          filterHouse.value = ids.length === 1 ? ids[0] : '';
        }
        load();
      });
    });
  }

  const retryBtn    = document.getElementById('retry-btn');
  const validateBtn = document.getElementById('validate-btn');
  const refreshBtn  = document.getElementById('refresh-btn');

  // Set tooltips in current language (static buttons can't use data-i18n pattern)
  if (validateBtn) validateBtn.dataset.tip = t('tip.validate');
  if (refreshBtn)  refreshBtn.dataset.tip  = t('tip.refresh');

  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      const p = prevMonth();
      filterYear.value  = p.year;
      filterMonth.value = p.month;
      filterHouse.value = '';
      refreshBtn.disabled    = true;
      refreshBtn.textContent = '⏳';
      load(true).finally(() => {
        refreshBtn.disabled    = false;
        refreshBtn.textContent = '🔄';
      });
    });
  }

  if (validateBtn) {
    validateBtn.addEventListener('click', async () => {
      validateBtn.disabled  = true;
      validateBtn.textContent = '⏳';
      try {
        const res = await apiGet({ action: 'validateMasters' });
        showValidateResult(res);
      } catch {
        showToast(t('msg.network_error'), 'error');
      } finally {
        validateBtn.disabled   = false;
        validateBtn.textContent = '📋';
      }
    });
  }

  if (retryBtn) {
    retryBtn.addEventListener('click', async () => {
      retryBtn.disabled = true;
      retryBtn.textContent = '…';
      try {
        const res = await apiGet({ action: 'retryDisconnected' });
        showToast(`${res.succeeded}/${res.retried} ${t('msg.notif_retried')}`, res.succeeded > 0 ? 'success' : 'warning');
        load();
      } catch {
        showToast(t('msg.network_error'), 'error');
      } finally {
        retryBtn.disabled    = false;
        retryBtn.textContent = t('dashboard.retry_btn');
      }
    });
  }

  load();
}

// ─── REPORT PAGE ─────────────────────────────────────────────────────────────
async function initReportPage() {
  applyTranslations();

  let { month, year } = prevMonth();
  const now = new Date();
  const maxYear = now.getFullYear(), maxMonth = now.getMonth() + 1;

  const labelEl   = document.getElementById('report-month-label');
  const prevBtn   = document.getElementById('report-prev');
  const nextBtn   = document.getElementById('report-next');
  const contentEl = document.getElementById('report-content');
  loadHouseCache();

  const REPORT_ORDER = ['Spatika', 'Manikya', 'Jalanidhi', 'Vaidurya', 'Aparanji'];

  function updateNav() {
    if (labelEl) labelEl.textContent = `${t('month.' + month)} ${year}`;
    // disable next when already at current month
    if (nextBtn) nextBtn.disabled = (year === maxYear && month === maxMonth);
  }

  async function loadReport() {
    updateNav();
    contentEl.innerHTML = '';
    showLoader();
    try {
      // Combined into a single Apps Script round-trip instead of two (getDashboard + getBalanceSummary)
      const dashRes = await apiGet({ action: 'getDashboardData', year, month, balMonth: month });

      if (dashRes.error) { contentEl.innerHTML = `<p class="msg-error">${dashRes.error}</p>`; return; }

      const balances = dashRes.balances || {};
      const byHouse  = {};
      (dashRes.records || []).forEach(r => (byHouse[r.HouseID] = byHouse[r.HouseID] || []).push(r));

      const hdr = `<tr>
        <th>${t('report.col_house')}</th>
        <th>${t('report.col_rent')}</th>
        <th>${t('report.col_paid')}</th>
        <th>${t('report.col_balance')}</th>
        <th>${t('report.col_increment')}</th>
      </tr>`;

      let html = '';
      REPORT_ORDER.forEach(building => {
        const houses = HOUSES.filter(h => h.building === building);
        const rows   = houses.map(h => {
          const bEntry   = balances[h.id] || {};
          const isVacant = !balances[h.id] && !bEntry.futureOccupancy;
          const label    = `${h.displayNum}`;

          if (isVacant) {
            return `<tr class="report-row-vacant">
              <td>${label} <span class="report-vacant-tag">${t('report.vacant')}</span></td>
              <td>—</td><td>—</td><td>—</td><td>—</td></tr>`;
          }

          const paid      = (byHouse[h.id] || []).filter(p =>
            parseInt(p.RentForMonth) === month && parseInt(p.RentForYear) === year);
          const totalPaid = paid.reduce((s, p) => s + parseFloat(p.AmountReceived || 0), 0);

          const bal      = bEntry.balance || 0;
          const thisRent = bEntry.expectedRent || 0;
          const prevBal  = Math.max(0, bal + totalPaid - thisRent);
          const rentCell = thisRent
            ? (prevBal > 0
              ? `<td class="report-cell-rent-detail">
                   <span class="report-rent-prev">${inr(prevBal)}</span>
                   <span class="report-rent-add">+ ${inr(thisRent)}</span>
                   <span class="report-rent-total">= ${inr(prevBal + thisRent)}</span>
                 </td>`
              : `<td>${inr(thisRent)}</td>`)
            : `<td class="report-cell-nil">—</td>`;

          const balCell    = bal > 0
            ? `<td class="report-cell-balance">${inr(bal)}</td>`
            : `<td class="report-cell-nil">—</td>`;

          const isPartial  = totalPaid > 0 && totalPaid < thisRent;
          const paidClass  = isPartial ? 'report-cell-partial' : (totalPaid > 0 ? 'report-cell-paid' : 'report-cell-nil');
          const sortedPaid = [...paid].sort((a, b) => new Date(a.CollectedDate) - new Date(b.CollectedDate));
          const paidCell   = sortedPaid.length
            ? `<td class="${paidClass}">${sortedPaid.map(p =>
                `${inr(p.AmountReceived)}<br><span class="report-paid-date">${_fmtDateOnly(p.CollectedDate)}</span>`
              ).join('<br>')}</td>`
            : `<td class="report-cell-nil">—</td>`;

          const inc     = (bEntry.upcomingIncrement && typeof bEntry.upcomingIncrement === 'object')
            ? bEntry.upcomingIncrement : null;
          const incCell = inc
            ? `<td class="report-cell-increment">⬆️ ${inc.effectiveDate}</td>`
            : (bEntry.nextIncrementDate
              ? `<td class="report-cell-inc-future">${bEntry.nextIncrementDate}</td>`
              : `<td class="report-cell-nil">—</td>`);

          return `<tr>${[`<td>${label}</td>`, rentCell, paidCell, balCell, incCell].join('')}</tr>`;
        }).join('');

        html += `
          <div class="report-section">
            <div class="report-building-title">${building.toUpperCase()}</div>
            <div class="report-table-wrap">
              <table class="report-table">
                <thead>${hdr}</thead>
                <tbody>${rows}</tbody>
              </table>
            </div>
          </div>`;
      });

      contentEl.innerHTML = html;
    } catch {
      contentEl.innerHTML = `<p class="msg-error">${t('msg.net_check')}</p>`;
    } finally {
      hideLoader();
    }
  }

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (month === 1) { month = 12; year--; } else { month--; }
      loadReport();
    });
  }
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      if (year === maxYear && month === maxMonth) return;
      if (month === 12) { month = 1; year++; } else { month++; }
      loadReport();
    });
  }

  loadReport();
}

function _fmtDateOnly(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  return `${String(d.getDate()).padStart(2,'0')}-${_MONTHS_SHORT[d.getMonth()]}-${d.getFullYear()}`;
}

// ─── LEDGER PAGE ─────────────────────────────────────────────────────────────
async function initLedgerPage() {
  loadHouseCache();
  applyTranslations();

  const params   = new URLSearchParams(location.search);
  const houseId  = params.get('house');
  const selectorEl = document.getElementById('ledger-selector');
  const loadingEl  = document.getElementById('ledger-loading');
  const contentEl  = document.getElementById('ledger-content');
  const backBtn    = document.getElementById('ledger-back-btn');
  // Only true when the page was opened without a house (e.g. via More sheet) and the user
  // then picked one from the on-page selector — in that case "back" should return to the
  // selector, not exit the page, since there's no meaningful prior page in history for it
  const arrivedViaSelector = !houseId;

  async function loadLedger(id) {
    selectorEl.classList.add('hidden');
    loadingEl.classList.remove('hidden');
    contentEl.innerHTML = '';
    try {
      const res = await apiGet({ action: 'getLedger', houseId: id });
      if (res.error) { contentEl.innerHTML = `<p class="msg-error">${res.error}</p>`; return; }
      renderLedger(res, contentEl);
    } catch {
      contentEl.innerHTML = `<p class="msg-error">${t('msg.net_check')}</p>`;
    } finally {
      loadingEl.classList.add('hidden');
    }
  }

  if (houseId) {
    await loadLedger(houseId);
  } else {
    selectorEl.classList.remove('hidden');
    const sel = document.getElementById('ledger-house-select');
    populateHouseSelect(sel);
    document.getElementById('ledger-view-btn').addEventListener('click', () => {
      if (!sel.value) return showToast(t('msg.select_house'), 'warning');
      history.replaceState(null, '', `ledger.html?house=${encodeURIComponent(sel.value)}`);
      loadLedger(sel.value);
    });
  }

  if (backBtn && arrivedViaSelector) {
    backBtn.addEventListener('click', (e) => {
      e.preventDefault();
      history.replaceState(null, '', 'ledger.html');
      contentEl.innerHTML = '';
      selectorEl.classList.remove('hidden');
    });
  }
}

function renderLedger(data, contentEl) {
  const { house, rows, incrementHistory, totalPaid, outstanding } = data;
  const tenantName = house.TenantName || '';
  const houseEntry = HOUSES.find(h => h.id === house.HouseID);
  const displayName = houseEntry
    ? `${houseEntry.building} ${houseEntry.displayNum}${tenantName ? ' · ' + escapeHtml(tenantName) : ''}`
    : (house.HouseLabel || house.HouseID);
  const since = house.OccupancyDate ? _fmtDateOnly(house.OccupancyDate) : '';

  // rows newest first for display
  const displayRows = [...rows].reverse();

  const rowsHtml = displayRows.map(r => {
    const isPaid    = r.paid >= r.expected && r.expected > 0;
    const isPartial = r.paid > 0 && r.paid < r.expected;
    const statusCls = isPaid ? 'ledger-row--paid' : (isPartial ? 'ledger-row--partial' : (r.expected > 0 ? 'ledger-row--unpaid' : ''));
    const paidCell  = r.payments.length
      ? r.payments.map(p =>
          `<span>${inr(p.amount)}</span>${p.date ? `<span class="ledger-pay-date">${_fmtDateOnly(p.date)}${p.mode ? ' · ' + p.mode : ''}</span>` : ''}`
        ).join('')
      : `<span class="ledger-nil">—</span>`;
    const balCell = r.runningBalance > 0
      ? `<span class="ledger-bal-owed">${inr(r.runningBalance)}</span>`
      : `<span class="ledger-nil">—</span>`;
    const chargesLine = (r.charges && r.charges.length)
      ? `<span class="ledger-charges">${r.charges.map(c => `+ ${inr(c.amount)} · ${escapeHtml(c.description)}`).join('<br>')}</span>`
      : '';
    return `<tr class="${statusCls}">
      <td class="ledger-month-cell">${t('month.' + r.month)}<br><span class="ledger-year">${r.year}</span>${chargesLine}</td>
      <td>${r.expected > 0 ? inr(r.expected) : '<span class="ledger-nil">—</span>'}</td>
      <td>${paidCell}</td>
      <td>${balCell}</td>
    </tr>`;
  }).join('');

  const incHtml = incrementHistory.length ? `
    <div class="ledger-section">
      <p class="ledger-section-title" data-i18n="ledger.inc_history">${t('ledger.inc_history')}</p>
      <div class="ledger-inc-list">${
        incrementHistory.map(h => `
          <div class="ledger-inc-row">
            <span class="ledger-inc-date">${h.effectiveDate}</span>
            <span class="ledger-inc-arrow">${inr(h.previousRent)} → ${inr(h.newRent)}</span>
          </div>`).join('')
      }</div>
    </div>` : '';

  contentEl.innerHTML = `
    <div class="ledger-header-card house-card">
      <p class="house-building">${escapeHtml(house.BuildingName) || ''}</p>
      <p class="house-name">${escapeHtml(displayName)}</p>
      ${since ? `<p class="house-rent">${t('ledger.since')} ${since}</p>` : ''}
    </div>

    <div class="ledger-totals card">
      <div class="ledger-total-item">
        <span data-i18n="ledger.total_paid">${t('ledger.total_paid')}</span>
        <strong class="ledger-total-paid">${inr(totalPaid)}</strong>
      </div>
      <div class="ledger-total-divider"></div>
      <div class="ledger-total-item">
        <span data-i18n="ledger.outstanding">${t('ledger.outstanding')}</span>
        <strong class="${outstanding > 0 ? 'ledger-total-owed' : 'ledger-total-clear'}">${outstanding > 0 ? inr(outstanding) : '✓ Clear'}</strong>
      </div>
    </div>

    ${incHtml}

    <div class="ledger-section">
      <p class="ledger-section-title">${t('ledger.payment_history')}</p>
      <div class="ledger-table-wrap">
        <table class="ledger-table">
          <thead><tr>
            <th>${t('ledger.col_month')}</th>
            <th>${t('ledger.col_expected')}</th>
            <th>${t('ledger.col_paid')}</th>
            <th>${t('ledger.col_balance')}</th>
          </tr></thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
    </div>`;
}

// ─── MESSENGER PAGE ────────────────────────────────────────────────────
async function initMessengerPage() {
  loadHouseCache();
  applyTranslations();

  const houseSel    = document.getElementById('msg-house-select');
  const p1Cb         = document.getElementById('msg-phone1-cb');
  const p2Cb         = document.getElementById('msg-phone2-cb');
  const p1Label      = document.getElementById('msg-phone1-label');
  const p2Label      = document.getElementById('msg-phone2-label');
  const textEl       = document.getElementById('msg-text');
  const sendBtn      = document.getElementById('msg-send-btn');
  const clearBtn     = document.getElementById('msg-clear-btn');
  const logListEl    = document.getElementById('msg-log-list');
  const showMoreBtn  = document.getElementById('msg-show-more');

  populateHouseSelect(houseSel);

  let currentHouse = null;
  let logOffset    = 0;
  const LOG_PAGE_SIZE = 10;

  function resetPhonesUI() {
    p1Cb.checked = false; p1Cb.disabled = true;
    p2Cb.checked = false; p2Cb.disabled = true;
    p1Label.textContent = '—';
    p2Label.textContent = '—';
  }

  houseSel.addEventListener('change', async () => {
    if (!houseSel.value) {
      currentHouse = null;
      resetPhonesUI();
      loadLogs(true, '');
      return;
    }
    showLoader();
    try {
      const res = await apiGet({ action: 'getHouse', qr: houseSel.value });
      if (res.error) { showToast(t('msg.house_not_found'), 'error'); return; }
      currentHouse = res.house;
      const has1 = !!currentHouse.Phone1, has2 = !!currentHouse.Phone2;
      p1Cb.checked = has1; p1Cb.disabled = !has1;
      p2Cb.checked = has2; p2Cb.disabled = !has2;
      p1Label.textContent = has1 ? currentHouse.Phone1 : '—';
      p2Label.textContent = has2 ? currentHouse.Phone2 : '—';
      loadLogs(true, currentHouse.HouseID);
    } catch {
      showToast(t('msg.network_error'), 'error');
    } finally {
      hideLoader();
    }
  });

  sendBtn.addEventListener('click', async () => {
    if (!currentHouse) return showToast(t('msg.select_house'), 'warning');
    const message = textEl.value.trim();
    if (!message) return showToast(t('messenger.empty_message'), 'warning');
    if (!p1Cb.checked && !p2Cb.checked) return showToast(t('messenger.no_recipient'), 'warning');

    sendBtn.disabled = true;
    sendBtn.textContent = t('messenger.sending');
    try {
      const res = await apiPost({
        action: 'sendCustomMessage',
        houseId: currentHouse.HouseID,
        sendToPhone1: p1Cb.checked,
        sendToPhone2: p2Cb.checked,
        message,
      });
      if (res.error) {
        showToast(res.error, 'error');
      } else {
        showToast(t('messenger.sent_success'), 'success');
        textEl.value = '';
        loadLogs(true, currentHouse.HouseID);
      }
    } catch {
      showToast(t('msg.network_error'), 'error');
    } finally {
      sendBtn.disabled = false;
      sendBtn.textContent = t('messenger.send_btn');
    }
  });

  clearBtn.addEventListener('click', () => {
    houseSel.value = '';
    currentHouse = null;
    resetPhonesUI();
    textEl.value = '';
    loadLogs(true, '');
  });

  const ACTION_LABEL_KEYS = {
    RENT_SAVED:        'messenger.action_rent_saved',
    RENT_REMINDER:     'messenger.action_rent_reminder',
    INCREMENT_NOTICE:  'messenger.action_increment_notice',
    CUSTOM_MSG:        'messenger.action_custom_msg',
    MISC_CHARGE:       'messenger.action_misc_charge',
  };

  function renderLogRow(row) {
    const actionLabel = t(ACTION_LABEL_KEYS[row.action] || row.action);
    return `<div class="msg-log-row">
      <div class="msg-log-top">
        <span class="msg-log-action">${actionLabel}</span>
        <span class="msg-log-status msg-log-status--${String(row.status).toLowerCase()}">${row.status}</span>
      </div>
      <div class="msg-log-details">${escapeHtml(row.details)}</div>
      <div class="msg-log-time">${formatDate(row.timestamp)}</div>
    </div>`;
  }

  let logHouseFilter = '';

  async function loadLogs(reset, houseIdFilter) {
    if (houseIdFilter !== undefined) logHouseFilter = houseIdFilter;
    if (reset) { logOffset = 0; logListEl.innerHTML = ''; }
    try {
      const params = { action: 'getMessageLogs', offset: logOffset, limit: LOG_PAGE_SIZE };
      if (logHouseFilter) params.houseId = logHouseFilter;
      const res = await apiGet(params);
      if (res.error) return;
      logListEl.insertAdjacentHTML('beforeend', res.logs.map(renderLogRow).join(''));
      logOffset += res.logs.length;
      showMoreBtn.classList.toggle('hidden', !res.hasMore);
    } catch {
      showToast(t('msg.network_error'), 'error');
    }
  }

  showMoreBtn.addEventListener('click', () => loadLogs(false));

  resetPhonesUI();
  loadLogs(true, '');
}

// ─── MISC CHARGES PAGE ────────────────────────────────────────────────
async function initMiscChargesPage() {
  loadHouseCache();
  applyTranslations();

  const houseListEl  = document.getElementById('misc-house-list');
  const selectAllCb  = document.getElementById('misc-select-all-cb');
  const descEl       = document.getElementById('misc-description');
  const amountEl     = document.getElementById('misc-amount');
  const monthSel     = document.getElementById('misc-month');
  const yearSel      = document.getElementById('misc-year');
  const notifyCb     = document.getElementById('misc-notify-cb');
  const addBtn       = document.getElementById('misc-add-btn');
  const clearBtn     = document.getElementById('misc-clear-btn');
  const logListEl    = document.getElementById('misc-log-list');
  const showMoreBtn  = document.getElementById('misc-show-more');

  populateMonthSelect(monthSel);
  populateYearSelect(yearSel);
  const { month, year } = prevMonth();
  monthSel.value = month;
  yearSel.value  = year;

  // Render one checkbox per house, grouped by building; vacant houses are disabled (can't be charged)
  function renderMiscHouseList() {
    const checkedIds = new Set(
      Array.from(houseListEl.querySelectorAll('.misc-house-cb:checked')).map(cb => cb.value)
    );
    houseListEl.innerHTML = '';
    BUILDINGS.forEach(building => {
      const group = document.createElement('div');
      group.className = 'msg-phones-wrap';
      const groupLabel = document.createElement('label');
      groupLabel.textContent = building;
      group.appendChild(groupLabel);
      HOUSES.filter(h => h.building === building).forEach(h => {
        const cached = HOUSE_CACHE[h.id];
        const active = cached ? (cached.IsActive === true || String(cached.IsActive).toUpperCase() === 'TRUE') : true;
        const row = document.createElement('label');
        row.className = 'msg-phone-row' + (active ? '' : ' msg-phone-row--empty');
        row.innerHTML = `<input type="checkbox" class="misc-house-cb" value="${h.id}" ${active ? '' : 'disabled'} ${checkedIds.has(h.id) ? 'checked' : ''}>
          <span class="msg-phone-static">${houseLabel(h)}${active ? '' : ` \u2014 ${t('misc.vacant_label')}`}</span>`;
        group.appendChild(row);
      });
      houseListEl.appendChild(group);
    });
  }

  renderMiscHouseList();
  _refreshMiscHouseList = renderMiscHouseList;

  function getSelectedHouseIds() {
    return Array.from(houseListEl.querySelectorAll('.misc-house-cb:checked')).map(cb => cb.value);
  }

  selectAllCb.addEventListener('change', () => {
    houseListEl.querySelectorAll('.misc-house-cb:not(:disabled)').forEach(cb => { cb.checked = selectAllCb.checked; });
  });

  function resetForm() {
    houseListEl.querySelectorAll('.misc-house-cb').forEach(cb => { cb.checked = false; });
    selectAllCb.checked = false;
    descEl.value  = '';
    amountEl.value = '';
    notifyCb.checked = true;
    const p = prevMonth();
    monthSel.value = p.month;
    yearSel.value  = p.year;
  }

  clearBtn.addEventListener('click', resetForm);

  addBtn.addEventListener('click', async () => {
    const houseIds = getSelectedHouseIds();
    if (houseIds.length === 0) return showToast(t('misc.no_house'), 'warning');
    const description = descEl.value.trim();
    if (!description) return showToast(t('misc.no_description'), 'warning');
    const amount = parseFloat(amountEl.value);
    if (isNaN(amount) || amount <= 0) return showToast(t('misc.invalid_amount'), 'error');

    addBtn.disabled = true;
    addBtn.textContent = t('misc.adding');
    try {
      const res = await apiPost({
        action: 'addMiscCharge',
        houseIds,
        description,
        amount,
        forYear: parseInt(yearSel.value, 10),
        forMonth: parseInt(monthSel.value, 10),
        notify: notifyCb.checked,
      });
      if (res.error) {
        showToast(res.error, 'error');
      } else {
        showToast(t('misc.added_success'), 'success');
        resetForm();
        loadLogs(true);
      }
    } catch {
      showToast(t('msg.network_error'), 'error');
    } finally {
      addBtn.disabled = false;
      addBtn.textContent = t('misc.add_btn');
    }
  });

  function renderLogRow(row) {
    const houseEntry = HOUSES.find(h => h.id === row.houseId);
    const houseName   = houseEntry ? houseLabel(houseEntry) : row.houseId;
    return `<div class="msg-log-row">
      <div class="msg-log-top">
        <span class="msg-log-action">${houseName}</span>
        <span class="msg-log-status msg-log-status--${String(row.status).toLowerCase()}">${row.status}</span>
      </div>
      <div class="msg-log-details">${escapeHtml(row.description)} · ${inr(row.amount)} · ${t('month.' + row.forMonth)} ${row.forYear}</div>
      <div class="msg-log-time">${formatDate(row.createdAt)}</div>
    </div>`;
  }

  let logOffset = 0;
  const LOG_PAGE_SIZE = 10;

  async function loadLogs(reset) {
    if (reset) { logOffset = 0; logListEl.innerHTML = ''; }
    try {
      const res = await apiGet({ action: 'getMiscCharges', offset: logOffset, limit: LOG_PAGE_SIZE });
      if (res.error) return;
      logListEl.insertAdjacentHTML('beforeend', res.charges.map(renderLogRow).join(''));
      logOffset += res.charges.length;
      showMoreBtn.classList.toggle('hidden', !res.hasMore);
    } catch {
      showToast(t('msg.network_error'), 'error');
    }
  }

  showMoreBtn.addEventListener('click', () => loadLogs(false));

  loadLogs(true);
}

// ─── DOOR LEDGER PAGE (public, unauthenticated) ──────────────────────────────
async function initDoorLedgerPage() {
  applyTranslations();
  const contentEl = document.getElementById('door-content');
  const params = new URLSearchParams(location.search);
  const token = params.get('t') || '';

  if (!token) {
    contentEl.innerHTML = `<p class="msg-error">${t('door.invalid_link')}</p>`;
    return;
  }

  try {
    // param name 't' (not 'token') — apiGet() always overwrites 'token' with the session auth token
    showLoader();
    const res = await apiGet({ action: 'getDoorLedger', t: token });
    if (res.error) {
      contentEl.innerHTML = `<p class="msg-error">${t('door.invalid_link')}</p>`;
      return;
    }
    renderDoorLedger(res, contentEl);
  } catch {
    contentEl.innerHTML = `<p class="msg-error">${t('msg.net_check')}</p>`;
  } finally {
    hideLoader();
  }
}

function renderDoorLedger(data, contentEl) {
  const { house, rentPerMonth, outstanding, rows } = data;
  const displayName = house.DisplayName || house.HouseLabel || '';
  const since = house.OccupancyDate ? _fmtDateOnly(house.OccupancyDate) : '';

  const displayRows = [...rows].reverse();
  const rowsHtml = displayRows.map(r => {
    const isPaid    = r.paid >= r.expected && r.expected > 0;
    const isPartial = r.paid > 0 && r.paid < r.expected;
    const statusCls = isPaid ? 'ledger-row--paid' : (isPartial ? 'ledger-row--partial' : (r.expected > 0 ? 'ledger-row--unpaid' : ''));
    const paidCell  = r.payments.length
      ? r.payments.map(p => `<span>${inr(p.amount)}</span>${p.date ? `<span class="ledger-pay-date">${_fmtDateOnly(p.date)}</span>` : ''}`).join('')
      : `<span class="ledger-nil">—</span>`;
    const chargesLine = (r.charges && r.charges.length)
      ? `<span class="ledger-charges">${r.charges.map(c => `+ ${inr(c.amount)} · ${escapeHtml(c.description)}`).join('<br>')}</span>`
      : '';
    return `<tr class="${statusCls}">
      <td class="ledger-month-cell">${t('month.' + r.month)}<br><span class="ledger-year">${r.year}</span>${chargesLine}</td>
      <td>${r.expected > 0 ? inr(r.expected) : '<span class="ledger-nil">—</span>'}</td>
      <td>${paidCell}</td>
    </tr>`;
  }).join('');

  contentEl.innerHTML = `
    <div class="ledger-header-card house-card">
      <p class="house-building">${escapeHtml(house.BuildingName) || ''}</p>
      <p class="house-name">${escapeHtml(displayName)}${house.TenantName ? ' · ' + escapeHtml(house.TenantName) : ''}</p>
      ${since ? `<p class="house-rent">${t('ledger.since')} ${since}</p>` : ''}
    </div>

    <div class="ledger-totals card">
      <div class="ledger-total-item">
        <span>${t('door.rent_per_month')}</span>
        <strong class="ledger-total-paid">${inr(rentPerMonth)}</strong>
      </div>
      <div class="ledger-total-divider"></div>
      <div class="ledger-total-item">
        <span>${t('ledger.outstanding')}</span>
        <strong class="${outstanding > 0 ? 'ledger-total-owed' : 'ledger-total-clear'}">${outstanding > 0 ? inr(outstanding) : '✓ Clear'}</strong>
      </div>
    </div>

    <div class="ledger-section">
      <p class="ledger-section-title">${t('door.payment_history')}</p>
      <div class="ledger-table-wrap">
        <table class="ledger-table">
          <thead><tr>
            <th>${t('ledger.col_month')}</th>
            <th>${t('ledger.col_expected')}</th>
            <th>${t('ledger.col_paid')}</th>
          </tr></thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
    </div>`;
}

// ─── LOGIN PAGE ──────────────────────────────────────────────────────────────
function initLoginPage() {
  applyTranslations();

  const phoneStep   = document.getElementById('login-phone-step');
  const otpStep      = document.getElementById('login-otp-step');
  const phoneInput   = document.getElementById('login-phone');
  const otpInput     = document.getElementById('login-otp');
  const rememberCb   = document.getElementById('login-remember');
  const sendBtn      = document.getElementById('login-send-btn');
  const verifyBtn    = document.getElementById('login-verify-btn');
  const changeNumBtn = document.getElementById('login-change-number');
  const channelNote  = document.getElementById('login-channel-note');

  let currentPhone = '';

  // Pre-fill last-used phone number — pure convenience, unrelated to session/token storage
  const LAST_PHONE_KEY = 'rms_last_phone';
  const savedPhone = localStorage.getItem(LAST_PHONE_KEY);
  if (savedPhone) phoneInput.value = savedPhone;

  sendBtn.addEventListener('click', async () => {
    // Strip any accidental 91/+91/spaces the user might paste, keep just the local 10-digit part
    const localNumber = phoneInput.value.replace(/[\s\-\+]/g, '').replace(/^91/, '').replace(/^0+/, '');
    if (!localNumber) return showToast(t('auth.enter_phone'), 'warning');
    const phone = '91' + localNumber;
    sendBtn.disabled = true;
    sendBtn.textContent = t('auth.sending');
    showLoader();
    try {
      const res = await apiPost({ action: 'requestLoginOtp', phone });
      if (res.error) { showToast(res.error, 'error'); return; }
      currentPhone = phone;
      try { localStorage.setItem(LAST_PHONE_KEY, localNumber); } catch (_) {}
      phoneStep.classList.add('hidden');
      otpStep.classList.remove('hidden');
      if (channelNote) {
        channelNote.textContent = res.channel === 'email' ? t('auth.sent_via_email') : t('auth.sent_via_whatsapp');
      }
      otpInput.focus();
    } catch {
      showToast(t('msg.network_error'), 'error');
    } finally {
      hideLoader();
      sendBtn.disabled = false;
      sendBtn.textContent = t('auth.send_otp');
    }
  });

  verifyBtn.addEventListener('click', async () => {
    const code = otpInput.value.trim();
    if (!code) return showToast(t('auth.enter_otp'), 'warning');
    verifyBtn.disabled = true;
    verifyBtn.textContent = t('auth.verifying');
    showLoader();
    try {
      const res = await apiPost({
        action: 'verifyLoginOtp',
        phone: currentPhone,
        code,
        rememberMe: rememberCb.checked,
      });
      if (res.error) { showToast(res.error, 'error'); return; }
      setAuthSession(res.token, { name: res.name, role: res.role }, rememberCb.checked);
      const params = new URLSearchParams(location.search);
      const redirect = params.get('redirect') || 'index.html';
      location.href = redirect;
    } catch {
      showToast(t('msg.network_error'), 'error');
    } finally {
      hideLoader();
      verifyBtn.disabled = false;
      verifyBtn.textContent = t('auth.verify_btn');
    }
  });

  if (changeNumBtn) {
    changeNumBtn.addEventListener('click', () => {
      otpStep.classList.add('hidden');
      phoneStep.classList.remove('hidden');
      otpInput.value = '';
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (!requireAuth()) return;

  const page = document.body.dataset.page;
  if (page === 'collect')   initCollectPage();
  if (page === 'dashboard') initDashboardPage();
  if (page === 'report')    initReportPage();
  if (page === 'ledger')    initLedgerPage();
  if (page === 'messenger') initMessengerPage();
  if (page === 'misc-charges') initMiscChargesPage();
  if (page === 'door-ledger') initDoorLedgerPage();
  if (page === 'qr-print' && typeof initQrPrintPage === 'function') initQrPrintPage();
  if (page === 'login')     initLoginPage();

  // More sheet — shared across all pages
  const moreBtn     = document.getElementById('more-btn');
  const moreSheet   = document.getElementById('more-sheet');
  const moreBackdrop = moreSheet?.querySelector('.more-backdrop');
  if (moreBtn && moreSheet) {
    moreBtn.addEventListener('click', () => moreSheet.classList.remove('hidden'));
    moreBackdrop.addEventListener('click', () => moreSheet.classList.add('hidden'));
  }

  // Logout — shared across all pages
  const logoutBtn = document.getElementById('logout-btn');
  const authInfoEl = document.getElementById('auth-info');
  const info = getAuthInfo();
  if (authInfoEl && info) authInfoEl.textContent = `${info.name || ''} (${info.role || ''})`;
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      logoutBtn.disabled = true;
      showLoader();
      try { await apiPost({ action: 'logout' }); } catch (_) {}
      clearAuth();
      location.href = 'login.html';
    });
  }
});
