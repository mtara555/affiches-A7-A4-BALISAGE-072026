// ══════════════════════════════════════════════════════════════
// PDF-EXPORT.JS — Génération du PDF A7
// Génération A7 · Marjane Tanger Médina
// ══════════════════════════════════════════════════════════════
// Contient les correctifs déjà validés en production :
//   - polyfill roundRect (voir canvasRender.js)
//   - crossOrigin='anonymous' sur les drapeaux (voir countryFlags.js),
//     sans quoi le canvas est "tainted" et toDataURL() lève une
//     SecurityError qui interrompt toute la génération.
//
// Dépend de : state.js, ui.js, canvasRender.js, countryFlags.js
// ══════════════════════════════════════════════════════════════

import { state } from './state.js';
import { toast } from './ui.js';
import { CW, CH, drawDefaultBg, drawLabelText, drawSignature } from './canvasRender.js';
import { preloadFlagsFor } from './countryFlags.js';

// Positions (mm) des 4 étiquettes A7 sur une page A4 portrait
const POSITIONS = [[5, 5], [79, 5], [5, 112], [79, 112]];
const LABEL_W = 74, LABEL_H = 105;

/**
 * Dessine une étiquette sur un canvas hors-écran et renvoie son
 * data-URL JPEG, prête à être insérée dans le PDF.
 */
async function renderItemToDataURL(item){
  const offCanvas = document.createElement('canvas');
  offCanvas.width = CW;
  offCanvas.height = CH;
  const ctx = offCanvas.getContext('2d');

  const tplImg = state.templates[item.template];
  if(tplImg){
    await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        try{
          ctx.drawImage(img, 0, 0, CW, CH);
          drawLabelText(ctx, item);
          resolve();
        }catch(errDraw){ reject(errDraw); }
      };
      img.onerror = () => reject(new Error(`Image de template introuvable pour "${item.template}"`));
      img.src = tplImg;
    });
  } else{
    drawDefaultBg(ctx, item.template);
    drawLabelText(ctx, item);
  }

  drawSignature(ctx, CW, CH);

  return offCanvas.toDataURL('image/jpeg', 0.92);
}

/**
 * Génère le PDF A7 pour toute la file d'attente courante
 * (4 étiquettes par page A4) et déclenche le téléchargement.
 */
export async function generatePDF(){
  if(!state.queue.length){ toast('File vide', 'err'); return; }
  toast('Génération PDF en cours…', 'info');

  try{
    await preloadFlagsFor(state.queue, 'origine');

    if(!window.jspdf || !window.jspdf.jsPDF){
      toast('jsPDF non chargé — vérifiez votre connexion', 'err');
      return;
    }
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation:'portrait', unit:'mm', format:'a4' });

    let idx = 0;
    for(const item of state.queue){
      if(idx > 0 && idx % 4 === 0) pdf.addPage();
      const [px, py] = POSITIONS[idx % 4];
      const imgData = await renderItemToDataURL(item);
      pdf.addImage(imgData, 'JPEG', px, py, LABEL_W, LABEL_H);
      idx++;
    }

    const totalPages = pdf.internal.getNumberOfPages();
    for(let p = 1; p <= totalPages; p++){
      pdf.setPage(p);
      pdf.setFontSize(6);
      pdf.setTextColor(160, 160, 160);
      pdf.text('A7 v2.1 · Marjane08 · Marjane Tanger 08 · ' + new Date().toLocaleDateString('fr-FR'), 5, 293);
      pdf.text(`Page ${p}/${totalPages}`, 200, 293, { align:'right' });
    }

    pdf.save(`Etiquettes_A7_${new Date().toISOString().slice(0, 10)}.pdf`);
    toast(`PDF généré — ${state.queue.length} étiquettes`, 'ok');
  }catch(errPdf){
    console.error('[pdfExport] erreur generatePDF:', errPdf);
    toast('Erreur génération PDF : ' + (errPdf?.message || errPdf), 'err');
  }
}
