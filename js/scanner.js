// ══════════════════════════════════════════════════════════════
// SCANNER.JS — Scan de code-barres
// Génération A7 · Marjane Tanger Médina
// ══════════════════════════════════════════════════════════════
// Reprend la cascade de secours à 3 niveaux du monolithe d'origine,
// mais expose une API à base de Promise plutôt que des callbacks
// imbriqués — n'importe quel module peut faire :
//
//   const code = await scanBarcode();
//   if(code) $('#codeInput').value = code;
//
// Niveau 1 — Html5Qrcode : caméra live, la plus fiable, nécessite
//            un contexte sécurisé (https/localhost).
// Niveau 2 — BarcodeDetector natif (Chrome Android, Safari 17+) :
//            utilisé si Html5Qrcode échoue mais reste en contexte
//            sécurisé.
// Niveau 3 — Capture photo native (<input capture>) : seule méthode
//            qui fonctionne hors contexte sécurisé (file://, PWA
//            installée sans HTTPS) — ouvre l'appli caméra du
//            téléphone puis détecte le code sur la photo prise.
//
// Dépend de : ui.js
// Nécessite la lib externe Html5Qrcode chargée en <script> classique
// (optionnelle — les niveaux 2 et 3 fonctionnent sans elle).
// ══════════════════════════════════════════════════════════════

import { toast } from './ui.js';

function isSecureContext(){
  return window.isSecureContext ||
    location.protocol === 'https:' ||
    location.hostname === 'localhost' ||
    location.hostname === '127.0.0.1';
}

function removeOverlay(){
  document.getElementById('scanOverlay')?.remove();
}

/**
 * Lance le scan et résout avec le code détecté, ou `null` si annulé
 * / indisponible. Ne rejette jamais — toute erreur se traduit par
 * un toast et une résolution à `null`, pour que l'appelant n'ait
 * jamais besoin d'un try/catch.
 */
export async function scanBarcode(){
  if(!isSecureContext()){
    return scanViaFileCapture();
  }

  const boxW = Math.min(window.innerWidth - 40, 300);
  const boxH = Math.round(boxW * 0.5);

  if(typeof Html5Qrcode !== 'undefined'){
    const result = await scanViaHtml5Qrcode(boxW, boxH);
    if(result !== undefined) return result; // null = annulé volontairement, string = code
  } else{
    console.warn('[scanner] Html5Qrcode non chargée — repli sur BarcodeDetector natif');
  }

  return scanViaNativeDetector();
}

/* ── Niveau 1 : Html5Qrcode (caméra live) ─────────────────────────── */
function scanViaHtml5Qrcode(boxW, boxH){
  return new Promise(async resolve => {
    const overlay = document.createElement('div');
    overlay.id = 'scanOverlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.92);z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:16px';
    overlay.innerHTML = `
      <div style="width:100%;max-width:440px;background:#12100c;border:1px solid var(--border);border-radius:16px;padding:16px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
          <div style="font-weight:700;color:var(--amber)"><i class="ri-qr-scan-2-line"></i> Scanner Code-barres</div>
          <button id="closeScan" style="background:transparent;border:none;color:var(--text-3);font-size:22px;cursor:pointer"><i class="ri-close-line"></i></button>
        </div>
        <div id="qr-reader" style="width:100%;border-radius:12px;overflow:hidden;background:#000"></div>
        <div style="margin-top:10px;font-size:12px;color:var(--text-3);text-align:center">📷 Pointez la caméra vers le code-barres</div>
      </div>`;
    document.body.appendChild(overlay);

    let scanner = null;
    const safeStop = async () => { try{ await scanner?.stop(); }catch(_){} };

    try{
      scanner = new Html5Qrcode('qr-reader');
      await scanner.start(
        { facingMode:'environment' },
        {
          fps: 12,
          qrbox: { width:boxW, height:boxH },
          aspectRatio: 1.6,
          disableFlip: false,
          formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13, Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.CODE_128, Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.UPC_A, Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.QR_CODE,
          ],
        },
        async decodedText => {
          await safeStop();
          removeOverlay();
          resolve(decodedText.trim());
        },
        () => {}, // erreurs de frame — normal, on ignore
      );

      document.getElementById('closeScan').onclick = async () => {
        await safeStop();
        removeOverlay();
        resolve(null);
      };
    }catch(e){
      console.warn('[scanner] Html5Qrcode:', e);
      await safeStop();
      removeOverlay();
      if(e?.name === 'NotAllowedError' || (e?.message || '').toLowerCase().includes('permission')){
        toast('❌ Permission caméra refusée — activez-la dans les réglages du navigateur', 'err');
        resolve(null);
        return;
      }
      resolve(undefined); // undefined = échec technique → laisse scanBarcode() tenter le niveau 2
    }
  });
}

