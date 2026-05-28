'use strict';

// ── Init ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Applica tema salvato
  const saved = localStorage.getItem('hb12_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
  checkAuthStatus();
});

function applyTheme() {
  const saved = localStorage.getItem('hb12_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
}

/* ═══════════════════════════════════════════════════════════
   HomeBull — app.js
   Core: auth, routing, toast, helpers
═══════════════════════════════════════════════════════════ */


// ═══════════════════════════════════════════════════════════
//  AUTH — portato da v22 (Email → OTP → PIN + Biometrico)
// ═══════════════════════════════════════════════════════════

const HB = {
  version: '13.0.0-beta',
  currentTab: 'home',
  authState: 'email',
  user: null,
  sessionKey: null,
  pinBuffer: '',
  pinMode: 'setup',
  pinFirst: '',
  otpCode: '',
  tabs: ['home','passwords','documents','notes','calendar','otp','cards','wifi','finance','server','family','shopping']
};
const HB_BIO_KEY     = 'hb12_bio_credId';
const HB_BIO_PIN_KEY = 'hb12_bio_pin_enc';
const HB_BIO_SALT    = 'hb12-biometric-key-v1';

function sendOTP() {
  const email = document.getElementById('auth-email').value.trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showToast('Inserisci un\'email valida');
    return;
  }

  const btn = document.getElementById('btn-send-otp');
  btn.disabled = true;
  btn.textContent = 'Invio in corso...';

  // Generate 6-digit OTP and "send" it (in demo: show in console + toast)
  HB.otpCode = String(Math.floor(100000 + Math.random() * 900000));
  HB.user = { email };

  console.log('[HB12 Demo] OTP:', HB.otpCode);

  setTimeout(() => {
    btn.disabled = false;
    btn.textContent = 'Invia codice di accesso';
    goToStep('otp');
    // Mostra il codice direttamente nella pagina OTP (modalità demo)
    const hint = document.getElementById('otp-demo-hint');
    const codeEl = document.getElementById('otp-demo-code');
    if (hint) hint.style.display = 'block';
    if (codeEl) codeEl.textContent = HB.otpCode;
    // Pre-compila i campi con il codice demo
    const digits = document.querySelectorAll('.otp-digit');
    HB.otpCode.split('').forEach((d, i) => { if (digits[i]) digits[i].value = d; });
    showToast('📧 Codice demo: ' + HB.otpCode, 8000);
  }, 800);
}

function verifyOTP() {
  const digits = [...document.querySelectorAll('.otp-digit')].map(d => d.value).join('');
  if (digits.length !== 6) {
    document.getElementById('otp-error').textContent = 'Inserisci tutte le 6 cifre';
    return;
  }

  if (digits === HB.otpCode) {
    document.getElementById('otp-error').textContent = '';
    saveUser(HB.user);
    const hasPIN = !!localStorage.getItem('hb12_pin_hash');
    if (hasPIN) {
      HB.authState = 'pin-login';
      document.getElementById('pin-label').textContent = 'Inserisci il tuo PIN';
    } else {
      HB.authState = 'pin-setup';
      HB.pinMode = 'setup';
      document.getElementById('pin-label').textContent = 'Scegli il tuo PIN Master (6-8 cifre)';
    }
    goToStep('pin');
    showToast('✅ Email verificata');
  } else {
    document.getElementById('otp-error').textContent = 'Codice non corretto — riprova';
    document.querySelectorAll('.otp-digit').forEach(d => d.value = '');
    document.querySelectorAll('.otp-digit')[0].focus();
  }
}

function goToStep(step) {
  document.querySelectorAll('.auth-step').forEach(s => s.classList.remove('active'));
  document.getElementById('step-' + step)?.classList.add('active');
  if (step === 'email') setTimeout(() => document.getElementById('auth-email')?.focus(), 100);
}

function pinPress(digit) {
  if (HB.pinBuffer.length >= 8) return;
  HB.pinBuffer += digit;
  updatePinDots();
  if (HB.pinBuffer.length === 8) {
    setTimeout(() => pinConfirm(), 100);
  }
}

function pinClear() {
  HB.pinBuffer = HB.pinBuffer.slice(0, -1);
  updatePinDots();
}

function updatePinDots() {
  for (let i = 0; i < 8; i++) {
    const dot = document.getElementById('pd' + i);
    if (dot) dot.classList.toggle('filled', i < HB.pinBuffer.length);
  }
}

