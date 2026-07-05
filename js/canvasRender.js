// ══════════════════════════════════════════════════════════════
// CANVAS-RENDER.JS — Moteur de dessin des étiquettes
// Génération A7 · Marjane Tanger Médina
// ══════════════════════════════════════════════════════════════
// Contient le correctif roundRect déjà validé en production.
// Dépend de : state.js, labelData.js, countryFlags.js
// ══════════════════════════════════════════════════════════════

import { state } from './state.js';
import {
  SPECIAL_TPL, NO_ING_TPL, TPL_COLORS, ALLERGEN_FLAT, ALLERGEN_FLAT_AR,
  DEFAULT_TPL_LAYOUT,
} from './labelData.js';
import { getCountryCode, getFlagImage } from './countryFlags.js';

/* ── Polyfill roundRect — absent sur Safari <16, certains WebViews
   Android et navigateurs anciens. Sans lui, ctx.roundRect() lève
   une exception non interceptée qui interrompt tout le dessin (et
   donc la génération PDF, sans fichier ni message d'erreur).       */
if(typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect){
  CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, r){
    let tl, tr, br, bl;
    if(typeof r === 'number'){ tl = tr = br = bl = r; }
    else if(Array.isArray(r)){ [tl, tr = tl, br = tr, bl = tr] = r; }
    else{ tl = tr = br = bl = 0; }
    this.moveTo(x + tl, y);
    this.lineTo(x + w - tr, y);
    this.arcTo(x + w, y, x + w, y + tr, tr);
    this.lineTo(x + w, y + h - br);
    this.arcTo(x + w, y + h, x + w - br, y + h, br);
    this.lineTo(x + bl, y + h);
    this.arcTo(x, y + h, x, y + h - bl, bl);
    this.lineTo(x, y + tl);
    this.arcTo(x, y, x + tl, y, tl);
    return this;
  };
}

/* ── Dimensions de l'étiquette A7 (74×105mm à 3px/mm) ─────────── */
export const S  = 3;
export const CW = 74 * S; // 222px
export const CH = 105 * S; // 315px

/* ── Prix ───────────────────────────────────────────────────────── */
export function fmtPrice(val){
  const n = parseFloat(String(val).replace(',', '.'));
  if(isNaN(n)) return '';
  return n.toFixed(2).replace('.', ',');
}

/* ── Détection d'allergènes (FR / AR) ─────────────────────────────── */
export function isAllergen(word){
  const w = word.toUpperCase().replace(/[^A-ZÉÀÈÊÎÔÛÙÏÜ]/g, '');
  return ALLERGEN_FLAT.some(a => w === a || w.startsWith(a));
}
export function isAllergenAr(word){
  const w = word.trim();
  if(!w) return false;
  return ALLERGEN_FLAT_AR.some(a => w === a || w.includes(a) || a.includes(w));
}

/* ── Choix du template pour un article (priorité colonne H > mapping
   par préfixe > inférence sur la désignation) ────────────────────── */
export function findTemplate(code, product, mapping, templatesAll){
  if(state.productTpl[code]) return state.productTpl[code];
  const colH = (product?.col_h || '').trim().toUpperCase();
  if(colH && templatesAll?.includes(colH)) return colH;
  const sorted = [...mapping].sort((a, b) => b.prefix.length - a.prefix.length);
  for(const m of sorted){ if(code.startsWith(m.prefix)) return m.template; }
  const d = (product?.designation_fr || '').toUpperCase();
  if(/FROMAGE|BRIE|CAMEMBERT|CHEVRE|ROULE|EMMENTAL|GOUDA|RACLETTE|FETA|EDAM/.test(d)) return 'FROM';
  if(/BAGUETTE|PAIN|CIABATTA|BOULANG/.test(d)) return 'BOUL';
  if(/CROISSANT|TARTE|ECLAIR|FLAN|PATISS|GATEAU|CAKE|MUFFIN|BRIOCHE/.test(d)) return 'PAT';
  if(/POULET|DINDE|VOLAILLE/.test(d)) return 'B_VOL';
  if(/AGNEAU|MOUTON/.test(d)) return 'B_AGN';
  if(/FILET/.test(d)) return 'B_FIL';
  if(/MERGUEZ|SAUCIS|KEFTA|CHORIZO/.test(d)) return 'CHARC';
  if(/TRAITEUR|SALADE|QUICHE|LASAGNE/.test(d)) return 'TRAIT';
  return 'PAT';
}

