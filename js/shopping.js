/* ═══════════════════════════════════════════════════════════
   HomeBull — shopping.js
   Lista della spesa
═══════════════════════════════════════════════════════════ */

'use strict';

const SHOP_KEY = 'hb_shopping';

let _shopData = {}; // { listId: { name, items: { id: {name,icon,qty,checked} } } }
let _shopCurId = null;

function shopInit() {
  try { _shopData = JSON.parse(localStorage.getItem(SHOP_KEY) || '{}'); } catch { _shopData = {}; }
  if (!Object.keys(_shopData).length) _shopCreateDefault();
  _shopCurId = Object.keys(_shopData)[0];
  shopRender();
}

function shopSave() {
  localStorage.setItem(SHOP_KEY, JSON.stringify(_shopData));
}

function _shopCreateDefault() {
  const id = uid();
  _shopData[id] = { name: 'Spesa', items: {} };
}

function shoppingOpen() {
  shopRender();
}

function shopRender() {
  // da implementare con le funzionalità complete
  const el = $('shop-content');
  if (!el) return;
  const list = _shopData[_shopCurId];
  if (!list) return;
  const count = Object.keys(list.items).length;
  topbarSetSub(`${count} ${count === 1 ? 'prodotto' : 'prodotti'}`);
}