function pinConfirm() {
  if (HB.pinBuffer.length < 6) {
    showPinError('Minimo 6 cifre');
    return;
  }

  const mode = HB.authState;

  if (mode === 'pin-setup') {
    if (HB.pinMode === 'setup') {
      HB.pinFirst = HB.pinBuffer;
      HB.pinBuffer = '';
      HB.pinMode = 'confirm';
      updatePinDots();
      document.getElementById('pin-label').textContent = 'Conferma il PIN';
      document.getElementById('pin-error').textContent = '';
      return;
    }
    if (HB.pinMode === 'confirm') {
      if (HB.pinBuffer !== HB.pinFirst) {
        HB.pinBuffer = '';
        HB.pinFirst = '';
        HB.pinMode = 'setup';
        updatePinDots();
        showPinError('I PIN non coincidono — riprova');
        document.getElementById('pin-label').textContent = 'Scegli il tuo PIN Master';
        return;
      }
      HB._lastPin = HB.pinBuffer; // salva per registrazione biometrica
      await setupPIN(HB.pinBuffer);
      unlockApp();
    }
  }

  if (mode === 'pin-login') {
    const ok = await verifyPIN(HB.pinBuffer);
    if (ok) {
      HB._lastPin = HB.pinBuffer; // salva per registrazione biometrica
      unlockApp();
    } else {
      HB.pinBuffer = '';
      updatePinDots();
      showPinError('PIN errato — riprova');
    }
  }
}

function showPinError(msg) {
  document.getElementById('pin-error').textContent = msg;
  setTimeout(() => { document.getElementById('pin-error').textContent = ''; }, 3000);
}

function setupPIN(pin) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  localStorage.setItem('hb12_salt', btoa(String.fromCharCode(...salt)));
  HB.sessionKey = await deriveKey(pin, salt);
  // Save PIN hash (PBKDF2 output — not the PIN itself)
  const hashBuf = await crypto.subtle.exportKey('raw', HB.sessionKey);
  const hashArr = new Uint8Array(hashBuf).slice(0, 16);
  let h = '';
  hashArr.forEach(b => h += b.toString(16).padStart(2, '0'));
  localStorage.setItem('hb12_pin_hash', h);
}

function verifyPIN(pin) {
  try {
    const saltB64 = localStorage.getItem('hb12_salt');
    if (!saltB64) return false;
    const salt = new Uint8Array(atob(saltB64).split('').map(c => c.charCodeAt(0)));
    const key = await deriveKey(pin, salt);
    const hashBuf = await crypto.subtle.exportKey('raw', key);
    const hashArr = new Uint8Array(hashBuf).slice(0, 16);
    let h = '';
    hashArr.forEach(b => h += b.toString(16).padStart(2, '0'));
    if (h === localStorage.getItem('hb12_pin_hash')) {
      HB.sessionKey = key;
      return true;
    }
    return false;
  } catch(e) { return false; }
}

function deriveKey(pin, salt) {
  const km = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 200000, hash: 'SHA-256' },
    km, { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']
  );
}

function unlockApp() {
  document.getElementById('auth-screen').style.display = 'none';
  document.getElementById('app').classList.add('visible');
  updateHomeStats();
  initBackHandler();
  applyHomePrefs();
  // Ripristina tema
  const savedTheme = localStorage.getItem('hb12_theme');
  if (savedTheme) setTheme(savedTheme);
  // Dopo unlock mostra opzione registra impronta se non già fatto
  if (!localStorage.getItem(HB_BIO_KEY) && window.PublicKeyCredential) {
    const hint = document.getElementById('bio-register-hint');
    if (hint) hint.style.display = 'block';
  }
  showToast('🔓 Vault aperto');
  // Init app v13
  applyHomePrefs();
  updateHomeDate();
  renderQuickAccess();
  switchTab('home');
  if (typeof shopInit === 'function') shopInit();
}

function logout() {
  HB.sessionKey = null;
  HB.user = null;
  location.reload();
}