/* ── Désignation 2 lignes max, centrée, réduction auto si débordement */
function wrapDesCenter(ctx, text, cx, y, maxW, lineH, minFz, font900, initialFz){
  if(!text) return y;
  const words = text.split(' ');
  function buildLines(fz){
    ctx.font = font900(fz);
    const lines = [];
    let line = '';
    for(const w of words){
      const test = line ? line + ' ' + w : w;
      if(ctx.measureText(test).width > maxW && line){
        lines.push(line);
        line = w;
        if(lines.length >= 2){ line = ''; break; }
      } else{ line = test; }
    }
    if(line) lines.push(line);
    return lines;
  }
  let fz = (typeof initialFz === 'number' && initialFz > 0) ? initialFz : minFz;
  for(let iter = 0; iter < 60; iter++){
    const lines = buildLines(fz);
    const fits = lines.every(l => ctx.measureText(l).width <= maxW);
    if(fits || fz <= minFz){
      ctx.font = font900(fz);
      const finalLines = buildLines(fz);
      finalLines.forEach((l, i) => {
        ctx.textAlign = 'center';
        ctx.fillText(l, cx, y + i * lineH);
      });
      return y + finalLines.length * lineH;
    }
    fz -= 0.5;
  }
  return y;
}

/* ── Texte avec surlignage des allergènes en gras/rouge (FR) ──────── */
function drawAllergenText(ctx, text, x, y, maxW, fz, normalColor, allergenColor){
  if(!text) return y;
  const lineH = fz * 1.35;
  const words = text.split(/(\s+)/);
  let cx = x, cy = y;
  ctx.textBaseline = 'top';
  words.forEach(w => {
    if(/^\s+$/.test(w)){ cx += ctx.measureText(w).width; return; }
    const isAlg = isAllergen(w);
    ctx.font = isAlg ? `bold ${fz}px sans-serif` : `${fz}px sans-serif`;
    const ww = ctx.measureText(w).width;
    if(cx + ww > x + maxW){ cx = x; cy += lineH; }
    ctx.fillStyle = isAlg ? (allergenColor || '#FF0000') : (normalColor || '#111');
    ctx.fillText(w, cx, cy);
    cx += ww;
    ctx.font = `${fz}px sans-serif`;
    cx += ctx.measureText(' ').width * 0.3;
  });
  return cy + lineH;
}

