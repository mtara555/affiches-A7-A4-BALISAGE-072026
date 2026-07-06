// ══════════════════════════════════════════════════════════════
// A4-STATE.JS — État de l'onglet A4 (affichette)
// Génération A7 · Marjane Tanger Médina
// ══════════════════════════════════════════════════════════════
// Contrairement à A7, les templates A4 ne sont pas des images de
// fond fixes mais des dégradés + une liste d'éléments positionnés
// en pourcentage du canvas (x/y de 0 à 1) — ce qui permet le
// concepteur par glisser-déposer (voir a4TemplateDesigner.js).
//
// Persistance : localStorage (comme le monolithe d'origine — le
// volume de données A4 reste faible, pas besoin d'IndexedDB ici,
// sauf pour l'historique qui est partagé avec storage.js).
// ══════════════════════════════════════════════════════════════

import { idbGetAll, idbPutAll } from './storage.js';

/* ── Éléments par défaut d'un template (positions en fraction 0..1) ── */
function defaultElements(){
  return {
    desFR:     { x:0.05, y:0.08, fs:34, color:'#FFFFFF' },
    desAR:     { x:0.95, y:0.16, fs:24, color:'#FFFFFF' },
    prixBarre: { x:0.28, y:0.33, fs:30, color:'#FFaaaa' },
    prixPromo: { x:0.50, y:0.47, fs:74, color:'#FFFFFF' },
    diff:      { x:0.05, y:0.58, fs:22, color:'#22c55e' },
    fidelite:  { x:0.05, y:0.65, fs:20, color:'#f59e0b' },
    gencode:   { x:0.50, y:0.91, fs:8,  color:'#FFFFFF' },
    picto:     { x:0.77, y:0.27, w:0.20, h:0.14 },
  };
}

export function buildDefaultA4Templates(){
  const base = defaultElements();
  return [
    { id:'MARJANE_BLEU',  name:'MARJANE BLEU',  bg:'#1a4da0', bg2:'#0d2d6b', bgImg:null, logo:true,  els:defaultElements() },
    { id:'MARJANE_JAUNE', name:'MARJANE JAUNE', bg:'#FFE600', bg2:'#e6b800', bgImg:null, logo:true,
      els:{ ...defaultElements(),
        prixPromo:{ x:0.50, y:0.47, fs:74, color:'#1a4da0' },
        desFR:    { x:0.05, y:0.08, fs:34, color:'#1a4da0' },
        desAR:    { x:0.95, y:0.16, fs:24, color:'#1a4da0' } } },
    { id:'PROMO_ROUGE',  name:'PROMO ROUGE',  bg:'#991b1b', bg2:'#7f1d1d', bgImg:null, logo:false, els:defaultElements() },
    { id:'PROMO_VERT',   name:'PROMO VERT',   bg:'#14532d', bg2:'#052e16', bgImg:null, logo:false, els:defaultElements() },
    { id:'PROMO_BLEU',   name:'PROMO BLEU',   bg:'#1e3a5f', bg2:'#1e1b4b', bgImg:null, logo:false, els:defaultElements() },
    { id:'PROMO_ORANGE', name:'PROMO ORANGE', bg:'#92400e', bg2:'#78350f', bgImg:null, logo:false,
      els:{ ...defaultElements(), prixPromo:{ x:0.50, y:0.47, fs:74, color:'#fef3c7' } } },
    { id:'PROMO_NOIR',   name:'PROMO NOIR',   bg:'#111827', bg2:'#030712', bgImg:null, logo:false, els:defaultElements() },
    { id:'PROMO_VIOLET', name:'PROMO VIOLET', bg:'#581c87', bg2:'#3b0764', bgImg:null, logo:false, els:defaultElements() },
  ];
}

function readLocal(key, fallback){
  try{
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  }catch(e){
    console.warn('[a4State] localStorage corrompu pour', key, e);
    return fallback;
  }
}

/* ── État du formulaire Saisie A4 ──────────────────────────────────── */
export const a4State = {
  code:'', desFR:'', desAR:'',
  barre:0, promo:0, fidelite:0,
  secteur:'food', picto:'aucun', tplId:'',
  diff:0, showDiff:false,
  file: readLocal('a4_file', []),
};

/* ── Templates & pictogrammes ───────────────────────────────────────── */
export let a4Templates = readLocal('a4_tpls', null) || buildDefaultA4Templates();
export let a4Pictos    = readLocal('a4_pictos', []);

export function setA4Templates(templates){
  a4Templates = templates;
  localStorage.setItem('a4_tpls', JSON.stringify(a4Templates));
}
export function setA4Pictos(pictos){
  a4Pictos = pictos;
  localStorage.setItem('a4_pictos', JSON.stringify(a4Pictos));
}

/* ── Persistance ────────────────────────────────────────────────────── */
export function saveA4Form(){
  localStorage.setItem('a4_form', JSON.stringify({
    code:a4State.code, desFR:a4State.desFR, desAR:a4State.desAR,
    barre:a4State.barre, promo:a4State.promo, fidelite:a4State.fidelite,
    secteur:a4State.secteur, picto:a4State.picto, tplId:a4State.tplId,
  }));
}

export function restoreA4Form(){
  const saved = readLocal('a4_form', {});
  Object.assign(a4State, {
    code:saved.code || '', desFR:saved.desFR || '', desAR:saved.desAR || '',
    barre:saved.barre || 0, promo:saved.promo || 0, fidelite:saved.fidelite || 0,
    secteur:saved.secteur || 'food', picto:saved.picto || 'aucun', tplId:saved.tplId || '',
  });
  return saved;
}

export function saveA4File(){
  localStorage.setItem('a4_file', JSON.stringify(a4State.file));
}

/* ── Historique A4 — partagé avec le store IndexedDB 'a4_history' ─────
   (voir storage.js — même mécanisme que l'historique A7)             */
let _a4HistoryCache = null;

export async function loadA4History(){
  const rows = await idbGetAll('a4_history');
  _a4HistoryCache = (rows || []).sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
  return _a4HistoryCache;
}

export function getA4History(){
  return _a4HistoryCache || [];
}

export async function pushA4History(item){
  _a4HistoryCache = _a4HistoryCache || [];
  _a4HistoryCache.unshift(item);
  if(_a4HistoryCache.length > 3000) _a4HistoryCache.length = 3000;
  await idbPutAll('a4_history', _a4HistoryCache);
}

export async function clearA4History(){
  _a4HistoryCache = [];
  await idbPutAll('a4_history', []);
}
