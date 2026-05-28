/* ═══════════════════════════════════════════════════════════
   HomeBull — app.js
   Core: auth, routing, toast, helpers
═══════════════════════════════════════════════════════════ */

'use strict';

// ── Costanti storage ─────────────────────────────────────
const KEY_SALT     = 'hb_salt';
const KEY_PIN_HASH = 'hb_pin_hash';
const KEY_USER     = 'hb_user';
const KEY_THEME    = 'hb_theme';

// ── Stato globale ────────────────────────────────────────
let _currentTab = 'home';
let _pinBuffer  = [];
let _isSetup    = false; // true = stiamo creando il PIN per la prima volta

// ════════════════════════════════════════════════════════
//  INIT
// ════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  applyTheme();
  authInit();
});

// ════════════════════════════════════════════════════════
//  TEMA
// ════════════════════════════════════════════════════════
function applyTheme() {
  const t = localStorage.getItem(KEY_THEME) || 'dark';
  document.documentElement.setAttribute('data-theme', t);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem(KEY_THEME, next);
}

// ════════════════════════════════════════════════════════
//  AUTH — PIN
// ════════════════════════════════════════════════════════
function authInit() {
  const hasPIN = !!localStorage.getItem(KEY_PIN_HASH);
  _isSetup = !hasPIN;

  const title    = document.getElementById('auth-title');
  const subtitle = document.getElementById('auth-subtitle');

  if (_isSetup) {
    title.textContent    = 'Crea il tuo PIN';
    subtitle.textContent = 'Scegli un PIN di 6 cifre';
  } else {
    const user = localStorage.getItem(KEY_USER) || 'HomeBull';
    title.textContent    = 'Bentornato 👋';
    subtitle.textContent = user;
  }
}

function pinTap(digit) {
  if (_pinBuffer.length >= 6) return;
  _pinBuffer.push(digit);
  pinUpdateDots();
  if (_pinBuffer.length === 6) {
    setTimeout(pinSubmit, 120);
  }
}

function pinDelete() {
  if (!_pinBuffer.length) return;
  _pinBuffer.pop();
  pinUpdateDots();
  document.getElementById('auth-error').textContent = '';
}

function pinUpdateDots() {
  document.querySelectorAll('.pin-dot').forEach((dot, i) => {
    dot.classList.toggle('filled', i < _pinBuffer.length);
  });
}

async function pinSubmit() {
  const pin = _pinBuffer.join('');
  _pinBuffer = [];
  pinUpdateDots();

  if (_isSetup) {
    // Salva hash PIN
    const hash = await sha256(pin);
    localStorage.setItem(KEY_PIN_HASH, hash);
    authSuccess();
  } else {
    const stored = localStorage.getItem(KEY_PIN_HASH);
    const hash   = await sha256(pin);
    if (hash === stored) {
      authSuccess();
    } else {
      document.getElementById('auth-error').textContent = 'PIN errato, riprova';
    }
  }
}

function authSuccess() {
  const screen = document.getElementById('auth-screen');
  screen.style.opacity = '0';
  screen.style.transition = 'opacity 0.3s';
  setTimeout(() => {
    screen.style.display = 'none';
    appStart();
  }, 300);
}

async function sha256(text) {
  const buf  = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
}

function authLogout() {
  localStorage.removeItem(KEY_PIN_HASH);
  localStorage.removeItem(KEY_SALT);
  location.reload();
}

// ════════════════════════════════════════════════════════
//  APP START
// ════════════════════════════════════════════════════════
function appStart() {
  applyTheme();
  applyHomePrefs();
  updateHomeDate();
  renderQuickAccess();
  switchTab('home');
  if (typeof shopInit === 'function') shopInit();
}