/* ── Fond par défaut quand aucune image de template n'est chargée ─── */
export function drawDefaultBg(ctx, template){
  const color = TPL_COLORS[template] || '#1d2d44';
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, CW, CH);
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, CW, 36 * S / 3);
  ctx.fillStyle = '#fff';
  ctx.font = `bold ${8 * S / 3}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(template, CW / 2, 18 * S / 3);
  ctx.strokeStyle = color + '88';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, CW - 2, CH - 2);
}

/* ── Drapeau du pays d'origine (rectangle transparent, pas de fond) ─
   `redrawFn` est rappelé quand l'image finit de charger (pour
   redessiner l'étiquette une fois le drapeau disponible).           */
export function drawOrigineFlag(ctx, item, L, redrawFn){
  const code = getCountryCode(item.origine);
  if(!code) return;
  const x = CW * (L.drapX ?? 0.78);
  const y = CH * (L.drapY ?? 0.03);
  const w = CW * (L.drapW ?? 0.18);
  const h = CH * (L.drapH ?? 0.055);
  const img = getFlagImage(code, redrawFn);
  if(!img) return; // pas encore chargé — sera redessiné via redrawFn
  ctx.save();
  ctx.strokeStyle = 'rgba(0,0,0,0.15)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, w, h);
  ctx.drawImage(img, x, y, w, h);
  ctx.restore();
}

/* ── Signature discrète "Marjane08" en coin bas-droit ──────────────
   Auparavant dupliquée à l'intérieur de generatePDF() — maintenant
   partagée entre l'aperçu live et l'export PDF.                     */
export function drawSignature(ctx, cw, ch){
  ctx.save();
  const sig = 'Marjane08';
  const fz = Math.round(cw * 0.042);
  ctx.font = '600 ' + fz + 'px IBM Plex Mono, monospace';
  const tw = ctx.measureText(sig).width;
  const px = cw - tw - 10, py = ch - fz - 4;
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.roundRect(px - 4, py - 2, tw + 8, fz + 4, 3);
  ctx.fill();
  ctx.globalAlpha = 0.72;
  ctx.fillStyle = '#f5c518';
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  ctx.fillText(sig, px, py);
  ctx.globalAlpha = 1;
  ctx.restore();
}

/* ── Texte complet de l'étiquette : désignation, prix, ingrédients,
   fidélité, drapeau, code — tout ce qui se dessine PAR-DESSUS le
   fond (image de template ou fond par défaut).                     */
export function drawLabelText(ctx, item, canvas){
  const isSpecial = SPECIAL_TPL.includes(item.template);
  const hasIng = !NO_ING_TPL.includes(item.template);
  const m = S / 3; // 1mm

  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  const hasBg = !!state.templates[item.template];
  const TL = state.tplLayout[item.template] || {};
  const C = {
    designation:       TL.colDes      || state.textColors.designation,
    designationNoBg:   state.textColors.designationNoBg,
    prix:              TL.colPrix     || state.textColors.prix,
    prixNoBg:          state.textColors.prixNoBg,
    unite:             TL.colUnite    || state.textColors.unite,
    uniteNoBg:         state.textColors.uniteNoBg,
    ingredientsFr:     TL.colIngFr    || state.textColors.ingredientsFr,
    ingredientsFrNoBg: state.textColors.ingredientsFrNoBg,
    ingredientsAr:     TL.colIngAr    || state.textColors.ingredientsAr,
    ingredientsArNoBg: state.textColors.ingredientsArNoBg,
    allergen:          TL.colAllergen || state.textColors.allergen,
  };

  const L = Object.assign({}, DEFAULT_TPL_LAYOUT[item.template] || {}, state.tplLayout[item.template] || {});
  const yDesFR  = hasBg ? CH * (L.yDesFR ?? 0.18) : 14 * m;
  const yDesAR  = hasBg ? CH * (L.yDesAR ?? 0.28) : 23 * m;
  const priceY  = hasBg ? CH * (L.priceY ?? 0.82) : 33 * m;
  const priceX  = (hasBg && L.priceX != null) ? CW * L.priceX : null;
  const uniteX  = hasBg ? CW * (L.uniteX ?? 0.85) : CW / 2;
  const uniteY  = hasBg ? CH * (L.uniteY ?? 0.78) : CH * 0.75;

  const fzDesFR = hasBg ? (L.fzDesFR ?? 24) : 14 * m;
  const fzDesAR = hasBg ? (L.fzDesAR ?? 22) : 10 * m;
  const fzIngFR = hasBg ? (L.fzIngFR ?? 11) : 6 * m;
  const fzIngAR = hasBg ? (L.fzIngAR ?? 11) : 6 * m;
  const fzUnite = hasBg ? (L.fzUnite ?? 22) : 8 * m;

  const maxDesW = CW * 0.9;

  /* Désignation FR */
  ctx.fillStyle = hasBg ? C.designation : C.designationNoBg;
  const desFR = (item.designation_fr || '').substring(0, 60).toUpperCase();
  ctx.font = `900 ${fzDesFR}px 'BFMarjane', 'Barlow Condensed', sans-serif`;
  ctx.textBaseline = 'top';
  wrapDesCenter(ctx, desFR, CW / 2, yDesFR, maxDesW, fzDesFR * 1.2, 11,
    fz => `900 ${fz}px 'BFMarjane', 'Barlow Condensed', sans-serif`, fzDesFR);
  ctx.textAlign = 'left';

  /* Désignation AR (RTL) */
  if(item.designation_ar){
    ctx.fillStyle = hasBg ? C.designation : C.designationNoBg;
    const desAR = (item.designation_ar || '').substring(0, 60);
    ctx.font = `500 ${fzDesAR}px 'BFMarjane', 'IBM Plex Sans Arabic', sans-serif`;
    ctx.textBaseline = 'top';
    ctx.direction = 'rtl';
    wrapDesCenter(ctx, desAR, CW / 2, yDesAR, maxDesW, fzDesAR * 1.2, 10,
      fz => `500 ${fz}px 'BFMarjane', 'IBM Plex Sans Arabic', sans-serif`, fzDesAR);
    ctx.direction = 'ltr';
    ctx.textAlign = 'left';
  }

  /* Prix */
  const prix = fmtPrice(item.prix) || '--,--';
  const commaIdx = prix.indexOf(',');
  const intPart = commaIdx > 0 ? prix.substring(0, commaIdx) : prix;
  const decPart = commaIdx > 0 ? prix.substring(commaIdx) : ',00';
  const fzInt = hasBg ? (L.fzPrixInt ?? 68) : (isSpecial ? 32 * m : 40 * m);
  const fzDec = hasBg ? (L.fzPrixDec ?? 26) : (isSpecial ? 10 * m : 13 * m);

  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = hasBg ? C.prix : C.prixNoBg;
  ctx.font = `900 ${fzInt}px 'BFMarjane', 'Barlow Condensed', sans-serif`;
  const intW = ctx.measureText(intPart).width;
  ctx.font = `900 ${fzDec}px 'BFMarjane', 'Barlow Condensed', sans-serif`;
  const decW = ctx.measureText(decPart).width;
  const dhW = ctx.measureText(' dh').width;
  const totalW = intW + decW + dhW;
  const startX = (priceX != null) ? priceX : (CW - totalW) / 2;
  const baseY = priceY + fzInt * 0.8;
  ctx.font = `900 ${fzInt}px 'BFMarjane', 'Barlow Condensed', sans-serif`;
  ctx.fillText(intPart, startX, baseY);
  ctx.font = `900 ${fzDec}px 'BFMarjane', 'Barlow Condensed', sans-serif`;
  ctx.fillText(decPart, startX + intW, baseY - (fzInt - fzDec) * 0.3);
  ctx.fillText(' dh', startX + intW + decW, baseY - (fzInt - fzDec) * 0.3);

  /* Unité */
  ctx.textBaseline = 'middle';
  ctx.font = `900 ${fzUnite}px 'BFMarjane', 'Barlow Condensed', sans-serif`;
  ctx.fillStyle = hasBg ? C.unite : C.uniteNoBg;
  ctx.textAlign = hasBg ? 'right' : 'center';
  ctx.fillText((item.unite || 'PIÈCE').toUpperCase(), uniteX, uniteY);
  ctx.textAlign = 'left';

  /* Prix calculé au poids (secteurs "spéciaux") */
  if(isSpecial && item.grammage){
    const g = parseFloat(String(item.grammage).replace(',', '.'));
    const p = parseFloat(String(item.prix).replace(',', '.'));
    if(!isNaN(g) && !isNaN(p)){
      const calc = fmtPrice(p * g);
      ctx.font = `900 ${hasBg ? 18 : 8 * m}px 'BFMarjane', sans-serif`;
      ctx.fillStyle = '#1d4ed8';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(`× ${g}kg = ${calc} dh`, CW / 2, priceY + fzInt + 8);
      ctx.textAlign = 'left';
    }
  }

  /* Fidélité — Rectangle 11 (secteurs SPECIAL_TPL) ou badge discret ailleurs */
  const isFidSlide = SPECIAL_TPL.includes(item.template);
  if(isFidSlide && item.fidelite){
    const pct = parseFloat(String(item.fidelite).replace(',', '.'));
    const prixN = parseFloat(String(item.prix).replace(',', '.'));
    if(!isNaN(pct) && pct > 0 && !isNaN(prixN) && prixN > 0){
      const fidVal = prixN * pct / 100;
      const fidFmt = fidVal.toFixed(2).replace('.', ',');
      const commaI = fidFmt.indexOf(',');
      const fIntPart = commaI > 0 ? fidFmt.substring(0, commaI) : fidFmt;
      const fDecPart = (commaI > 0 ? fidFmt.substring(commaI) : ',00') + 'dh';

      const fX = (L.fidX ?? 0.60) * CW;
      const fY = (L.fidY ?? 0.48) * CH;
      const fW = (L.fidW ?? 0.38) * CW;
      const fH = (L.fidH ?? 0.29) * CH;
      const fzFInt = L.fzFidInt ?? 24;
      const fzFDec = L.fzFidDec ?? 10;

      if(!hasBg){
        ctx.save();
        ctx.fillStyle = 'rgba(0,68,151,0.12)';
        ctx.strokeStyle = 'rgba(0,68,151,0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(fX, fY, fW, fH, 6);
        ctx.fill(); ctx.stroke();
        ctx.restore();
      }

      ctx.save();
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = hasBg ? '#ffffff' : '#004497';
      ctx.font = '900 ' + fzFInt + 'px BFMarjane, Barlow Condensed, sans-serif';
      const iW = ctx.measureText(fIntPart).width;
      ctx.font = '900 ' + fzFDec + 'px BFMarjane, Barlow Condensed, sans-serif';
      const dW = ctx.measureText(fDecPart).width;
      const startFX = fX + (fW - (iW + dW)) / 2;
      const baseYF = fY + fH * 0.55 + fzFInt * 0.45;
      ctx.font = '900 ' + fzFInt + 'px BFMarjane, Barlow Condensed, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(fIntPart, startFX, baseYF);
      ctx.font = '900 ' + fzFDec + 'px BFMarjane, Barlow Condensed, sans-serif';
      ctx.fillText(fDecPart, startFX + iW, baseYF - (fzFInt - fzFDec) * 0.28);
      ctx.restore();

      ctx.save();
      ctx.font = 'bold ' + (fzFDec - 1) + 'px sans-serif';
      ctx.fillStyle = hasBg ? 'rgba(255,255,220,0.9)' : '#f59e0b';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(pct + '%', fX + 3, fY + 3);
      ctx.restore();
    }
  } else if(!isFidSlide && item.fidelite){
    const pct = parseFloat(String(item.fidelite).replace(',', '.'));
    const prixN = parseFloat(String(item.prix).replace(',', '.'));
    if(!isNaN(pct) && pct > 0 && !isNaN(prixN) && prixN > 0){
      const fidVal = prixN * pct / 100;
      const label = pct + '% = ' + fidVal.toFixed(2).replace('.', ',') + 'dh';
      ctx.save();
      ctx.font = 'bold 9px sans-serif';
      const tw = ctx.measureText(label).width + 10;
      const bx = CW - 3, by = CH * (L.allergyY ?? 0.72) - 14;
      ctx.fillStyle = 'rgba(245,158,11,0.15)';
      ctx.strokeStyle = 'rgba(245,158,11,0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(bx - tw, by - 6, tw, 14, 3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#f59e0b';
      ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      ctx.fillText(label, bx - 5, by + 1);
      ctx.restore();
    }
  }

  /* Ingrédients FR/AR avec auto-fit et rectangles blancs arrondis */
  if(hasIng){
    const minFz = hasBg ? 7 : 4 * m;
    const BOX_W = hasBg ? (L.ingBoxW ?? 211.5) : CW * 0.92;
    const BOX_H = hasBg ? (L.ingBoxH ?? 50.1) : 60 * m;
    const BOX_X = hasBg ? (L.ingBoxX ?? (CW - (L.ingBoxW ?? 211.5)) / 2) : CW * 0.04;
    const BOX_Y = hasBg ? CH * (L.ingY ?? 0.44) : CH * 0.42;
    const BOX_PAD_X = 5, BOX_PAD_Y = 4, BOX_R = 6;
    const maxW = BOX_W - BOX_PAD_X * 2;
    const startXIng = BOX_X + BOX_PAD_X;
    const textY = BOX_Y + BOX_PAD_Y;

    if(item.ingredients_fr && item.ingredients_fr.trim().length > 0){
      const ingText = item.ingredients_fr.trim();
      const maxH = BOX_H - BOX_PAD_Y * 2;

      ctx.save();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.roundRect(BOX_X, BOX_Y, BOX_W, BOX_H, BOX_R);
      ctx.fill();
      ctx.restore();

      let fz = fzIngFR;
      while(fz > minFz){
        ctx.font = `${fz}px sans-serif`;
        const lineH = fz * 1.25;
        const words = ingText.split(' ');
        let lines = 1, lineW = 0;
        for(const w of words){
          const ww = ctx.measureText(w + ' ').width;
          if(lineW + ww > maxW){ lines++; lineW = ww; } else{ lineW += ww; }
        }
        if(lines * lineH <= maxH) break;
        fz -= 0.5;
      }
      if(fz < minFz) fz = minFz;

      ctx.save();
      ctx.beginPath();
      ctx.roundRect(BOX_X, BOX_Y, BOX_W, BOX_H, BOX_R);
      ctx.clip();
      drawAllergenText(ctx, ingText, startXIng, textY, maxW, fz, '#222222', C.allergen);
      ctx.restore();
    }

    if(item.ingredients_ar && item.ingredients_ar.trim().length > 0){
      const ingText = item.ingredients_ar.trim();
      const BOX_AR_W = BOX_W;
      const BOX_AR_H = hasBg ? (L.ingArBoxH ?? 50) : 60 * m;
      const BOX_AR_X = BOX_X;
      const BOX_AR_Y = BOX_Y + BOX_H + 6;
      const maxWAR = BOX_AR_W - BOX_PAD_X * 2;
      const maxHAR = BOX_AR_H - BOX_PAD_Y * 2;
      const startXAR = BOX_AR_X + BOX_PAD_X;
      const textYAR = BOX_AR_Y + BOX_PAD_Y;

      ctx.save();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.roundRect(BOX_AR_X, BOX_AR_Y, BOX_AR_W, BOX_AR_H, BOX_R);
      ctx.fill();
      ctx.restore();

      let fz = fzIngAR;
      while(fz > minFz){
        ctx.font = `500 ${fz}px 'IBM Plex Sans Arabic','BFMarjane',sans-serif`;
        const lineH = fz * 1.35;
        const words = ingText.split(' ');
        let lines = 1, lineW = 0;
        for(const w of words){
          const ww = ctx.measureText(w + ' ').width;
          if(lineW + ww > maxWAR){ lines++; lineW = ww; } else{ lineW += ww; }
        }
        if(lines * lineH <= maxHAR) break;
        fz -= 0.5;
      }
      if(fz < minFz) fz = minFz;

      ctx.save();
      ctx.beginPath();
      ctx.roundRect(BOX_AR_X, BOX_AR_Y, BOX_AR_W, BOX_AR_H, BOX_R);
      ctx.clip();
      ctx.textBaseline = 'top';
      const wordsAR = ingText.split(' ');
      const rightXAR = startXAR + maxWAR;
      const lineHAR = fz * 1.35;
      const linesAR = [];
      let curLine = [], curLineW = 0;
      ctx.font = `500 ${fz}px 'IBM Plex Sans Arabic','BFMarjane',sans-serif`;
      for(const word of wordsAR){
        const ww = ctx.measureText(word).width;
        const spaceW = ctx.measureText(' ').width;
        if(curLine.length > 0 && curLineW + spaceW + ww > maxWAR){
          linesAR.push(curLine);
          curLine = [{ word, ww }];
          curLineW = ww;
        } else{
          if(curLine.length > 0) curLineW += spaceW;
          curLine.push({ word, ww });
          curLineW += ww;
        }
      }
      if(curLine.length > 0) linesAR.push(curLine);

      let cyAR = textYAR;
      for(const line of linesAR){
        if(cyAR > BOX_AR_Y + BOX_AR_H) break;
        let px = rightXAR;
        for(const { word, ww } of line){
          const isAlg = isAllergenAr(word);
          ctx.font = isAlg
            ? `bold ${fz}px 'IBM Plex Sans Arabic','BFMarjane',sans-serif`
            : `500 ${fz}px 'IBM Plex Sans Arabic','BFMarjane',sans-serif`;
          ctx.fillStyle = isAlg ? (C.allergen || '#FF0000') : (C.ingredientsAr || '#222222');
          ctx.textAlign = 'right';
          ctx.fillText(word, px, cyAR);
          const spaceW = ctx.measureText(' ').width;
          px -= (ww + spaceW);
        }
        cyAR += lineHAR;
      }
      ctx.restore();
      ctx.textAlign = 'left';
    }
  }

  /* Origine (texte, fond par défaut uniquement) */
  if(item.origine && !hasBg){
    ctx.font = `${7 * m}px sans-serif`;
    ctx.fillStyle = '#444';
    ctx.textBaseline = 'top';
    ctx.fillText('Origine: ' + item.origine, 4 * m, CH * 0.7);
  }

  /* Drapeau pays d'origine */
  if(item.origine){
    drawOrigineFlag(ctx, item, L, () => {
      if(canvas){ try{ drawLabel(canvas, item); } catch(e){ console.error('[canvasRender] redraw drapeau:', e); } }
    });
  }

  /* Code article en pied d'étiquette */
  ctx.font = `${hasBg ? 12 : 5.5 * m}px monospace`;
  ctx.fillStyle = hasBg ? '#F5E6C8' : '#888';
  ctx.textBaseline = 'top';
  ctx.textAlign = hasBg ? 'right' : 'left';
  ctx.fillText(item.code || '', hasBg ? CW - 8 : 4 * m, hasBg ? CH * 0.92 : CH - 10 * m);
  ctx.textAlign = 'left';
}

/* ── Dessin complet d'une étiquette sur un <canvas> (fond + texte) ──
   Utilisé pour l'aperçu live. Pour l'export PDF, voir pdfExport.js
   qui dessine sur un canvas hors-écran de la même façon.            */
export function drawLabel(canvas, item){
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, CW, CH);

  const tplImg = state.templates[item.template];
  if(tplImg){
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, CW, CH);
      drawLabelText(ctx, item, canvas);
      drawSignature(ctx, CW, CH);
    };
    img.onerror = () => {
      console.error('[canvasRender] image de template introuvable :', item.template);
      drawDefaultBg(ctx, item.template);
      drawLabelText(ctx, item, canvas);
      drawSignature(ctx, CW, CH);
    };
    img.src = tplImg;
  } else{
    drawDefaultBg(ctx, item.template);
    drawLabelText(ctx, item, canvas);
    drawSignature(ctx, CW, CH);
  }
}
