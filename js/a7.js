// ══════════════════════════════════════════════════════════════
// A7.JS — Logique métier de l'onglet Saisie
// Génération A7 · Marjane Tanger Médina
// ══════════════════════════════════════════════════════════════
// Branche les modules infra (state, ui, canvasRender) sur les
// champs du formulaire Saisie : recherche article, aperçu live,
// ajout/suppression dans la file d'attente.
//
// Dépend de : state.js, ui.js, storage.js, canvasRender.js
// ══════════════════════════════════════════════════════════════

import { state, save } from './state.js';
import { $, toast } from './ui.js';
import { idbPutOne } from './storage.js';
import { CW, CH, drawLabel, findTemplate, fmtPrice } from './canvasRender.js';
import { SPECIAL_TPL } from './labelData.js';

let currentProduct = null;

/* ── Échappement HTML minimal (évite l'injection via désignation) ── */
function esc(str){
  return String(str ?? '').replace(/[&<>"']/g, c => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;',
  }[c]));
}

/* ── Construction de l'item courant à partir du formulaire ─────────── */
export function buildCurrentItem(){
  const code = $('#codeInput').value.trim();
  if(!code) return null;
  const tplSel = $('#templateInput').value;
  const template = tplSel || findTemplate(code, currentProduct, state.mapping, state.templatesAll);
  return {
    code,
    designation_fr: currentProduct?.designation_fr || '',
    designation_ar: currentProduct?.designation_ar || '',
    prix: $('#priceInput').value.trim(),
    unite: $('#uniteInput').value,
    template,
    grammage: $('#grammageInput').value.trim(),
    fidelite: ($('#fideliteInput') || { value:'' }).value.trim(),
    ingredients_fr: currentProduct?.ingredients_fr || '',
    ingredients_ar: currentProduct?.ingredients_ar || '',
    origine: currentProduct?.origine || '',
    col_j: currentProduct?.col_j || '',
    col_h: currentProduct?.col_h || '',
  };
}

/* ── Aperçu live ────────────────────────────────────────────────────── */
export function updatePreview(){
  const canvas = $('#previewCanvas');
  const item = buildCurrentItem();
  if(!item || !item.code){ clearPreview(canvas); return; }
  drawLabel(canvas, item);
  $('#pvTemplate').textContent = item.template;
  $('#pvCode').textContent = 'CODE: ' + item.code;
  $('#pvSpecial').style.display = SPECIAL_TPL.includes(item.template) ? '' : 'none';
}

export function clearPreview(canvas){
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#12100c';
  ctx.fillRect(0, 0, CW, CH);
  ctx.fillStyle = '#2e2820';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = '10px sans-serif';
  ctx.fillText('Aperçu', CW / 2, CH / 2);
  $('#pvTemplate').textContent = '—';
  $('#pvCode').textContent = 'CODE —';
  $('#pvSpecial').style.display = 'none';
}

/* ── Recherche article par code ──────────────────────────────────────── */
export function lookup(){
  const code = $('#codeInput').value.trim();
  if(!code){
    currentProduct = null;
    clearPreview($('#previewCanvas'));
    setStatus('', '');
    return;
  }
  const prod = state.base.find(p => p.code === code);
  if(prod){
    currentProduct = prod;
    const tpl = findTemplate(code, prod, state.mapping, state.templatesAll);
    setStatus(`✓ ${prod.designation_fr} → ${tpl}`, 'ok');
    $('#grammageWrap').style.display = SPECIAL_TPL.includes($('#templateInput').value || tpl) ? '' : 'none';
    updatePreview();
    $('#priceInput').focus();
    $('#priceInput').select();
  } else{
    currentProduct = null;
    setStatus(`Code inconnu: ${code}`, 'warn');
    clearPreview($('#previewCanvas'));
    $('#grammageWrap').style.display = 'none';
  }
}

export function setStatus(msg, type){
  const el = $('#statusBar');
  if(!el) return;
  el.textContent = msg;
  el.style.background = type === 'ok' ? '#052e1680' : type === 'warn' ? '#451a0380' : 'transparent';
  el.style.color = type === 'ok' ? '#86efac' : type === 'warn' ? '#fcd34d' : 'var(--text-3)';
}

