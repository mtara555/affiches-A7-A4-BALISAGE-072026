// ══════════════════════════════════════════════════════════════
// A4-CANVAS-RENDER.JS — Moteur de rendu de l'affichette A4
// Génération A7 · Marjane Tanger Médina
// ══════════════════════════════════════════════════════════════
// Contient une implémentation native du code-barres ID-39
// (Code 3 de 9, ISO/IEC 16388) — aucune dépendance externe.
//
// ⚠️ Note héritée du monolithe : le logo Marjane (MARJANE_LOGO_IMG)
// référence une constante `MARJANE_LOGO` qui n'était définie NULLE
// PART dans le fichier d'origine — le logo ne s'affichait donc
// jamais, silencieusement (fallback sur "aucune image chargée").
// Ci-dessous, `setMarjaneLogo(dataUrl)` permet de le fournir
// proprement si vous avez le fichier du logo ; sans lui, le rendu
// se comporte exactement comme avant (bandeau sans logo).
//
// Dépend de : rien (module autonome, pas d'import d'état)
// ══════════════════════════════════════════════════════════════

const A4_DIFF_RECT_DEFAULTS = { x:0.05, y:0.55, w:0.90, h:0.105 };

/* ── Logo Marjane (optionnel — voir note ci-dessus) ─────────────────── */
const marjaneLogoImg = new Image();
export function setMarjaneLogo(dataUrl){
  marjaneLogoImg.src = dataUrl || '';
}

/* ── Éclaircir/assombrir une couleur hex (pour le dégradé de fond) ──── */
function darkenHex(hex, amt){
  try{
    const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    return '#' + [Math.max(0, r - amt), Math.max(0, g - amt), Math.max(0, b - amt)]
      .map(x => x.toString(16).padStart(2, '0')).join('');
  }catch(e){ return hex; }
}

/* ── Texte multi-lignes centré (LTR) ─────────────────────────────────── */
function wrapText(ctx, text, x, y, maxW, lineH, maxLines){
  if(!text) return;
  const words = text.split(' ');
  let line = '', lines = [];
  for(const w of words){
    const t = line ? line + ' ' + w : w;
    if(ctx.measureText(t).width > maxW && line){
      lines.push(line); line = w;
      if(lines.length >= maxLines) break;
    } else{ line = t; }
  }
  if(line && lines.length < maxLines) lines.push(line);
  lines.forEach((l, i) => ctx.fillText(l, x, y + i * lineH));
}

/* ── Texte multi-lignes RTL (arabe) — canvas réordonne les glyphes ────── */
function wrapTextRTL(ctx, text, cx, y, maxW, lineH, maxLines){
  if(!text) return;
  const words = text.split(' ');
  let line = '', lines = [];
  for(const w of words){
    const t = line ? line + ' ' + w : w;
    if(ctx.measureText(t).width > maxW && line){
      lines.push(line); line = w;
      if(lines.length >= maxLines) break;
    } else{ line = t; }
  }
  if(line && lines.length < maxLines) lines.push(line);
  const savedAlign = ctx.textAlign, savedDir = ctx.direction;
  ctx.textAlign = 'center'; ctx.direction = 'rtl';
  lines.forEach((l, i) => ctx.fillText(l, cx, y + i * lineH));
  ctx.textAlign = savedAlign; ctx.direction = savedDir;
}

