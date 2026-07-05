// ══════════════════════════════════════════════════════════════
// BASE.JS — Gestion de la base articles
// Génération A7 · Marjane Tanger Médina
// ══════════════════════════════════════════════════════════════
// Recherche + pagination + CRUD + import/export Excel.
// La traduction IA (Groq/Anthropic) à l'import est reportée au
// module Config (gestion de la clé API) — l'import direct
// (colonnes A→H du fichier) est pleinement fonctionnel ici.
//
// Dépend de : state.js, ui.js, labelData.js
// Nécessite la lib externe SheetJS (XLSX) chargée en <script> classique.
// ══════════════════════════════════════════════════════════════

import { state, save } from './state.js';
import { $, toast, openModal, closeModal } from './ui.js';
import { isAllergen, isAllergenAr } from './canvasRender.js';

const PAGE_SIZE = 50;
let currentPage = 0;
let editingCode = null;

function esc(str){
  return String(str ?? '').replace(/[&<>"']/g, c => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;',
  }[c]));
}

/* ── Surlignage des allergènes dans l'aperçu ingrédients ─────────── */
function renderIngHtml(text, maxLen){
  if(!text) return '';
  const t = text.length > maxLen ? text.substring(0, maxLen) + '…' : text;
  const isArabic = /[\u0600-\u06FF]/.test(t);
  if(isArabic){
    return t.split(' ').map(w => isAllergenAr(w) ? `<span class="alg">${esc(w)}</span>` : esc(w)).join(' ');
  }
  return esc(t).replace(/(\b[A-Z]{3,}\b)/g, w => isAllergen(w) ? `<span class="alg">${w}</span>` : w);
}

