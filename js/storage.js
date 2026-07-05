// ══════════════════════════════════════════════════════════════
// STORAGE.JS — Persistance IndexedDB
// Génération A7 · Marjane Tanger Médina
// ══════════════════════════════════════════════════════════════
// Unifie ce qui était DEUX implémentations IndexedDB concurrentes
// dans le monolithe d'origine (marjane_db + un second store séparé
// pour une autre fonctionnalité). Une seule base, un seul point
// d'accès, utilisé par state.js.
//
// Stores :
//   base       — articles de la base produits   (keyPath: 'code')
//   history    — historique des générations A7  (auto-incrément)
//   a4_history — historique des générations A4  (auto-incrément)
//   templates  — images de fond base64          (keyPath: 'name')
//   kv         — clé/valeur générique (migrations, réglages divers)
// ══════════════════════════════════════════════════════════════

const IDB_NAME    = 'marjane_db';
const IDB_VERSION = 1;
let   _dbPromise  = null;

function openIDB(){
  if(_dbPromise) return _dbPromise;
  _dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if(!db.objectStoreNames.contains('base'))       db.createObjectStore('base', { keyPath:'code' });
      if(!db.objectStoreNames.contains('history'))    db.createObjectStore('history', { autoIncrement:true });
      if(!db.objectStoreNames.contains('a4_history')) db.createObjectStore('a4_history', { autoIncrement:true });
      if(!db.objectStoreNames.contains('templates'))  db.createObjectStore('templates', { keyPath:'name' });
      if(!db.objectStoreNames.contains('kv'))         db.createObjectStore('kv');
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror   = (e) => reject(e.target.error);
  });
  return _dbPromise;
}

/* ── Clé/valeur générique (store "kv") ─────────────────────────── */

export async function idbGet(key){
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction('kv','readonly').objectStore('kv').get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

export async function idbSet(key, value){
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction('kv','readwrite').objectStore('kv').put(value, key);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}

/* ── Opérations sur un store nommé (base / history / templates…) ─ */

export async function idbGetAll(storeName){
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction(storeName,'readonly').objectStore(storeName).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}

// Remplace tout le contenu d'un store (vide puis réécrit).
export async function idbPutAll(storeName, items){
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(storeName,'readwrite');
    const store = tx.objectStore(storeName);
    store.clear();
    items.forEach(item => store.put(item));
    tx.oncomplete = () => resolve();
    tx.onerror    = () => reject(tx.error);
  });
}

// Ajoute/modifie un seul enregistrement sans vider le store.
export async function idbPutOne(storeName, item){
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction(storeName,'readwrite').objectStore(storeName).put(item);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}

export async function idbDelete(storeName, key){
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const req = db.transaction(storeName,'readwrite').objectStore(storeName).delete(key);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}

/* ── Migration ponctuelle localStorage → IndexedDB ────────────────
   S'exécute une seule fois (marqueur '_migrated_v5' dans le store
   kv), pour les utilisateurs qui viennent de l'ancienne version de
   l'app où tout vivait dans localStorage.                          */
export async function migrateFromLocalStorage(){
  const already = await idbGet('_migrated_v5');
  if(already) return;

  console.log('[storage] Migration localStorage → IndexedDB…');

  try{
    const raw = localStorage.getItem('a7_base');
    if(raw){
      const arr = JSON.parse(raw);
      if(arr.length) await idbPutAll('base', arr);
      console.log('[storage] Base migrée :', arr.length, 'articles');
    }
  }catch(e){ console.warn('[storage] migration base:', e); }

  try{
    const raw = localStorage.getItem('a7_history');
    if(raw){
      const arr = JSON.parse(raw);
      if(arr.length) await idbPutAll('history', arr);
      console.log('[storage] Historique A7 migré :', arr.length, 'entrées');
    }
  }catch(e){ console.warn('[storage] migration historique A7:', e); }

  try{
    const raw = localStorage.getItem('a4_history');
    if(raw){
      const arr = JSON.parse(raw);
      if(arr.length) await idbPutAll('a4_history', arr);
      console.log('[storage] Historique A4 migré :', arr.length, 'entrées');
    }
  }catch(e){ console.warn('[storage] migration historique A4:', e); }

  try{
    const raw = localStorage.getItem('a7_templates');
    if(raw){
      const obj = JSON.parse(raw);
      const entries = Object.entries(obj).map(([name,data]) => ({ name, data }));
      if(entries.length) await idbPutAll('templates', entries);
      console.log('[storage] Templates migrés :', entries.length);
    }
  }catch(e){ console.warn('[storage] migration templates:', e); }

  await idbSet('_migrated_v5', true);
  console.log('[storage] Migration terminée ✓');
}

/* ── Estimation d'espace utilisé (pour l'écran Config) ───────────── */
export async function estimateStorageUsage(){
  if(navigator.storage?.estimate){
    const { usage, quota } = await navigator.storage.estimate();
    return { usageMB: (usage/1e6).toFixed(1), quotaMB: (quota/1e6).toFixed(0) };
  }
  return null;
}