/* ── Code-barres ID-39 (Code 3 de 9) — implémentation native ─────────── */
const C39_PATTERNS = {
  '0':'NNNWWNWNN','1':'WNNWNNNNW','2':'NNWWNNNNW','3':'WNWWNNNNN',
  '4':'NNNWWNNNW','5':'WNNWWNNNN','6':'NNWWWNNNN','7':'NNNWNNWNW',
  '8':'WNNWNNWNN','9':'NNWWNNWNN',
  'A':'WNNNNWNNW','B':'NNWNNWNNW','C':'WNWNNWNNN','D':'NNNNNWWNW',
  'E':'WNNNNWWNN','F':'NNWNNWWNN','G':'NNNWNWWNW','H':'WNNWNWNNN',
  'I':'NNWWNWNNN','J':'NNNNNWWNN','K':'WNNNNNNWW','L':'NNWNNNNWW',
  'M':'WNWNNNNWN','N':'NNNNNWNNW','O':'WNNNNWNWN','P':'NNWNNWNWN',
  'Q':'NNNWNWNNW','R':'WNNWNWNNW','S':'NNWWNWNNW','T':'NNNWNWWNN',
  'U':'WWNNNNNNW','V':'NWWNNNNNN','W':'WWWNNNNNN','X':'NWNNWNNNW',
  'Y':'WWNNWNNNN','Z':'NWWNWNNNN',
  '-':'NWNNNNWNW','.':'WWNNNNWNN',' ':'NWWNNNWNN',
  '$':'NWNWNWNNN','/':'NWNNNWNWN','+':'NNNWNWNWN','%':'NWNWNNNWN',
  '*':'NWNNWNWNN', // start/stop uniquement
};
const NARROW = 1, WIDE = 3;

export function sanitizeCode39(str){
  return String(str).toUpperCase().split('').filter(c => c !== '*' && C39_PATTERNS[c] !== undefined).join('');
}

function calcWidthUnits39(clean){
  const encoded = '*' + clean + '*';
  let units = 0;
  for(const ch of encoded){
    const p = C39_PATTERNS[ch];
    if(!p) continue;
    for(const bit of p) units += (bit === 'W' ? WIDE : NARROW);
    units += NARROW; // séparateur inter-caractère
  }
  return Math.max(1, units - NARROW);
}

/** Dessine un code-barres ID-39 centré sur (cx, cy). */
export function drawCode39(ctx, text, cx, cy, barH, textH, color){
  if(!text) return;
  const clean = sanitizeCode39(String(text));
  if(!clean){
    ctx.save();
    ctx.fillStyle = '#ef4444';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('ID-39 : caractères invalides', cx, cy);
    ctx.restore();
    return;
  }
  const encoded = '*' + clean + '*';
  const totalUnits = calcWidthUnits39(clean);
  const unitPx = Math.max(1.0, barH / 40);
  const totalW = totalUnits * unitPx;

  let x = Math.round(cx - totalW / 2);
  const yTop = Math.round(cy - barH / 2);

  ctx.save();
  for(const ch of encoded){
    const pattern = C39_PATTERNS[ch];
    if(!pattern) continue;
    for(let i = 0; i < 9; i++){
      const wide = pattern[i] === 'W';
      const w = (wide ? WIDE : NARROW) * unitPx;
      if(i % 2 === 0){ // barre (index pair) ; espace (impair) = rien à dessiner
        ctx.fillStyle = color;
        ctx.fillRect(x, yTop, Math.max(1, Math.round(w)), barH);
      }
      x += w;
    }
    x += NARROW * unitPx;
  }

  if(textH > 4){
    ctx.fillStyle = color;
    ctx.font = 'bold ' + Math.round(textH) + 'px "IBM Plex Mono",monospace';
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText(clean, cx, Math.round(cy + barH / 2 + 3));
  }
  ctx.restore();
}

