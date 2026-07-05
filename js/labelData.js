// ══════════════════════════════════════════════════════════════
// LABEL-DATA.JS — Données de calibration des étiquettes
// Génération A7 · Marjane Tanger Médina
// ══════════════════════════════════════════════════════════════
// Pur contenu de données (aucune logique). Séparé de canvasRender.js
// pour que la calibration d'un template (positions, tailles) se
// modifie sans toucher au moteur de dessin.
// ══════════════════════════════════════════════════════════════

// Liste complète des templates disponibles (remplit le <select> Template
// et sert de référence à findTemplate() pour valider la colonne H).
export const TEMPLATES_ALL = [
  'PAT','PAT_M','BOUL','B_AGN','B_FIL','B_FIL_MN','B_BCK',
  'B_VOL','B_VOL-MN','FROM','TRAIT','FROM_CAN','GLACE',
];

// Templates avec zone fidélité (Rectangle 11 du POTX)
export const SPECIAL_TPL = ['B_FIL', 'B_FIL_MN', 'FROM_CAN'];

// Templates sans affichage des ingrédients (vide = tous l'affichent)
export const NO_ING_TPL = [];

// Couleurs de secteur pour le rendu canvas sans image de fond
export const TPL_COLORS = {
  PAT:'#b45309', PAT_M:'#92400e', BOUL:'#d97706', B_AGN:'#7c3aed',
  B_FIL:'#1d4ed8', B_FIL_MN:'#1e3a8a', 'B_VOL-MN':'#7f1d1d',
  B_BCK:'#064e3b', B_VOL:'#991b1b', CHARC:'#9f1239',
  TRAIT:'#166534', CHARC_CAN:'#831843', FROM:'#1d4ed8',
};

/* ── Allergènes (14 groupes réglementaires UE) ─────────────────── */
export const ALLERGEN_GROUPS = [
  ['GLUTEN','BLÉ','BLE','ORGE','AVOINE','SEIGLE','ÉPEAUTRE','KAMUT',
   'gluten','blé','ble','orge','avoine','seigle','épeautre','kamut'],
  ['CRUSTACÉ','CRUSTACÉS','CRUSTACE','CRUSTACES','CREVETTE','CREVETTES',
   'CRABE','CRABES','HOMARD','LANGOUSTE',
   'crustacé','crustacés','crevette','crevettes','crabe','crabes','homard','langouste'],
  ['POISSON','POISSONS','SAUMON','THON','TRUITE',
   'poisson','poissons','saumon','thon','truite'],
  ['ŒUF','ŒUFS','OEUF','OEUFS','œuf','œufs','oeuf','oeufs'],
  ['LAIT','LAITIER','LAITIERS','FROMAGE','FROMAGES','BEURRE','CRÈME','CREME',
   'lait','laitier','laitiers','fromage','fromages','beurre','crème','creme'],
  ['ARACHIDE','ARACHIDES','CACAHUÈTE','CACAHUÈTES','CACAHUETE','CACAHUETES',
   'arachide','arachides','cacahuète','cacahuètes','cacahuete','cacahuetes'],
  ['SOJA','soja'],
  ['AMANDE','AMANDES','NOIX','NOISETTE','NOISETTES','CAJOU','PISTACHE','PISTACHES',
   'NOIX DE PÉCAN','NOIX DE PECAN','MACADAMIA',
   'amande','amandes','noix','noisette','noisettes','cajou','pistache','pistaches',
   'noix de pécan','noix de pecan','macadamia'],
  ['CÉLERI','CELERI','céleri','celeri'],
  ['MOUTARDE','moutarde'],
  ['SÉSAME','SESAME','SÉSAMES','SESAMES','sésame','sesame','sésames','sesames'],
  ['SULFITE','SULFITES','sulfite','sulfites'],
  ['LUPIN','LUPINS','lupin','lupins'],
  ['MOLLUSQUE','MOLLUSQUES','mollusque','mollusques'],
];
export const ALLERGEN_FLAT = ALLERGEN_GROUPS.flat();