function checkBiometricAvailable() {
  if (!window.PublicKeyCredential) return;
  const credId = localStorage.getItem(HB_BIO_KEY);
  const key = document.getElementById('pin-key-left');
  const hint = document.getElementById('bio-register-hint');
  if (credId) {
    // Mostra icona impronta al posto della X
    if (key) {
      key.innerHTML = `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 10a2 2 0 0 0-2 2c0 1.02-.1 2.51-.26 4"/>
        <path d="M14 13.12c0 2.38 0 6.38-1 8.88"/>
        <path d="M17.29 21.02c.12-.6.43-2.3.5-3.02"/>
        <path d="M2 12a10 10 0 0 1 18-6"/>
        <path d="M2 16h.01"/>
        <path d="M21.8 16c.2-2 .131-5.354 0-6"/>
        <path d="M5 19.5C5.5 18 6 15 6 12a6 6 0 0 1 .34-2"/>
        <path d="M8.65 22c.21-.66.45-1.32.57-2"/>
        <path d="M9 6.8a6 6 0 0 1 9 5.2v2"/>
      </svg>`;
      key.className = 'pin-key';
      key.style.color = 'var(--accent)';
    }
    if (hint) hint.style.display = 'none';
  } else {
    // X normale
    if (key) {
      key.innerHTML = '✕';
      key.className = 'pin-key danger';
      key.style.color = '';
    }
    if (hint) hint.style.display = 'block';
  }
}

function pinKeyLeftAction() {
  const credId = localStorage.getItem(HB_BIO_KEY);
  if (credId && HB.authState === 'pin-login') {
    tryBiometric();
  } else {
    pinClear();
  }
}

function registerBiometric() {
  if (!window.PublicKeyCredential) {
    showToast('⚠️ Biometrico non supportato'); return;
  }
  const currentPin = HB._lastPin || HB.pinBuffer || HB.pinFirst || '';
  if (!currentPin) { showToast('Inserisci prima il PIN per registrare l\'impronta'); return; }
  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const userId    = crypto.getRandomValues(new Uint8Array(16));
    const credential = await navigator.credentials.create({ publicKey: {
      challenge,
      rp: { name:'HomeBull Pro', id: location.hostname },
      user: { id:userId, name: HB.user?.email||'user', displayName:'HomeBull' },
      pubKeyCredParams: [{type:'public-key',alg:-7},{type:'public-key',alg:-257}],
      authenticatorSelection: { userVerification:'required', residentKey:'preferred' },
      timeout: 60000
    }});
    if (!credential) return;
    // Salva credId
    const rawId = new Uint8Array(credential.rawId);
    let bin=''; rawId.forEach(b => bin+=String.fromCharCode(b));
    localStorage.setItem(HB_BIO_KEY, btoa(bin));
    // Cifra il PIN con chiave derivata dal rawId (stessa ogni volta → recuperabile)
    const bioKey = await _deriveBioKey(rawId);
    const encPin = await _bioEncrypt(bioKey, currentPin);
    localStorage.setItem(HB_BIO_PIN_KEY, encPin);
    showToast('✅ Impronta registrata! Al prossimo avvio premi 👆 per entrare.');
    checkBiometricAvailable();
  } catch(e) {
    console.warn('[Bio register]', e);
    showToast('⚠️ Registrazione annullata o non riuscita');
  }
}

function tryBiometric() {
  const credIdB64 = localStorage.getItem(HB_BIO_KEY);
  const encPin    = localStorage.getItem(HB_BIO_PIN_KEY);
  if (!credIdB64 || !encPin || !window.PublicKeyCredential) {
    showToast('Biometrico non disponibile'); return;
  }
  try {
    const credIdBytes = new Uint8Array(atob(credIdB64).split('').map(c=>c.charCodeAt(0)));
    const assertion   = await navigator.credentials.get({ publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      allowCredentials: [{type:'public-key', id:credIdBytes}],
      userVerification: 'required', timeout: 60000
    }});
    if (!assertion) return;
    // Recupera PIN usando chiave derivata dal rawId
    const rawId  = new Uint8Array(assertion.rawId);
    const bioKey = await _deriveBioKey(rawId);
    const pin    = await _bioDecrypt(bioKey, encPin);
    if (!pin) { showToast('Biometrico non riuscito — usa il PIN'); return; }
    // Verifica PIN e sblocca
    const ok = await verifyPIN(pin);
    if (ok) {
      showToast('🔑 Identità verificata');
      unlockApp();
    } else {
      showToast('⚠️ Errore verifica — usa il PIN');
    }
  } catch(e) {
    console.warn('[Bio auth]', e);
    showToast('Biometrico non riuscito — usa il PIN');
  }
}

function startForgotPin() {
  const user = loadUser();
  if (!user || !user.email) {
    showToast('Nessun account trovato — accedi prima con email');
    return;
  }
  // Genera OTP reset
  HB._resetOtp = String(Math.floor(100000 + Math.random() * 900000));
  HB._resetEmail = user.email;
  console.log('[HB12 Reset OTP]', HB._resetOtp);
  // TODO: Firebase sendSignInLinkToEmail — per ora demo
  alert('📧 Codice di reset inviato a ' + user.email + '\n\n[Demo] Codice: ' + HB._resetOtp);
  promptResetOtp();
}