/* ── Ajout à la file d'attente ─────────────────────────────────────────── */
export function addToQueue(){
  if(!currentProduct && !$('#codeInput').value.trim()){
    toast('Scannez ou saisissez un code', 'err');
    return;
  }
  const prix = $('#priceInput').value.trim();
  if(!prix){ toast('Saisissez le prix', 'err'); $('#priceInput').focus(); return; }
  const p = parseFloat(prix.replace(',', '.'));
  if(isNaN(p)){ toast('Prix invalide', 'err'); return; }

  const item = buildCurrentItem();
  item.id = Date.now();
  item.prix = fmtPrice(p);
  state.queue.unshift(item);
  save('queue');

  const histItem = { ...item, savedAt: new Date().toISOString() };
  state.history.unshift(histItem);
  if(state.history.length > 5000) state.history = state.history.slice(0, 5000);
  idbPutOne('history', histItem).catch(e => console.warn('[a7] enregistrement historique:', e));

  updateCounters();
  renderQueue();
  toast(`Ajouté: ${item.designation_fr || item.code}`, 'ok');

  // Réinitialisation du formulaire
  $('#codeInput').value = '';
  $('#priceInput').value = '';
  $('#grammageInput').value = '';
  const fidInput = $('#fideliteInput');
  if(fidInput) fidInput.value = '';
  const fidCalc = $('#fideliteCalcDisplay');
  if(fidCalc) fidCalc.textContent = '';
  const fidInfo = $('#fideliteInfo');
  if(fidInfo) fidInfo.style.display = 'none';
  currentProduct = null;
  clearPreview($('#previewCanvas'));
  setStatus('', '');
  $('#codeInput').focus();
}

/* ── File d'attente ─────────────────────────────────────────────────────── */
export function renderQueue(){
  const body = $('#queueBody');
  if(!body) return;
  body.innerHTML = '';
  const empty = $('#queueEmpty');
  if(empty) empty.style.display = state.queue.length ? 'none' : '';

  state.queue.forEach((it, i) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="mono" style="font-size:12px">${esc(it.code)}</td>
      <td><div style="font-weight:600">${esc(it.designation_fr || '—')}</div>
          <div class="ar" style="font-size:10px;color:var(--text-3)">${esc(it.designation_ar || '')}</div></td>
      <td><span style="background:var(--surf-3);border:1px solid var(--border-2);border-radius:5px;padding:2px 7px;font-size:11px;font-weight:700">${esc(it.template)}</span></td>
      <td style="color:var(--amber);font-weight:700;font-family:var(--font-mono)">${esc(it.prix)} DH</td>
      <td style="color:var(--text-3)">/${esc(it.unite)}</td>
      <td style="color:var(--text-3);font-size:12px">${it.grammage ? esc(it.grammage) + ' kg' : '—'}</td>
      <td style="color:var(--amber);font-size:12px">${it.fidelite ? esc(it.fidelite) + '%' : '—'}</td>
      <td style="text-align:right">
        <button class="btn btn-ghost btn-sm" data-remove-index="${i}"><i class="ri-close-line"></i></button>
      </td>`;
    body.appendChild(tr);
  });
}

export function removeFromQueue(i){
  state.queue.splice(i, 1);
  save('queue');
  renderQueue();
  updateCounters();
}

export function clearQueue(){
  if(!confirm('Vider toute la file ?')) return;
  state.queue = [];
  save('queue');
  renderQueue();
  updateCounters();
  toast('File vidée');
}

export function updateCounters(){
  const q = state.queue.length;
  const hdrQueue = $('#hdrQueue');
  const hdrBase = $('#hdrBase');
  const navFileCount = $('#navFileCount');
  if(hdrQueue) hdrQueue.textContent = 'File: ' + q;
  if(hdrBase) hdrBase.textContent = 'Base: ' + state.base.length;
  if(navFileCount) navFileCount.textContent = q;
}

/* ── Câblage des événements du formulaire Saisie ───────────────────────── */
export function initA7Form(){
  const codeIn = $('#codeInput');
  const priceIn = $('#priceInput');

  codeIn?.addEventListener('input', lookup);
  codeIn?.addEventListener('keydown', e => { if(e.key === 'Enter'){ e.preventDefault(); lookup(); } });
  priceIn?.addEventListener('keydown', e => { if(e.key === 'Enter'){ e.preventDefault(); addToQueue(); } });

  // Délégation d'événement pour la suppression dans la file — remplace
  // les onclick="removeFromQueue(i)" générés en innerHTML dans le monolithe.
  $('#queueBody')?.addEventListener('click', e => {
    const btn = e.target.closest('[data-remove-index]');
    if(btn) removeFromQueue(Number(btn.dataset.removeIndex));
  });

  renderQueue();
  updateCounters();
}