// ════════════════════════════════════════════════════════
//  TAB ROUTING
// ════════════════════════════════════════════════════════
function switchTab(tabId) {
  _currentTab = tabId;

  // Pannelli
  document.querySelectorAll('.tab-panel').forEach(p => {
    p.classList.toggle('active', p.id === `panel-${tabId}`);
  });

  // Sidebar (desktop)
  document.querySelectorAll('.sidebar-item').forEach(el => {
    el.classList.toggle('active', el.dataset.tab === tabId);
  });

  // Bottombar (mobile)
  document.querySelectorAll('.bottom-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabId);
  });

  // Chiudi popup "Altro"
  const morePopup = document.getElementById('bottom-more-popup');
  if (morePopup) morePopup.classList.remove('open');

  // Aggiorna topbar
  updateTopbar(tabId);

  // Chiama onOpen del modulo se esiste
  // Aggiorna home quando si apre
  if (tabId === 'home') {
    updateHomeDate();
    renderQuickAccess();
  }
  const onOpen = window[`${tabId}Open`];
  if (typeof onOpen === 'function') onOpen();
}

function updateTopbar(tabId) {
  const titles = {
    home:      ['🏠 HomeBull', ''],
    shopping:  ['🛒 Lista Spesa', ''],
    passwords: ['🔐 Password', ''],
    notes:     ['📝 Note', ''],
    otp:       ['🔑 OTP / 2FA', ''],
    wifi:      ['🌐 Wi-Fi', ''],
    cards:     ['💳 Carte', ''],
    finance:   ['📊 Finanze', ''],
    server:    ['📡 Server / IT', ''],
    documents: ['📄 Documenti', ''],
    calendar:  ['📅 Calendario', ''],
    family:    ['👨‍👩‍👧 Famiglia', ''],
  };
  const [title, sub] = titles[tabId] || ['HomeBull', ''];
  document.getElementById('topbar-title').textContent = title;
  document.getElementById('topbar-sub').textContent   = sub;
  document.getElementById('topbar-actions').innerHTML  = '';
  document.getElementById('topbar-back').classList.remove('visible');
}

function topbarSetSub(text) {
  document.getElementById('topbar-sub').textContent = text;
}

function topbarSetActions(html) {
  document.getElementById('topbar-actions').innerHTML = html;
}

function topbarBack(fn) {
  const btn = document.getElementById('topbar-back');
  btn.classList.add('visible');
  btn.onclick = fn;
}

function topbarHideBack() {
  document.getElementById('topbar-back').classList.remove('visible');
}

// ════════════════════════════════════════════════════════
//  BOTTOM MORE POPUP
// ════════════════════════════════════════════════════════
function toggleBottomMore() {
  const popup = document.getElementById('bottom-more-popup');
  if (!popup) return;
  const isOpen = popup.classList.contains('open');
  popup.classList.toggle('open', !isOpen);

  if (!isOpen) {
    setTimeout(() => {
      document.addEventListener('click', function closePopup(e) {
        if (!popup.contains(e.target)) {
          popup.classList.remove('open');
          document.removeEventListener('click', closePopup);
        }
      });
    }, 100);
  }
}

// ════════════════════════════════════════════════════════
//  TOAST
// ════════════════════════════════════════════════════════
let _toastTimer;
function showToast(msg, duration = 2200) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => toast.classList.remove('show'), duration);
}

// ════════════════════════════════════════════════════════
//  MODAL HELPERS
// ════════════════════════════════════════════════════════
function createModal(content, opts = {}) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:8000;background:rgba(0,0,0,0.6);display:flex;align-items:flex-end;justify-content:center;backdrop-filter:blur(4px);';

  const sheet = document.createElement('div');
  sheet.className = 'modal-sheet';
  sheet.innerHTML = `<div class="modal-handle"></div>${content}`;

  if (!opts.noClose) {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) overlay.remove();
    });
  }

  overlay.appendChild(sheet);
  document.body.appendChild(overlay);
  return { overlay, sheet };
}

// ════════════════════════════════════════════════════════
//  UTILITY
// ════════════════════════════════════════════════════════
function $(id) { return document.getElementById(id); }
function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('it-IT', { day:'2-digit', month:'2-digit', year:'numeric' });
}
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2,6); }



// ═══════════════════════════════════════════════════════════
//  HOME DASHBOARD — funzioni da v22
// ═══════════════════════════════════════════════════════════

