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
  switchTab('home');
  // Inizializza i moduli
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