/* ── Rendu de la liste (recherche + pagination) ────────────────────── */
export function renderBase(page){
  if(page !== undefined) currentPage = page;
  const q = ($('#baseSearch')?.value || '').toLowerCase().trim();
  const body = $('#baseBody');
  if(!body) return;
  body.innerHTML = '';

  const filtered = state.base.filter(p =>
    !q ||
    p.code.includes(q) ||
    (p.designation_fr || '').toLowerCase().includes(q) ||
    (p.designation_ar || '').includes(q)
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  if(currentPage >= totalPages) currentPage = totalPages - 1;
  if(currentPage < 0) currentPage = 0;

  const empty = $('#baseEmpty');
  if(empty) empty.style.display = filtered.length ? 'none' : '';

  renderPager(filtered.length, totalPages);

  const pageItems = filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);
  const frag = document.createDocumentFragment();
  pageItems.forEach(p => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="mono" style="font-size:12px">${esc(p.code)}</td>
      <td style="font-weight:600">${esc(p.designation_fr)}</td>
      <td class="ar" style="font-size:12px">${esc(p.designation_ar || '')}</td>
      <td><div class="ing-preview">${renderIngHtml(p.ingredients_fr || '', 48)}</div></td>
      <td class="ar" style="font-size:12px;direction:rtl">${esc((p.ingredients_ar || '').substring(0, 40))}</td>
      <td style="font-size:12px">${esc(p.origine || '')}</td>
      <td style="font-size:11px">${esc(p.col_j || '')}</td>
      <td style="font-size:11px">${esc(p.col_h || '')}</td>
      <td style="white-space:nowrap">
        <button class="btn btn-ghost btn-sm" data-edit-code="${esc(p.code)}"><i class="ri-edit-line"></i></button>
        <button class="btn btn-danger btn-sm" data-delete-code="${esc(p.code)}"><i class="ri-delete-bin-line"></i></button>
      </td>`;
    frag.appendChild(tr);
  });
  body.appendChild(frag);

  const hdrBase = $('#hdrBase');
  if(hdrBase) hdrBase.textContent = 'Base: ' + state.base.length;
}

function renderPager(total, totalPages){
  const pager = $('#basePager');
  if(!pager) return;
  if(total === 0){ pager.innerHTML = ''; pager.style.display = 'none'; return; }
  if(total <= PAGE_SIZE){
    pager.innerHTML = `<div style="font-size:11px;color:var(--text-3);padding:4px 0">${total} article(s)</div>`;
    pager.style.display = 'block';
    return;
  }
  const from = currentPage * PAGE_SIZE + 1;
  const to = Math.min(from + PAGE_SIZE - 1, total);
  pager.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:12px;color:var(--text-3);padding:6px 0">
      <span style="color:var(--amber);font-weight:700">${total} articles</span>
      <span>· Affichage ${from}–${to}</span>
      <div style="display:flex;gap:4px;margin-left:auto">
        <button class="btn btn-ghost btn-sm" data-page="0" ${currentPage === 0 ? 'disabled' : ''}>⏮</button>
        <button class="btn btn-ghost btn-sm" data-page="${currentPage - 1}" ${currentPage === 0 ? 'disabled' : ''}>‹</button>
        <span style="padding:4px 8px;background:var(--surf-3);border-radius:6px;font-weight:700">${currentPage + 1} / ${totalPages}</span>
        <button class="btn btn-ghost btn-sm" data-page="${currentPage + 1}" ${currentPage >= totalPages - 1 ? 'disabled' : ''}>›</button>
        <button class="btn btn-ghost btn-sm" data-page="${totalPages - 1}" ${currentPage >= totalPages - 1 ? 'disabled' : ''}>⏭</button>
      </div>
    </div>`;
  pager.style.display = 'block';
}

/* ── Modale Article (ajout / édition) ──────────────────────────────── */
const FIELDS = ['m_code', 'm_desFR', 'm_desAR', 'm_ing', 'm_ing_ar', 'm_origine', 'm_colJ', 'm_colH'];

export function openArticleModal(code = null){
  editingCode = code;
  const title = $('#modalTitle');
  if(title) title.textContent = code ? 'Modifier Article' : 'Nouvel Article';

  if(code){
    const p = state.base.find(x => x.code === code);
    if(!p) return;
    $('#m_code').value = p.code;
    $('#m_desFR').value = p.designation_fr;
    $('#m_desAR').value = p.designation_ar || '';
    $('#m_ing').value = p.ingredients_fr || '';
    $('#m_ing_ar').value = p.ingredients_ar || '';
    $('#m_origine').value = p.origine || '';
    $('#m_colJ').value = p.col_j || '';
    $('#m_colH').value = p.col_h || '';
    $('#m_code').readOnly = true;
  } else{
    FIELDS.forEach(id => { const el = $('#' + id); if(el) el.value = ''; });
    $('#m_code').readOnly = false;
  }
  openModal('articleModal');
}

export function closeArticleModal(){
  closeModal('articleModal');
  editingCode = null;
}

export function saveArticle(){
  const code = $('#m_code').value.trim();
  if(!code){ toast('Code requis', 'err'); return; }
  const art = {
    code,
    designation_fr: $('#m_desFR').value.trim(),
    designation_ar: $('#m_desAR').value.trim(),
    ingredients_fr: $('#m_ing').value.trim(),
    ingredients_ar: $('#m_ing_ar').value.trim(),
    origine: $('#m_origine').value.trim(),
    col_j: $('#m_colJ').value.trim(),
    col_h: $('#m_colH').value.trim(),
  };
  if(editingCode){
    const i = state.base.findIndex(x => x.code === editingCode);
    if(i >= 0) state.base[i] = art;
  } else{
    if(state.base.find(x => x.code === code)){ toast('Code déjà existant', 'err'); return; }
    state.base.push(art);
  }
  save('base');
  renderBase();
  closeArticleModal();
  toast(editingCode ? 'Article modifié' : 'Article ajouté', 'ok');
}

export function deleteArticle(code){
  if(!confirm(`Supprimer l'article ${code} ?`)) return;
  state.base = state.base.filter(p => p.code !== code);
  save('base');
  renderBase();
  toast('Article supprimé');
}

export function clearBaseConfirm(){
  if(!confirm(`Vider toute la base (${state.base.length} articles) ? Cette action est irréversible.`)) return;
  state.base = [];
  save('base');
  renderBase();
  toast('Base vidée');
}

/* ── Import Excel (colonnes A→H : Code, DésigFR, DésigAR, IngFR, IngAR, Origine, ColJ, ColH) */
export function importBaseExcel(input){
  const file = input.files[0];
  if(!file) return;
  input.value = '';

  if(typeof XLSX === 'undefined'){
    toast('Bibliothèque Excel non chargée (XLSX)', 'err');
    return;
  }

  toast('⏳ Lecture du fichier Excel…', 'info');
  const reader = new FileReader();
  reader.onload = e => {
    try{
      const wb = XLSX.read(new Uint8Array(e.target.result), { type:'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { header:1, defval:'', raw:false });

      let added = 0, updated = 0, skipped = 0;
      for(let i = 1; i < rows.length; i++){
        const r = rows[i];
        const code = String(r[0] || '').trim();
        if(!code){ skipped++; continue; }
        const art = {
          code,
          designation_fr: String(r[1] || '').trim(),
          designation_ar: String(r[2] || '').trim(),
          ingredients_fr: String(r[3] || '').trim(),
          ingredients_ar: String(r[4] || '').trim(),
          origine:        String(r[5] || '').trim(),
          col_j:          String(r[6] || '').trim(),
          col_h:          String(r[7] || '').trim(),
        };
        const idx = state.base.findIndex(x => x.code === code);
        if(idx >= 0){ state.base[idx] = art; updated++; } else{ state.base.push(art); added++; }
      }

      save('base');
      renderBase();
      toast(`✅ Import : ${added} ajoutés, ${updated} mis à jour${skipped ? ', ' + skipped + ' ignorés' : ''}`, 'ok');
    }catch(err){
      console.error('[base] import Excel:', err);
      toast('❌ Erreur Excel : ' + err.message, 'err');
    }
  };
  reader.readAsArrayBuffer(file);
}

export function exportBaseExcel(){
  if(!state.base.length){ toast('Base vide', 'err'); return; }
  if(typeof XLSX === 'undefined'){ toast('Bibliothèque Excel non chargée (XLSX)', 'err'); return; }

  const rows = [['Code', 'Désignation FR', 'Désignation AR', 'Ingrédients FR', 'Ingrédients AR', 'Origine', 'Col J', 'Col H']];
  state.base.forEach(p => rows.push([p.code, p.designation_fr, p.designation_ar, p.ingredients_fr, p.ingredients_ar || '', p.origine, p.col_j, p.col_h]));
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Base_Donnees_A7');
  XLSX.writeFile(wb, `Base_Donnees_A7_${new Date().toISOString().slice(0, 10)}.xlsx`);
  toast('Base exportée', 'ok');
}

/* ── Câblage des événements de l'onglet Base ──────────────────────────── */
export function initBaseTab(){
  $('#baseSearch')?.addEventListener('input', () => { currentPage = 0; renderBase(); });
  $('#btnNewArticle')?.addEventListener('click', () => openArticleModal());
  $('#btnExportBase')?.addEventListener('click', exportBaseExcel);
  $('#btnClearBase')?.addEventListener('click', clearBaseConfirm);
  $('#importBaseFile')?.addEventListener('change', e => importBaseExcel(e.target));
  $('#btnSaveArticle')?.addEventListener('click', saveArticle);
  $('#btnCloseArticleModal')?.addEventListener('click', closeArticleModal);

  // Délégation pour édition/suppression (lignes générées dynamiquement)
  $('#baseBody')?.addEventListener('click', e => {
    const editBtn = e.target.closest('[data-edit-code]');
    if(editBtn){ openArticleModal(editBtn.dataset.editCode); return; }
    const delBtn = e.target.closest('[data-delete-code]');
    if(delBtn){ deleteArticle(delBtn.dataset.deleteCode); }
  });

  // Pagination (déléguée aussi)
  $('#basePager')?.addEventListener('click', e => {
    const btn = e.target.closest('[data-page]');
    if(btn) renderBase(Number(btn.dataset.page));
  });
}
