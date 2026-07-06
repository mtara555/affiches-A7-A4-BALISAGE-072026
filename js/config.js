// ══════════════════════════════════════════════════════════════
// CONFIG.JS — Réglages : mapping préfixes, surcharge template
// Génération A7 · Marjane Tanger Médina
// ══════════════════════════════════════════════════════════════
// Corrige un bug du monolithe d'origine : saveTplOverrides()
// appelait save('product_tpl') alors que la propriété d'état
// s'appelle `productTpl` — la sauvegarde écrivait donc la chaîne
// littérale "undefined" dans localStorage. Corrigé ci-dessous en
// save('productTpl').
//
// Dépend de : state.js, ui.js, labelData.js, canvasRender.js
// ══════════════════════════════════════════════════════════════

import { state, save, resetMapping as resetMappingState } from './state.js';
import { $, toast } from './ui.js';
import { TEMPLATES_ALL } from './labelData.js';
import { findTemplate } from './canvasRender.js';

function esc(str){
  return String(str ?? '').replace(/[&<>"']/g, c => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;',
  }[c]));
}

/* ── Mapping préfixe de code → template ────────────────────────────── */
export function renderMapping(){
  const wrap = $('#mappingList');
  if(!wrap) return;
  wrap.innerHTML = '';
  state.mapping.forEach((m, i) => {
    const row = document.createElement('div');
    row.style.cssText = 'display:grid;grid-template-columns:1fr 1fr 2fr auto;gap:6px;align-items:center;margin-bottom:6px';
    row.innerHTML = `
      <input data-i="${i}" data-k="prefix" value="${esc(m.prefix)}" placeholder="Préfixe" style="font-family:var(--font-mono);font-size:12px;margin-bottom:0">
      <select data-i="${i}" data-k="template" style="margin-bottom:0">${TEMPLATES_ALL.map(t => `<option ${t === m.template ? 'selected' : ''}>${t}</option>`).join('')}</select>
      <input data-i="${i}" data-k="label" value="${esc(m.label || '')}" placeholder="Libellé" style="font-size:12px;margin-bottom:0">
      <button class="btn btn-danger btn-sm" data-del="${i}"><i class="ri-close-line"></i></button>`;
    wrap.appendChild(row);
  });

  wrap.querySelectorAll('input,select').forEach(el => el.addEventListener('input', e => {
    const i = +e.target.dataset.i;
    state.mapping[i][e.target.dataset.k] = e.target.value;
  }));
  wrap.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => {
    state.mapping.splice(+b.dataset.del, 1);
    renderMapping();
  }));
}

export function addMapping(){
  state.mapping.unshift({ prefix:'', template:'PAT', label:'' });
  renderMapping();
}

export function saveMapping(){
  save('mapping');
  toast('Mapping enregistré', 'ok');
}

export function resetMapping(){
  resetMappingState();
  renderMapping();
  toast('Réinitialisé');
}

/* ── Surcharge de template par code article ────────────────────────── */
export function renderTplOverrideTable(){
  const q = ($('#tplOverrideSearch')?.value || '').toLowerCase();
  const body = $('#tplOverrideBody');
  if(!body) return;
  body.innerHTML = '';

  state.base
    .filter(p => !q || p.code.includes(q) || p.designation_fr.toLowerCase().includes(q))
    .slice(0, 80)
    .forEach(p => {
      const forced = state.productTpl[p.code] || '';
      const autoTpl = findTemplate(p.code, p, state.mapping, TEMPLATES_ALL);
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="mono" style="font-size:12px">${esc(p.code)}</td>
        <td style="font-size:12px">${esc(p.designation_fr.substring(0, 22))}</td>
        <td><span style="background:var(--surf-3);border-radius:4px;padding:2px 6px;font-size:10px">${esc(autoTpl)}</span></td>
        <td><select data-code="${esc(p.code)}" style="font-size:12px;width:100%;margin-bottom:0">
          <option value="">Auto</option>${TEMPLATES_ALL.map(t => `<option ${forced === t ? 'selected' : ''}>${t}</option>`).join('')}
        </select></td>`;
      body.appendChild(tr);
    });

  body.querySelectorAll('select').forEach(s => s.addEventListener('change', e => {
    const c = e.target.dataset.code, v = e.target.value;
    if(v) state.productTpl[c] = v; else delete state.productTpl[c];
  }));
}

export function saveTplOverrides(){
  save('productTpl'); // corrigé : était save('product_tpl') dans le monolithe (bug silencieux)
  toast('Assignations enregistrées', 'ok');
}

/* ── Câblage de l'onglet Config ───────────────────────────────────────── */
export function initConfigTab(){
  $('#btnAddMapping')?.addEventListener('click', addMapping);
  $('#btnSaveMapping')?.addEventListener('click', saveMapping);
  $('#btnResetMapping')?.addEventListener('click', resetMapping);
  $('#tplOverrideSearch')?.addEventListener('input', renderTplOverrideTable);
  $('#btnSaveTplOverrides')?.addEventListener('click', saveTplOverrides);
}

/* ── À appeler quand on entre dans l'onglet (données déjà chargées) ───── */
export function refreshConfigTab(){
  renderMapping();
  renderTplOverrideTable();
}

