// ══════════════════════════════════════════════════════════════
// COUNTRY-FLAGS.JS — Drapeaux pays (colonne "Origine")
// Génération A7 · Marjane Tanger Médina
// ══════════════════════════════════════════════════════════════
// Contient les deux correctifs déjà validés en production :
//   1. Clés sans accents (normalizeCountryStr retire les accents
//      du texte source AVANT de comparer aux clés — donc les clés
//      doivent aussi être sans accent, ex. 'union europeenne').
//   2. crossOrigin='anonymous' sur les images de drapeaux, sinon
//      le canvas devient "tainted" et toDataURL()/le PDF plantent.
// ══════════════════════════════════════════════════════════════

/* ── Table de correspondance Pays (FR, sans accents) → ISO 3166-1 alpha-2 */
export const COUNTRY_FLAGS = {
  'maroc':'ma','france':'fr','espagne':'es','italie':'it','portugal':'pt',
  'belgique':'be','pays-bas':'nl','hollande':'nl','allemagne':'de',
  'chine':'cn','turquie':'tr','egypte':'eg','tunisie':'tn','algerie':'dz',
  'mauritanie':'mr','senegal':'sn','cote d ivoire':'ci','mali':'ml',
  'bresil':'br','argentine':'ar','etats-unis':'us','usa':'us','etats unis':'us',
  'inde':'in','thailande':'th','vietnam':'vn','grece':'gr','pologne':'pl',
  'ukraine':'ua','russie':'ru','royaume-uni':'gb','royaume uni':'gb','uk':'gb',
  'angleterre':'gb','irlande':'ie','suisse':'ch','autriche':'at',
  'danemark':'dk','suede':'se','norvege':'no','finlande':'fi',
  'canada':'ca','mexique':'mx','chili':'cl','perou':'pe','colombie':'co',
  'equateur':'ec','australie':'au','nouvelle-zelande':'nz','nouvelle zelande':'nz',
  'japon':'jp','coree du sud':'kr','coree':'kr','indonesie':'id','malaisie':'my',
  'philippines':'ph','arabie saoudite':'sa','emirats arabes unis':'ae','eau':'ae',
  'qatar':'qa','jordanie':'jo','liban':'lb','israel':'il','iran':'ir',
  'pakistan':'pk','bangladesh':'bd','sri lanka':'lk','roumanie':'ro',
  'bulgarie':'bg','hongrie':'hu','republique tcheque':'cz','tchequie':'cz',
  'slovaquie':'sk','croatie':'hr','serbie':'rs','pays bas':'nl',
  'union europeenne':'eu','ue':'eu','union europeene':'eu',
};

/* ── Normalisation : minuscules, sans accents, apostrophes → espace ── */
export function normalizeCountryStr(s){
  return String(s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // retire les accents
    .replace(/[’']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/* ── Détecte un code ISO2 dans une chaîne "Origine" libre ─────────
   Gère les cas "France, Maroc" / "Maroc - Espagne" et les
   correspondances partielles (mot contenu dans le nom du pays).    */
export function getCountryCode(origineStr){
  const norm = normalizeCountryStr(origineStr);
  if(!norm) return null;

  if(COUNTRY_FLAGS[norm]) return COUNTRY_FLAGS[norm];

  const parts = norm.split(/,|\/|-| ou | et |&/).map(s => s.trim()).filter(Boolean);
  for(const p of parts){ if(COUNTRY_FLAGS[p]) return COUNTRY_FLAGS[p]; }

  for(const key in COUNTRY_FLAGS){
    if(norm.includes(key)) return COUNTRY_FLAGS[key];
  }
  return null;
}

/* ── Cache d'images de drapeaux (chargement async, redessine au besoin) */
const _flagImgCache = {};

/**
 * Retourne l'image du drapeau si déjà chargée, sinon lance le
 * chargement et appelle `onLoad` une fois prête (pour redessiner).
 * Ne jette jamais : si le CDN échoue, l'appelant reçoit simplement
 * `null` et peut ignorer le drapeau sans casser tout le rendu.
 */
export function getFlagImage(code, onLoad){
  if(!code) return null;
  const key = code.toLowerCase();
  let entry = _flagImgCache[key];

  if(!entry){
    entry = { img:new Image(), loaded:false, error:false, callbacks:[] };
    entry.img.crossOrigin = 'anonymous'; // évite de "tainter" le canvas (bloquerait toDataURL/PDF)
    entry.img.onload  = () => {
      entry.loaded = true;
      entry.callbacks.forEach(cb => { try{ cb(); } catch(e){ console.error('[countryFlags] callback:', e); } });
      entry.callbacks = [];
    };
    entry.img.onerror = () => { entry.error = true; };
    entry.img.src = `https://flagcdn.com/w80/${key}.png`;
    _flagImgCache[key] = entry;
  }

  if(entry.loaded) return entry.img;
  if(typeof onLoad === 'function' && !entry.error) entry.callbacks.push(onLoad);
  return null;
}

/**
 * Précharge tous les drapeaux nécessaires pour une liste d'articles
 * avant une génération PDF, pour éviter que le premier rendu de
 * chaque étiquette n'attende le réseau. Résout toujours (garde-fou
 * de 2,5s par drapeau si hors-ligne).
 */
export async function preloadFlagsFor(items, originField = 'origine'){
  const codes = new Set();
  items.forEach(it => {
    const c = getCountryCode(it[originField]);
    if(c) codes.add(c);
  });
  await Promise.all([...codes].map(code => new Promise(resolve => {
    const img = getFlagImage(code, resolve);
    if(img) resolve();
    setTimeout(resolve, 2500);
  })));
}