function promptResetOtp() {
  const code = prompt('Inserisci il codice a 6 cifre ricevuto via email:');
  if (!code) return;
  if (code.trim() !== HB._resetOtp) {
    alert('Codice non corretto. Riprova.');
    return;
  }
  // OTP corretto → imposta nuovo PIN
  HB.authState = 'pin-setup';
  HB.pinMode = 'setup';
  HB.pinBuffer = '';
  HB.pinFirst = '';
  // Cancella PIN e chiave vecchi
  localStorage.removeItem('hb12_pin_hash');
  localStorage.removeItem('hb12_salt');
  localStorage.removeItem(HB_BIO_KEY);
  localStorage.removeItem(HB_BIO_PIN_KEY);
  updatePinDots();
  document.getElementById('pin-label').textContent = 'Scegli il nuovo PIN (6-8 cifre)';
  const fp = document.getElementById('forgot-pin-btn');
  if (fp) fp.style.display = 'none';
  showToast('✅ Codice verificato — scegli un nuovo PIN');
}

function hbEncrypt(text) {
  if (!HB.sessionKey) return text;
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv }, HB.sessionKey, new TextEncoder().encode(text)
  );
  const combined = new Uint8Array(12 + enc.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(enc), 12);
  let bin = '';
  for (let i = 0; i < combined.length; i++) bin += String.fromCharCode(combined[i]);
  return 'hb12:' + btoa(bin);
}

function hbDecrypt(data) {
  if (!HB.sessionKey || !data.startsWith('hb12:')) return data;
  try {
    const combined = new Uint8Array(atob(data.slice(5)).split('').map(c => c.charCodeAt(0)));
    const dec = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: combined.slice(0, 12) },
      HB.sessionKey, combined.slice(12)
    );
    return new TextDecoder().decode(dec);
  } catch(e) { return null; }
}

// ════════════════════════════════════════════════════════
//  APP START
// ════════════════════════════════════════════════════════
function appStart() {
  // alias per compatibilità v22
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
// ── Service Worker ──────────────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}

// ── Keyboard shortcuts ──────────────────────────────────
document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault(); openGlobalSearch(); return;
  }
  if (e.key === 'Escape') {
    if (document.getElementById('search-overlay')?.classList.contains('open')) {
      closeGlobalSearch(); return;
    }
  }
  // PIN keyboard
  const pinScreen = document.getElementById('step-pin');
  if (pinScreen?.classList.contains('active')) {
    if (e.key >= '0' && e.key <= '9') { pinPress(e.key); return; }
    if (e.key === 'Backspace') { pinClear(); return; }
    if (e.key === 'Enter') { pinConfirm(); return; }
  }
  // OTP keyboard
  const otpScreen = document.getElementById('step-otp');
  if (otpScreen?.classList.contains('active') && e.key === 'Enter') {
    verifyOTP(); return;
  }
});


// ── Missing auth helpers ──
function saveUser(u) { localStorage.setItem('hb12_user', JSON.stringify(u)); }

function loadUser()  { try { return JSON.parse(localStorage.getItem('hb12_user')); } catch { return null; } }

function checkAuthStatus() {
  const user = loadUser();
  const hasPIN = !!localStorage.getItem('hb12_pin_hash');

  if (user && hasPIN) {
    // Returning user → go to PIN login
    HB.user = user;
    HB.authState = 'pin-login';
    goToStep('pin');
    document.getElementById('pin-label').textContent = 'Inserisci il tuo PIN';
    const fp = document.getElementById('forgot-pin-btn');
    if (fp) fp.style.display = 'block';
    setTimeout(() => {
      checkBiometricAvailable();
      // Mobile: avvia biometrico automaticamente se già registrato
      if (/Android|iPhone|iPad/i.test(navigator.userAgent) && localStorage.getItem(HB_BIO_KEY)) {
        setTimeout(tryBiometric, 700);
      }
    }, 300);
  } else {
    // New user → start from email
    HB.authState = 'email';
    goToStep('email');
  }
}

function saveHomePrefs(prefs) {
  localStorage.setItem(HOME_PREFS_KEY, JSON.stringify(prefs));
}

function loadHomePrefs() {
  try { return JSON.parse(localStorage.getItem(HOME_PREFS_KEY)) || {}; } catch { return {}; }
}

function handleSearchOverlayClick(e) {
  if (e.target === document.getElementById('search-overlay')) closeGlobalSearch();
}