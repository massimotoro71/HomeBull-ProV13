/* ═══════════════════════════════════════════════════════════
   HomeBull — ui.js
   Helpers UI: confirm dialog, input dialog, fullscreen photo
═══════════════════════════════════════════════════════════ */

'use strict';

// ── Confirm dialog ───────────────────────────────────────
function uiConfirm(msg, onConfirm, opts = {}) {
  const { confirmLabel = 'Conferma', confirmClass = 'btn-primary', cancelLabel = 'Annulla' } = opts;
  const { overlay } = createModal(`
    <div style="text-align:center;padding:8px 0 16px;">
      <div style="font-size:28px;margin-bottom:12px;">${opts.icon || '⚠️'}</div>
      <div class="modal-title" style="font-size:16px;">${msg}</div>
      ${opts.sub ? `<div style="font-size:13px;color:var(--text3);margin-top:6px;">${opts.sub}</div>` : ''}
    </div>
    <div style="display:flex;gap:10px;margin-top:4px;">
      <button class="btn btn-secondary" style="flex:1;" onclick="this.closest('.modal-overlay').remove()">${cancelLabel}</button>
      <button class="btn ${confirmClass}" style="flex:1;" id="_confirm_ok">${confirmLabel}</button>
    </div>
  `);
  document.getElementById('_confirm_ok').onclick = () => {
    overlay.remove();
    onConfirm();
  };
}

// ── Input dialog ─────────────────────────────────────────
function uiPrompt(title, opts = {}, onConfirm) {
  const { placeholder = '', value = '', type = 'text', confirmLabel = 'Salva' } = opts;
  const { overlay } = createModal(`
    <div class="modal-title">${title}</div>
    <input id="_prompt_input" class="input" type="${type}" placeholder="${placeholder}" value="${value}"
      style="margin-bottom:14px;">
    <div style="display:flex;gap:10px;">
      <button class="btn btn-secondary" style="flex:1;" onclick="this.closest('.modal-overlay').remove()">Annulla</button>
      <button class="btn btn-primary" style="flex:2;" id="_prompt_ok">${confirmLabel}</button>
    </div>
  `);
  const inp = document.getElementById('_prompt_input');
  inp.focus(); inp.select();
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('_prompt_ok').click(); });
  document.getElementById('_prompt_ok').onclick = () => {
    const val = inp.value.trim();
    overlay.remove();
    onConfirm(val);
  };
}

// ── Fullscreen photo viewer ───────────────────────────────
function uiPhotoFullscreen(src) {
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;z-index:9900;background:rgba(0,0,0,0.96);display:flex;align-items:center;justify-content:center;cursor:zoom-out;';
  overlay.onclick = () => overlay.remove();
  const img = document.createElement('img');
  img.src = src;
  img.style.cssText = 'max-width:95vw;max-height:95dvh;object-fit:contain;border-radius:12px;';
  overlay.appendChild(img);
  document.body.appendChild(overlay);
}

// ── Copy to clipboard ─────────────────────────────────────
async function uiCopy(text, label = '') {
  try {
    await navigator.clipboard.writeText(text);
    showToast('📋 ' + (label || 'Copiato!'));
  } catch {
    showToast(text);
  }
}