/* ── Rendu des éléments par-dessus le fond ────────────────────────────── */
function renderElements(ctx, W, H, data, els, pictos){
  if(!els) return;
  const sc = W / 420; // échelle par rapport au canvas de référence (420×594)
  ctx.save();

  /* Désignation FR */
  if(data.desFR && els.desFR){
    const e = els.desFR;
    ctx.fillStyle = e.color || '#FFF';
    ctx.font = `900 ${e.fs * sc}px 'BFMarjane','Barlow Condensed',sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 5 * sc;
    wrapText(ctx, data.desFR.toUpperCase(), W * 0.5, e.y * H, W * 0.92, e.fs * sc * 1.15, 2);
    ctx.shadowBlur = 0;
  }

  /* Désignation AR */
  if(data.desAR && els.desAR){
    const e = els.desAR;
    ctx.fillStyle = e.color || '#FFF';
    ctx.font = `900 ${e.fs * sc}px 'BFMarjane','IBM Plex Sans Arabic',sans-serif`;
    ctx.textAlign = 'right'; ctx.textBaseline = 'top'; ctx.direction = 'rtl';
    ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 4 * sc;
    wrapTextRTL(ctx, data.desAR, W * 0.5, e.y * H, W * 0.92, e.fs * sc * 1.3, 2);
    ctx.shadowBlur = 0; ctx.direction = 'ltr';
  }

  /* Prix barré */
  if(data.barre > 0 && els.prixBarre){
    const e = els.prixBarre;
    const intPart = Math.floor(data.barre);
    const decPart = Math.round((data.barre - intPart) * 100).toString().padStart(2, '0');
    const fzI = e.fs * sc, fzD = fzI * (e.decScale ?? 0.50);
    ctx.fillStyle = e.color || '#ffaaaa';
    ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
    ctx.font = `900 ${fzI}px 'BFMarjane','Barlow Condensed',sans-serif`;
    const iW = ctx.measureText(String(intPart)).width;
    ctx.font = `900 ${fzD}px 'BFMarjane','Barlow Condensed',sans-serif`;
    const decStr = ',' + decPart;
    const dW = ctx.measureText(decStr).width, dhW = ctx.measureText(' DH').width;
    const totalW = iW + dW + dhW;
    const bx = e.x * W, by = e.y * H;
    ctx.font = `900 ${fzI}px 'BFMarjane','Barlow Condensed',sans-serif`;
    ctx.fillText(String(intPart), bx, by);
    const decOffY = (fzI - fzD) * 0.3;
    ctx.font = `900 ${fzD}px 'BFMarjane','Barlow Condensed',sans-serif`;
    ctx.fillText(decStr + ' DH', bx + iW, by - decOffY);
    ctx.strokeStyle = e.color || '#ffaaaa'; ctx.lineWidth = 2.5 * sc;
    ctx.beginPath();
    ctx.moveTo(bx, by - fzI * 0.85);
    ctx.lineTo(bx + totalW, by + fzI * 0.05);
    ctx.stroke();
    ctx.textBaseline = 'middle';
  }

  /* Prix promo */
  if(data.promo > 0 && els.prixPromo){
    const e = els.prixPromo;
    const intPart = Math.floor(data.promo);
    const decPart = Math.round((data.promo - intPart) * 100).toString().padStart(2, '0');
    const cx = e.x * W, cy = e.y * H;
    const fzI = e.fs * sc, fzD = fzI * (e.decScale ?? 0.38);
    ctx.font = `900 ${fzI}px 'BFMarjane','Barlow Condensed',sans-serif`;
    const intW = ctx.measureText(String(intPart)).width;
    ctx.font = `900 ${fzD}px 'BFMarjane','Barlow Condensed',sans-serif`;
    const decStr = ',' + decPart;
    const dW = ctx.measureText(decStr).width, dhW = ctx.measureText(' DH').width;
    const totalW = intW + dW + dhW;
    const startX = cx - totalW / 2;
    const baseY = cy + fzI * 0.35;
    const decOffY = (fzI - fzD) * 0.3;
    ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 14 * sc;
    ctx.fillStyle = e.color || '#FFF';
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.font = `900 ${fzI}px 'BFMarjane','Barlow Condensed',sans-serif`;
    ctx.fillText(String(intPart), startX, baseY);
    ctx.font = `900 ${fzD}px 'BFMarjane','Barlow Condensed',sans-serif`;
    ctx.fillText(decStr + ' DH', startX + intW, baseY - decOffY);
    ctx.shadowBlur = 0; ctx.textBaseline = 'middle';
  }

  /* Économie (rectangle "وفر") */
  if(data.showDiff && data.diff > 0 && els.diff){
    const e = els.diff;
    const dr = data._diffRect || A4_DIFF_RECT_DEFAULTS;
    const rx = (e.diffRectX ?? dr.x) * W, ry = (e.diffRectY ?? dr.y) * H;
    const rw = (e.diffRectW ?? dr.w) * W, rh = (e.diffRectH ?? dr.h) * H;

    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.4)'; ctx.shadowBlur = 8 * sc;
    ctx.fillStyle = e.bgColor || '#C8102E';
    ctx.fillRect(rx, ry, rw, rh);
    ctx.restore();

    const fzD = e.fs * sc, fzDDec = fzD * (e.decScale ?? 0.50);
    const intPart = Math.floor(data.diff);
    const decPart = Math.round((data.diff - intPart) * 100).toString().padStart(2, '0');
    const cy = ry + rh / 2;
    ctx.font = `900 ${fzD}px 'BFMarjane','Barlow Condensed',sans-serif`;
    const iW = ctx.measureText(String(intPart)).width;
    ctx.font = `900 ${fzDDec}px 'BFMarjane','Barlow Condensed',sans-serif`;
    const dW = ctx.measureText(',' + decPart + ' DH').width;
    const startX = rx + rw / 2 - (iW + dW) / 2;
    const baseY = cy + fzD * 0.35, decOff = fzD * 0.35;
    ctx.fillStyle = e.color || '#FFE600';
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.font = `900 ${fzD}px 'BFMarjane','Barlow Condensed',sans-serif`;
    ctx.fillText(String(intPart), startX, baseY);
    ctx.font = `900 ${fzDDec}px 'BFMarjane','Barlow Condensed',sans-serif`;
    ctx.fillText(',' + decPart + ' DH', startX + iW, baseY - decOff);

    const wfrFz = rh * 0.38;
    ctx.font = `900 ${wfrFz}px 'BFMarjane','IBM Plex Sans Arabic',sans-serif`;
    ctx.fillStyle = e.color || '#FFE600';
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    ctx.fillText('وفر', rx + rw - 6 * sc, ry + rh / 2);
  }

  /* Fidélité */
  if(data.fidelite > 0 && data.promo > 0 && els.fidelite){
    const e = els.fidelite;
    const pct = parseFloat(String(data.fidelite).replace(',', '.')) || 0;
    const pts = data.promo * pct / 100;
    const ptsInt = Math.floor(pts), ptsDec = Math.round((pts - ptsInt) * 100).toString().padStart(2, '0');
    const fzI = e.fs * sc, fzD = fzI * (e.decScale ?? 0.45);
    const cx = e.x * W, cy = e.y * H;
    ctx.fillStyle = e.color || '#FFE600';
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.font = `900 ${fzI}px 'BFMarjane','Barlow Condensed',sans-serif`;
    const iW = ctx.measureText(String(ptsInt)).width;
    ctx.fillText(String(ptsInt), cx, cy);
    ctx.font = `900 ${fzD}px 'BFMarjane','Barlow Condensed',sans-serif`;
    ctx.fillText(',' + ptsDec, cx + iW, cy - fzI * 0.30);
    const dhX = cx + iW + ctx.measureText(',' + ptsDec).width + 3 * sc;
    ctx.fillText('DH', dhX, cy - fzI * 0.30);
    ctx.textBaseline = 'middle';
  }

  /* Code-barres ID-39 — zone fixe 5×2cm sur canevas A4 (420×594 = 210×297mm) */
  if(data.code && els.gencode){
    const e = els.gencode;
    const maxWPx = W * (50 / 210), maxHPx = H * (20 / 297);
    const codeStr = sanitizeCode39(String(data.code));
    if(codeStr){
      const totalUnits = calcWidthUnits39(codeStr);
      const unitPx = Math.min(maxWPx / totalUnits, maxHPx / 44);
      const realW = totalUnits * unitPx, barH = unitPx * 40, textH = unitPx * 4;
      const totalH = barH + textH + 4;
      const cx = Math.min(Math.max(e.x * W, realW / 2 + 6), W - realW / 2 - 6);
      const cy = Math.min(e.y * H, H - totalH / 2 - 4);

      ctx.save();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.roundRect(cx - realW / 2 - 4, cy - barH / 2 - 3, realW + 8, totalH + 2, 3);
      ctx.fill();
      ctx.restore();

      drawCode39(ctx, String(data.code), cx, cy, barH, textH, '#000000');
    }
  }

  /* Pictogramme (image 5×3cm) */
  if(data.picto && data.picto !== 'aucun' && els.picto){
    const e = els.picto;
    const picData = pictos.find(p => p.id === data.picto);
    if(picData?.dataUrl){
      const pw = (e.w || 0.20) * W, ph = pw * (3 / 5);
      const px = e.x * W - pw / 2, py = e.y * H - ph / 2;
      const img = new Image();
      img.onload = () => {
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.25)'; ctx.shadowBlur = 6;
        ctx.drawImage(img, px, py, pw, ph);
        ctx.restore();
      };
      img.src = picData.dataUrl;
    }
  }

  ctx.restore();
}

/**
 * Dessine l'affichette complète (fond dégradé + bandeau + éléments)
 * sur un canvas. `pictos` est passé explicitement (plutôt qu'importé
 * depuis a4State) pour que ce module reste autonome et testable.
 */
export function renderA4Canvas(canvas, data, tpl, pictos = []){
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  function paintBackground(){
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, tpl.bg || '#991b1b');
    grad.addColorStop(1, tpl.bg2 || darkenHex(tpl.bg || '#991b1b', 40));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    const isMarjane = tpl.logo === true;
    const isYellow = tpl.bg === '#FFE600' || tpl.bg === '#e6b800';
    ctx.fillStyle = isMarjane && isYellow ? 'rgba(26,77,160,0.9)' : isMarjane ? 'rgba(255,230,0,0.18)' : 'rgba(0,0,0,0.35)';
    ctx.fillRect(0, 0, W, H * 0.065);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = '900 12px "BFMarjane","Barlow Condensed",sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('MARJANE TANGER 08', W / 2, H * 0.034);

    if(isMarjane && marjaneLogoImg.complete && marjaneLogoImg.naturalWidth > 0){
      const lS = H * 0.082, lX = W * 0.04, lY = H * 0.078;
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.3)'; ctx.shadowBlur = 5;
      ctx.drawImage(marjaneLogoImg, lX, lY, lS, lS);
      ctx.restore();
      ctx.fillStyle = isYellow ? '#1a4da0' : '#FFFFFF';
      ctx.font = `900 ${H * 0.037}px "BFMarjane","Barlow Condensed",sans-serif`;
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.fillText('MARJANE', lX + lS + 8, lY + lS * 0.36);
      ctx.font = `900 ${H * 0.021}px "BFMarjane","Barlow Condensed",sans-serif`;
      ctx.fillStyle = isYellow ? '#0d2d6b' : '#FFE600';
      ctx.fillText('TANGER 08', lX + lS + 8, lY + lS * 0.68);
      ctx.fillStyle = isYellow ? 'rgba(26,77,160,0.12)' : 'rgba(255,230,0,0.10)';
      ctx.fillRect(0, H * 0.88, W, H * 0.12);
      const ls2 = H * 0.052;
      ctx.drawImage(marjaneLogoImg, W / 2 - ls2 / 2, H * 0.905, ls2, ls2);
    }
    if(!isMarjane){
      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      ctx.fillRect(0, H * 0.88, W, H * 0.12);
    }

    renderElements(ctx, W, H, data, tpl.els, pictos);
  }

  if(tpl.bgImg){
    const img = new Image();
    img.onload = () => { ctx.drawImage(img, 0, 0, W, H); renderElements(ctx, W, H, data, tpl.els, pictos); };
    img.onerror = paintBackground;
    img.src = tpl.bgImg;
  } else{
    paintBackground();
  }
}