export const ALLERGEN_FLAT_AR = [
  'الغلوتين','قمح','شعير','شوفان','جاودار',
  'قشريات','جمبري','كراب','سلطعون',
  'سمك','سلمون','تونة','تونا','أنشوجة',
  'بيض','بيضة',
  'حليب','لبن','جبن','جبنة','كريمة','زبدة','لاكتوز',
  'فول سوداني','فستق سوداني',
  'صويا','صوجا','فول الصويا','سويا',
  'مكسرات','لوز','جوز','بندق','كاجو','فستق',
  'كرفس','خردل','سمسم','طحينة','طحينية',
  'كبريتيت','سلفيت','ترمس','لوبيا',
  'رخويات','حبار','أخطبوط','محار',
];

/* ── Calibration par template — extraite du POTX A7_AVRIL2026 ──
   Toutes les coordonnées sont en fraction du canvas (0..1).
   Rectangle 6=DesigFR, 7=DesigAR, 9=Prix, 10=Unité,
   3=Allergènes, 4=Ingrédients, 11=Fidélité (slides 5,6,12)      */
export const DEFAULT_TPL_LAYOUT = {
  PAT: {
    yDesFR:0.2198, yDesAR:0.3190, fzDesFR:28, fzDesAR:20,
    priceY:0.4008, uniteX:0.97, uniteY:0.4008, fzUnite:16,
    ingY:0.7499, ingBoxW:214, ingBoxH:46, ingBoxX:3,
    ingArY:0.7881, ingArBoxH:44,
    fzIngFR:8, fzIngAR:7,
    fzPrixInt:52, fzPrixDec:16,
    allergyY:0.7261,
  },
  PAT_M: {
    yDesFR:0.2198, yDesAR:0.3190, fzDesFR:28, fzDesAR:20,
    priceY:0.4008, uniteX:0.97, uniteY:0.4008, fzUnite:16,
    ingY:0.7466, ingBoxW:214, ingBoxH:46, ingBoxX:3,
    ingArY:0.7829, ingArBoxH:44,
    fzIngFR:8, fzIngAR:7,
    fzPrixInt:52, fzPrixDec:16,
    allergyY:0.7181,
  },
  BOUL: {
    yDesFR:0.2198, yDesAR:0.3190, fzDesFR:28, fzDesAR:20,
    priceY:0.4008, uniteX:0.97, uniteY:0.4008, fzUnite:16,
    ingY:0.7532, ingBoxW:214, ingBoxH:46, ingBoxX:3,
    ingArY:0.7881, ingArBoxH:44,
    fzIngFR:8, fzIngAR:7,
    fzPrixInt:52, fzPrixDec:16,
    allergyY:0.7261,
  },
  B_AGN: {
    yDesFR:0.2822, yDesAR:0.3814, fzDesFR:28, fzDesAR:20,
    priceY:0.5502, uniteX:0.97, uniteY:0.5502, fzUnite:16,
    ingY:0.8606, ingBoxW:196, ingBoxH:40, ingBoxX:10,
    ingArY:0.9176, ingArBoxH:38,
    fzIngFR:8, fzIngAR:7,
    fzPrixInt:52, fzPrixDec:16,
    allergyY:0.8606,
  },
  B_FIL: {
    yDesFR:0.2629, yDesAR:0.3814, fzDesFR:26, fzDesAR:18,
    priceY:0.5346, uniteX:0.57, uniteY:0.5346, fzUnite:14,
    ingY:0.8579, ingBoxW:196, ingBoxH:40, ingBoxX:10,
    ingArY:0.9283, ingArBoxH:38,
    fzIngFR:8, fzIngAR:7,
    fzPrixInt:40, fzPrixDec:12,
    allergyY:0.8579,
    fidX:0.5960, fidY:0.5346, fidW:0.3767, fidH:0.2917,
    fzFidInt:24, fzFidDec:10,
    fidLabelArabicY:0.7191, fidRbhY:0.5785,
  },
  B_FIL_MN: {
    yDesFR:0.1996, yDesAR:0.3002, fzDesFR:26, fzDesAR:18,
    priceY:0.4008, uniteX:0.55, uniteY:0.4008, fzUnite:13,
    ingY:0.7675, ingBoxW:214, ingBoxH:44, ingBoxX:3,
    ingArY:0.8161, ingArBoxH:42,
    fzIngFR:8, fzIngAR:7,
    fzPrixInt:40, fzPrixDec:12,
    allergyY:0.7261,
    fidX:0.6024, fidY:0.4008, fidW:0.3546, fidH:0.2917,
    fzFidInt:24, fzFidDec:10,
    fidLabelArabicY:0.5860, fidRbhY:0.4255,
  },
  B_BCK: {
    yDesFR:0.2607, yDesAR:0.3629, fzDesFR:28, fzDesAR:20,
    priceY:0.5215, uniteX:0.97, uniteY:0.5215, fzUnite:16,
    ingY:0.8740, ingBoxW:196, ingBoxH:40, ingBoxX:10,
    ingArY:0.9430, ingArBoxH:38,
    fzIngFR:8, fzIngAR:7,
    fzPrixInt:52, fzPrixDec:16,
    allergyY:0.8740,
  },
  B_VOL: {
    yDesFR:0.2685, yDesAR:0.3649, fzDesFR:28, fzDesAR:20,
    priceY:0.5038, uniteX:0.97, uniteY:0.5052, fzUnite:16,
    ingY:0.8220, ingBoxW:196, ingBoxH:40, ingBoxX:10,
    ingArY:0.9114, ingArBoxH:38,
    fzIngFR:8, fzIngAR:7,
    fzPrixInt:52, fzPrixDec:16,
    allergyY:0.8220,
  },
  'B_VOL-MN': {
    yDesFR:0.2314, yDesAR:0.3190, fzDesFR:28, fzDesAR:20,
    priceY:0.4008, uniteX:0.97, uniteY:0.4008, fzUnite:16,
    ingY:0.7546, ingBoxW:214, ingBoxH:46, ingBoxX:3,
    ingArY:0.7921, ingArBoxH:44,
    fzIngFR:8, fzIngAR:7,
    fzPrixInt:52, fzPrixDec:16,
    allergyY:0.7261,
  },
  FROM: {
    yDesFR:0.2628, yDesAR:0.3549, fzDesFR:28, fzDesAR:20,
    priceY:0.4852, uniteX:0.97, uniteY:0.4838, fzUnite:16,
    ingY:0.8420, ingBoxW:196, ingBoxH:40, ingBoxX:10,
    ingArY:0.9430, ingArBoxH:38,
    fzIngFR:8, fzIngAR:7,
    fzPrixInt:52, fzPrixDec:16,
    allergyY:0.8420,
  },
  TRAIT: {
    yDesFR:0.2198, yDesAR:0.3190, fzDesFR:28, fzDesAR:20,
    priceY:0.4008, uniteX:0.97, uniteY:0.4008, fzUnite:16,
    ingY:0.7507, ingBoxW:214, ingBoxH:46, ingBoxX:3,
    ingArY:0.7917, ingArBoxH:44,
    fzIngFR:8, fzIngAR:7,
    fzPrixInt:52, fzPrixDec:16,
    allergyY:0.7261,
  },
  FROM_CAN: {
    yDesFR:0.2556, yDesAR:0.3348, fzDesFR:26, fzDesAR:18,
    priceY:0.4752, uniteX:0.56, uniteY:0.4752, fzUnite:13,
    ingY:0.8606, ingBoxW:196, ingBoxH:40, ingBoxX:10,
    ingArY:0.9257, ingArBoxH:38,
    fzIngFR:8, fzIngAR:7,
    fzPrixInt:40, fzPrixDec:12,
    allergyY:0.8606,
    fidX:0.5963, fidY:0.4752, fidW:0.3882, fidH:0.2917,
    fzFidInt:24, fzFidDec:10,
    fidLabelArabicY:0.6973, fidRbhY:0.5057,
  },
  GLACE: {
    yDesFR:0.3082, yDesAR:0.4132, fzDesFR:28, fzDesAR:20,
    priceY:0.6495, uniteX:0.97, uniteY:0.6489, fzUnite:16,
    ingY:0.75, ingBoxW:214, ingBoxH:46, ingBoxX:3,
    ingArY:0.80, ingArBoxH:44,
    fzIngFR:8, fzIngAR:7,
    fzPrixInt:52, fzPrixDec:16,
    allergyY:0.74,
  },
};