const ALL_TABS_META = [
const QA_KEY = 'hb12_quick_access';
const HOME_PREFS_KEY = 'hb12_home_prefs';
const HB_NAME_KEY = 'hb12_display_name';

function updateHomeDate() {
  const now  = new Date();
  const h    = now.getHours();
  const greet = h < 12 ? 'Buongiorno,' : h < 18 ? 'Buon pomeriggio,' : 'Buonasera,';
  const name  = getDisplayName();
  const dateStr = now.toLocaleDateString('it-IT', { weekday:'long', day:'numeric', month:'long' });
  const saluto = document.getElementById('home-saluto');
  const el = document.getElementById('home-greeting');
  const de = document.getElementById('home-date');
  if (saluto) saluto.textContent = greet;
  if (el) el.textContent = name;
  if (de) de.textContent = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
}

function renderQuickAccess() {
  const tabs = loadQuickAccess();
  const grid = document.getElementById('quick-access-grid');
  if (!grid) return;
  grid.innerHTML = '';
  tabs.forEach(tabId => {
    const meta = ALL_TABS_META.find(t => t.id === tabId);
    if (!meta) return;
    const card = document.createElement('div');
    card.className = 'qa-card';
    card.onclick = () => switchTab(tabId);
    card.innerHTML = `<div class="qa-card-icon">${meta.icon}</div><div class="qa-card-label">${meta.label}</div>`;
    grid.appendChild(card);
  });
}

function editQuickAccess() {
  qaSelected = [...loadQuickAccess()];
  const container = document.getElementById('qa-all-tabs');
  container.innerHTML = '';
  ALL_TABS_META.forEach(tab => {
    const el = document.createElement('div');
    el.className = 'qa-tab-option' + (qaSelected.includes(tab.id) ? ' selected' : '');
    el.dataset.id = tab.id;
    el.innerHTML = `<div class="qa-tab-option-icon">${tab.icon}</div><div class="qa-tab-option-label">${tab.label}</div>`;
    el.onclick = () => {
      if (qaSelected.includes(tab.id)) {
        qaSelected = qaSelected.filter(t => t !== tab.id);
        el.classList.remove('selected');
      } else if (qaSelected.length < 6) {
        qaSelected.push(tab.id);
        el.classList.add('selected');
      } else {
        showToast('Massimo 6 schede nell\'accesso rapido');
      }
    };
    container.appendChild(el);
  });
  document.getElementById('qa-edit-modal').classList.add('open');
}

function saveQaEdit() {
  if (qaSelected.length === 0) { showToast('Seleziona almeno una scheda'); return; }
  localStorage.setItem(QA_KEY, JSON.stringify(qaSelected));
  renderQuickAccess();
  closeQaEdit();
  showToast('✅ Accesso rapido aggiornato');
}

function closeQaEdit() {
  document.getElementById('qa-edit-modal').classList.remove('open');
}

function openGlobalSearch() {
  document.getElementById('search-overlay').classList.add('open');
  setTimeout(() => document.getElementById('search-input').focus(), 100);
}

function closeGlobalSearch() {
  document.getElementById('search-overlay').classList.remove('open');
  document.getElementById('search-input').value = '';
  document.getElementById('search-results').innerHTML = '<div class="search-empty">Inizia a digitare per cercare</div>';
}

function runSearch(q) {
  const container = document.getElementById('search-results');
  if (!q.trim()) {
    container.innerHTML = '<div class="search-empty">Inizia a digitare per cercare</div>';
    return;
  }
  // Cerca nei dati disponibili (espandibile per ogni scheda)
  const results = [];
  const ql = q.toLowerCase();

  // Placeholder: cerca nelle schede registrate
  ALL_TABS_META.forEach(tab => {
    if (tab.label.toLowerCase().includes(ql)) {
      results.push({
        icon: tab.icon, title: 'Vai a ' + tab.label,
        sub: 'Sezione ' + tab.label, tab: tab.id, tabLabel: tab.label
      });
    }
  });

  // TODO: quando le schede avranno dati reali, cercare lì
  // results.push(...searchPasswords(q), ...searchNotes(q), ...searchCards(q));

  if (!results.length) {
    container.innerHTML = `<div class="search-empty">Nessun risultato per "<strong>${q}</strong>"</div>`;
    return;
  }
  container.innerHTML = results.map(r => `
    <div class="search-result-item" onclick="closeGlobalSearch();switchTab('${r.tab}')">
      <div class="search-result-icon">${r.icon}</div>
      <div style="flex:1;min-width:0;">
        <div class="search-result-title">${r.title}</div>
        <div class="search-result-sub">${r.sub}</div>
      </div>
      <div class="search-result-tab">${r.tabLabel}</div>
    </div>
  `).join('');
}

function openHomeCustom() {
  const prefs = loadHomePrefs();
  // Precompila checkbox sezioni
  const defaults = { search:true, quick:true, stats:true, alerts:true };
  ['search','quick','stats','alerts'].forEach(k => {
    const el = document.getElementById('hc-' + k);
    if (el) el.checked = prefs[k] !== undefined ? prefs[k] : defaults[k];
  });
  // Precompila quick access
  qaSelected = [...loadQuickAccess()];
  const container = document.getElementById('qa-all-tabs-home');
  container.innerHTML = '';
  ALL_TABS_META.forEach(tab => {
    const el = document.createElement('div');
    el.className = 'qa-tab-option' + (qaSelected.includes(tab.id) ? ' selected' : '');
    el.dataset.id = tab.id;
    el.innerHTML = `<div class="qa-tab-option-icon">${tab.icon}</div><div class="qa-tab-option-label">${tab.label}</div>`;
    el.onclick = () => {
      if (qaSelected.includes(tab.id)) {
        qaSelected = qaSelected.filter(t => t !== tab.id);
        el.classList.remove('selected');
      } else if (qaSelected.length < 6) {
        qaSelected.push(tab.id);
        el.classList.add('selected');
      } else {
        showToast('Massimo 6 schede');
      }
    };
    container.appendChild(el);
  });
  // Tema
  const theme = document.documentElement.getAttribute('data-theme') || 'dark';
  document.getElementById('theme-dark-btn').style.borderWidth  = theme === 'dark'  ? '2px' : '1px';
  document.getElementById('theme-light-btn').style.borderWidth = theme === 'light' ? '2px' : '1px';
  document.getElementById('home-custom-modal').style.display = 'flex';
}

function closeHomeCustom() {
  document.getElementById('home-custom-modal').style.display = 'none';
}

function saveHomeCustom() {
  const prefs = {
    search: document.getElementById('hc-search').checked,
    quick:  document.getElementById('hc-quick').checked,
    alerts: document.getElementById('hc-alerts').checked,
  };
  saveHomePrefs(prefs);
  if (qaSelected.length > 0) localStorage.setItem(QA_KEY, JSON.stringify(qaSelected));
  applyHomePrefs();
  renderQuickAccess();
  closeHomeCustom();
  showToast('✅ Home personalizzata');
}

function applyHomePrefs() {
  const prefs = loadHomePrefs();
  const map = {
    search: 'home-search-bar',
    quick:  'home-quick-section',
    alerts: 'home-alerts-section',
  };
  Object.entries(map).forEach(([key, elId]) => {
    const el = document.getElementById(elId);
    if (el) el.style.display = (prefs[key] === false) ? 'none' : '';
  });
}

function setTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  localStorage.setItem('hb12_theme', t);
  document.getElementById('theme-dark-btn').style.borderWidth  = t === 'dark'  ? '2px' : '1px';
  document.getElementById('theme-light-btn').style.borderWidth = t === 'light' ? '2px' : '1px';
}

function editDisplayName() {
  const current = getDisplayName();
  const newName = prompt('Come vuoi essere chiamato?', current);
  if (newName === null) return; // annullato
  const trimmed = newName.trim();
  if (trimmed) {
    localStorage.setItem(HB_NAME_KEY, trimmed);
    updateHomeDate();
    showToast('✅ Nome aggiornato: ' + trimmed);
  }
}

function getDisplayName() {
  return localStorage.getItem(HB_NAME_KEY) ||
         (HB.user?.email?.split('@')[0] || 'Utente');
}