/* ── Niveau 2 : BarcodeDetector natif (Chrome Android, Safari 17+) ─── */
async function scanViaNativeDetector(){
  if(!('BarcodeDetector' in window)){
    toast('Scanner non disponible sur ce navigateur — saisissez le code manuellement', 'info');
    return null;
  }
  try{
    const supported = await BarcodeDetector.getSupportedFormats();
    const detector = new BarcodeDetector({ formats:supported });
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode:'environment', width:{ideal:1280}, height:{ideal:720} },
    });

    return await new Promise(resolve => {
      const overlay = document.createElement('div');
      overlay.id = 'scanOverlay';
      overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.92);z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:16px';
      overlay.innerHTML = `
        <div style="width:100%;max-width:440px;background:#12100c;border:1px solid var(--border);border-radius:16px;padding:16px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
            <div style="font-weight:700;color:var(--amber)"><i class="ri-qr-scan-2-line"></i> Scanner (mode natif)</div>
            <button id="closeScan2" style="background:transparent;border:none;color:var(--text-3);font-size:22px;cursor:pointer"><i class="ri-close-line"></i></button>
          </div>
          <video id="scanVideo" autoplay playsinline muted style="width:100%;border-radius:10px;background:#000;max-height:60vh"></video>
          <div style="margin-top:10px;font-size:12px;color:var(--text-3);text-align:center">📷 Pointez vers le code-barres</div>
        </div>`;
      document.body.appendChild(overlay);

      const video = document.getElementById('scanVideo');
      video.srcObject = stream;
      video.play();

      let scanning = true;
      const stopAll = () => {
        scanning = false;
        stream.getTracks().forEach(t => t.stop());
        removeOverlay();
      };
      document.getElementById('closeScan2').onclick = () => { stopAll(); resolve(null); };

      (async function scanLoop(){
        while(scanning){
          try{
            const barcodes = await detector.detect(video);
            if(barcodes.length > 0){
              stopAll();
              resolve(barcodes[0].rawValue);
              return;
            }
          }catch(_){}
          await new Promise(r => setTimeout(r, 120));
        }
      })();
    });
  }catch(e){
    console.error('[scanner] BarcodeDetector natif:', e);
    if(e?.name === 'NotAllowedError'){
      toast('❌ Permission caméra refusée — activez-la dans les réglages du navigateur', 'err');
    } else{
      toast('Scanner indisponible — saisissez le code manuellement', 'info');
    }
    return null;
  }
}

/* ── Niveau 3 : capture photo native (hors contexte sécurisé) ─────────
   Seule méthode qui fonctionne depuis file:// ou une PWA installée
   sans HTTPS : ouvre l'appli caméra du téléphone, puis détecte le
   code sur la photo prise (BarcodeDetector si dispo, sinon
   Html5Qrcode.scanFile en repli).                                    */
async function scanViaFileCapture(){
  return new Promise(resolve => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.capture = 'environment';

    const overlay = document.createElement('div');
    overlay.id = 'scanOverlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.88);z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px';
    overlay.innerHTML = `
      <div style="width:100%;max-width:400px;background:#12100c;border:1px solid var(--border);border-radius:16px;padding:20px;text-align:center">
        <div style="font-size:48px;margin-bottom:12px">📷</div>
        <div style="font-weight:700;color:var(--amber);font-size:16px;margin-bottom:8px">Scanner Code-barres</div>
        <div style="font-size:12px;color:var(--text-3);margin-bottom:18px">
          Prenez une photo du code-barres avec la caméra.<br>Le code sera détecté automatiquement.
        </div>
        <button id="openCamBtn" class="btn btn-primary btn-block" style="margin-bottom:10px"><i class="ri-camera-line"></i> Ouvrir la caméra</button>
        <div id="scanFileStatus" style="font-size:12px;color:var(--amber);min-height:20px;margin-bottom:8px"></div>
        <button id="closeScanFile" class="btn btn-ghost btn-block">Annuler</button>
      </div>`;
    document.body.appendChild(overlay);

    const statusEl = document.getElementById('scanFileStatus');
    const closeAll = () => removeOverlay();

    document.getElementById('closeScanFile').onclick = () => { closeAll(); resolve(null); };
    document.getElementById('openCamBtn').onclick = () => fileInput.click();

    fileInput.onchange = async () => {
      const file = fileInput.files?.[0];
      if(!file){ closeAll(); resolve(null); return; }
      statusEl.textContent = '⏳ Analyse en cours…';

      try{
        if('BarcodeDetector' in window){
          const img = await createImageBitmap(file);
          const formats = await BarcodeDetector.getSupportedFormats();
          const detector = new BarcodeDetector({ formats });
          const barcodes = await detector.detect(img);
          if(barcodes.length > 0){ closeAll(); resolve(barcodes[0].rawValue); return; }
          statusEl.textContent = '⚠️ Aucun code détecté — réessayez plus près';
          document.getElementById('openCamBtn').textContent = '📷 Réessayer';
          return;
        }

        if(typeof Html5Qrcode !== 'undefined'){
          statusEl.textContent = '⏳ Lecture via Html5Qrcode…';
          try{
            const result = await Html5Qrcode.scanFile(file, true);
            closeAll();
            resolve(result);
          }catch(e2){
            statusEl.textContent = '⚠️ Aucun code détecté — réessayez plus près';
            document.getElementById('openCamBtn').textContent = '📷 Réessayer';
          }
          return;
        }

        statusEl.textContent = '❌ Détection impossible — saisissez le code manuellement';
      }catch(e){
        console.error('[scanner] capture photo:', e);
        statusEl.textContent = '❌ Erreur : ' + (e.message || e);
      }
    };
  });
}
