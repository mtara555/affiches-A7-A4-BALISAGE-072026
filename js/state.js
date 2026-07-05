// ══════════════════════════════════════════════════════════════
// STATE.JS — État global de l'application
// Génération A7 · Marjane Tanger Médina
// ══════════════════════════════════════════════════════════════
// Point d'entrée unique pour lire/écrire les données de l'appli.
// Les collections volumineuses (base, historique, templates)
// vivent dans IndexedDB via storage.js ; les réglages légers
// (file d'attente, mapping, couleurs) vivent dans localStorage.
//
// Dépend de : storage.js (créé à l'étape suivante)
// ══════════════════════════════════════════════════════════════

import { idbGetAll, idbPutAll, migrateFromLocalStorage } from './storage.js';

/* ── Valeurs par défaut ─────────────────────────────────────── */

export const DEFAULT_MAPPING = [
  { prefix:'2658', template:'FROM',    label:'Fromages affinés' },
  { prefix:'265',  template:'FROM',    label:'Fromages' },
  { prefix:'267',  template:'PAT',     label:'Pâtisserie' },
  { prefix:'2675', template:'PAT',     label:'Viennoiserie' },
  { prefix:'269',  template:'BOUL',    label:'Boulangerie' },
  { prefix:'268',  template:'CHARC',   label:'Charcuterie' },
  { prefix:'266',  template:'TRAIT',   label:'Traiteur' },
  { prefix:'264',  template:'POISSON', label:'Poisson' },
  { prefix:'263',  template:'B_VOL',   label:'Boucherie Volaille' },
  { prefix:'262',  template:'B_AGN',   label:'Boucherie Agneau' },
];

export const DEFAULT_TEXT_COLORS = {
  designation:'#FFFFFF', designationNoBg:'#111111',
  prix:'#8B0000',        prixNoBg:'#000000',
  unite:'#F5E6C8',       uniteNoBg:'#333333',
  ingredientsFr:'#FFFFFF', ingredientsFrNoBg:'#000000',
  ingredientsAr:'#F5E6C8', ingredientsArNoBg:'#000000',
  allergen:'#FF0000',
};

/* ── Lecture localStorage sécurisée (jamais de crash au démarrage) */
function readLocal(key, fallback){
  try{
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  }catch(e){
    console.warn('[state] localStorage corrompu pour', key, e);
    return fallback;
  }
}

/* ── État global ────────────────────────────────────────────── */
// Collections lourdes (base/history/templates) démarrent vides et
// sont peuplées par loadStateFromStorage() au chargement de l'app.
export const state = {
  base:       [],
  history:    [],
  templates:  {},

  queue:      readLocal('a7_queue', []),
  mapping:    readLocal('a7_mapping', null) || structuredClone(DEFAULT_MAPPING),
  productTpl: readLocal('a7_product_tpl', {}),
  tplLayout:  readLocal('a7_tplLayout', {}),
  textColors: readLocal('a7_text_colors', null) || structuredClone(DEFAULT_TEXT_COLORS),
};

/* ── Abonnement aux changements (pattern pub/sub léger) ───────
   Permet à l'UI de se mettre à jour sans dépendre d'appels directs
   éparpillés (ex: renderQueue(), renderBase() dispersés partout).
   Usage : const unsub = subscribe('queue', () => renderQueue());   */
const listeners = new Map(); // clé d'état → Set de callbacks

export function subscribe(key, callback){
  if(!listeners.has(key)) listeners.set(key, new Set());
  listeners.get(key).add(callback);
  return () => listeners.get(key)?.delete(callback);
}

function notify(key){
  listeners.get(key)?.forEach(cb => {
    try{ cb(state[key]); }
    catch(e){ console.error('[state] erreur listener pour', key, e); }
  });
}

/* ── Sauvegarde ────────────────────────────────────────────────
   save('base' | 'history' | 'templates') → IndexedDB
   save('queue' | 'mapping' | 'productTpl' | 'tplLayout' | 'textColors') → localStorage
   Émet aussi une notification pour les abonnés UI.               */
export async function save(key){
  notify(key);

  if(key === 'base'){
    try{
      await idbPutAll('base', state.base);
    }catch(e){ console.error('[state] save base:', e); }
    return;
  }
  if(key === 'history'){
    try{
      await idbPutAll('history', state.history);
    }catch(e){ console.error('[state] save history:', e); }
    return;
  }
  if(key === 'templates'){
    try{
      const entries = Object.entries(state.templates).map(([name,data]) => ({ name, data }));
      await idbPutAll('templates', entries);
    }catch(e){ console.error('[state] save templates:', e); }
    return;
  }

  // Clés légères → localStorage
  try{
    localStorage.setItem('a7_' + key, JSON.stringify(state[key]));
  }catch(e){
    console.warn('[state] quota localStorage dépassé pour', key, e);
    throw new Error('STORAGE_QUOTA'); // laisse l'appelant décider comment prévenir l'utilisateur
  }
}

/* ── Chargement initial depuis IndexedDB ───────────────────────
   À appeler une fois au démarrage (voir main.js). Migre aussi les
   anciennes données localStorage si l'utilisateur vient de la
   version précédente de l'app.                                    */
export async function loadStateFromStorage(){
  await migrateFromLocalStorage();

  const base = await idbGetAll('base');
  state.base = base || [];
  notify('base');

  const hist = await idbGetAll('history');
  state.history = (hist || []).sort((a,b) => new Date(b.savedAt) - new Date(a.savedAt));
  notify('history');

  const tplRows = await idbGetAll('templates');
  state.templates = {};
  (tplRows || []).forEach(r => { state.templates[r.name] = r.data; });
  notify('templates');
}

/* ── Réinitialisation ponctuelle (ex: bouton "réinitialiser mapping") */
export function resetMapping(){
  state.mapping = structuredClone(DEFAULT_MAPPING);
  save('mapping');
}
