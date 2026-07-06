// ══════════════════════════════════════════════════════════════
// AI.JS — Traduction & correction assistées par IA (Groq)
// Génération A7 · Marjane Tanger Médina
// ══════════════════════════════════════════════════════════════
// Corrige un bug de nommage du monolithe d'origine : la clé était
// appelée "_getAnthropicKey" alors qu'elle sert exclusivement à
// l'API Groq (aucun lien avec Anthropic). Renommée ici pour éviter
// toute confusion future.
//
// Dépend de : ui.js
// ══════════════════════════════════════════════════════════════

import { $, toast, openModal, closeModal } from './ui.js';

const STORAGE_KEY = 'marjane_groq_key';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile';

/* ── Stockage local de la clé API ──────────────────────────────── */
export function getGroqKey(){
  return localStorage.getItem(STORAGE_KEY) || '';
}
export function setGroqKey(k){
  if(k) localStorage.setItem(STORAGE_KEY, k.trim());
  else localStorage.removeItem(STORAGE_KEY);
}

/* ── Modale de saisie de clé API ────────────────────────────────── */
export function openApiKeyModal(callback){
  const input = $('#apiKeyModalInput');
  if(input) input.value = getGroqKey();
  window.__aiKeyCallback = callback;
  openModal('apiKeyModal');
  setTimeout(() => input?.focus(), 100);
}

export function saveApiKeyFromModal(){
  const key = ($('#apiKeyModalInput')?.value || '').trim();
  setGroqKey(key);
  closeModal('apiKeyModal');
  const lbl = $('#apiKeyBtnLabel');
  if(lbl) lbl.textContent = key ? '🔑 API OK' : 'Clé API';
  toast(key ? '🔑 Clé API enregistrée' : '🗑 Clé supprimée', 'ok');
  const cb = window.__aiKeyCallback;
  window.__aiKeyCallback = null;
  if(cb) cb(key);
}

export function deleteApiKeyFromModal(){
  setGroqKey('');
  const input = $('#apiKeyModalInput');
  if(input) input.value = '';
  toast('Clé supprimée', 'ok');
}

/* ── Appel générique à l'API Groq (chat completion) ────────────────
   Gère la demande de clé si absente, et la ré-invite si invalide.  */
async function callGroq(prompt, { maxTokens = 150, temperature = 0.3, onRetry } = {}){
  let apiKey = getGroqKey();
  if(!apiKey){
    return new Promise((resolve, reject) => {
      openApiKeyModal(key => {
        if(key) callGroq(prompt, { maxTokens, temperature, onRetry }).then(resolve).catch(reject);
        else reject(new Error('CLE_API_REQUISE'));
      });
    });
  }

  const response = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { 'Content-Type':'application/json', 'Authorization':'Bearer ' + apiKey },
    body: JSON.stringify({
      model: MODEL, max_tokens: maxTokens, temperature,
      messages: [{ role:'user', content: prompt }],
    }),
  });

  if(!response.ok){
    if(response.status === 401){
      toast('🔑 Clé API invalide — veuillez la corriger', 'err');
      return new Promise((resolve, reject) => {
        openApiKeyModal(key => {
          if(key) callGroq(prompt, { maxTokens, temperature, onRetry }).then(resolve).catch(reject);
          else reject(new Error('CLE_API_INVALIDE'));
        });
      });
    }
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Erreur API ' + response.status);
  }

  const data = await response.json();
  return (data.choices?.[0]?.message?.content || '').trim();
}

/* ── Bouton : état de chargement générique ─────────────────────────── */
function withLoadingState(btnEl, fn){
  const origHTML = btnEl ? btnEl.innerHTML : '';
  if(btnEl){
    btnEl.disabled = true;
    btnEl.innerHTML = '<i class="ri-loader-4-line" style="animation:spin .7s linear infinite;display:inline-block"></i> …';
  }
  return fn().finally(() => {
    if(btnEl){ btnEl.disabled = false; btnEl.innerHTML = origHTML; }
  });
}

/* ── Traduction FR → AR commercial ──────────────────────────────────── */
export async function translateToArabic(srcId, dstId, btnId){
  const srcEl = document.getElementById(srcId);
  const dstEl = document.getElementById(dstId);
  const btnEl = btnId ? document.getElementById(btnId) : null;
  if(!srcEl || !dstEl){ toast('Champs introuvables', 'err'); return; }

  const textFR = srcEl.value.trim();
  if(!textFR){ toast('Saisissez d\'abord la désignation française', 'err'); return; }

  await withLoadingState(btnEl, async () => {
    try{
      const prompt = `Tu es un expert en traduction commerciale pour la grande distribution au Maroc (hypermarché Marjane).
Ta mission : traduire la désignation de produit française suivante en arabe marocain commercial (darija écrite en arabe standard).

Règles strictes :
- Utilise la terminologie commerciale standard des étiquettes de supermarché marocain
- Si un terme technique/marque n'a pas d'équivalent arabe, conserve-le tel quel
- Résultat court, adapté pour une étiquette produit (max 60 caractères)
- Retourne UNIQUEMENT la traduction arabe, sans explication

Désignation à traduire : "${textFR.substring(0, 120)}"`;

      const translation = await callGroq(prompt, { maxTokens:120, temperature:0.3 });
      if(!translation) throw new Error('Réponse vide de l\'IA');

      dstEl.value = translation;
      dstEl.dispatchEvent(new Event('input', { bubbles:true }));
      toast('✅ Traduction arabe générée par IA', 'ok');
    }catch(e){
      if(e.message === 'CLE_API_REQUISE' || e.message === 'CLE_API_INVALIDE') return;
      console.error('[ai] translateToArabic:', e);
      toast('❌ Erreur traduction : ' + (e.message || 'inconnue'), 'err');
    }
  });
}

/* ── Correction orthographique FR + traduction AR (combiné) ────────────── */
export async function spellCheckFR(srcId, dstId, btnId){
  const srcEl = document.getElementById(srcId);
  const dstEl = dstId ? document.getElementById(dstId) : null;
  const btnEl = btnId ? document.getElementById(btnId) : null;
  if(!srcEl){ toast('Champ source introuvable', 'err'); return; }

  const textFR = srcEl.value.trim();
  if(!textFR){ toast('Saisissez d\'abord la désignation française', 'err'); return; }

  await withLoadingState(btnEl, async () => {
    try{
      const prompt = `Tu es un expert en rédaction commerciale pour la grande distribution au Maroc (hypermarché Marjane).
Corrige l'orthographe et la typographie de la désignation produit française ci-dessous, puis fournis sa traduction en arabe marocain commercial.

Règles :
- Corriger uniquement les fautes d'orthographe, de casse et de typographie (ne change pas le sens)
- Désignation corrigée : courte, adaptée étiquette, en MAJUSCULES si elle l'était à l'origine
- Traduction arabe : max 60 caractères, conserve marques/chiffres/unités
- Retourne UNIQUEMENT un JSON valide sans aucun texte autour :
{"fr":"désignation corrigée","ar":"ترجمة عربية"}

Désignation : "${textFR.substring(0, 120)}"`;

      const raw = (await callGroq(prompt, { maxTokens:150, temperature:0.2 })).replace(/```json|```/g, '').trim();
      let parsed;
      try{ parsed = JSON.parse(raw); }
      catch(e){ throw new Error('Réponse IA invalide : ' + raw.substring(0, 60)); }

      const corrFR = (parsed.fr || '').trim();
      const transAR = (parsed.ar || '').trim();

      if(corrFR){ srcEl.value = corrFR; srcEl.dispatchEvent(new Event('input', { bubbles:true })); }
      if(dstEl && transAR){ dstEl.value = transAR; dstEl.dispatchEvent(new Event('input', { bubbles:true })); }
      toast('✅ Orthographe corrigée + traduction générée', 'ok');
    }catch(e){
      if(e.message === 'CLE_API_REQUISE' || e.message === 'CLE_API_INVALIDE') return;
      console.error('[ai] spellCheckFR:', e);
      toast('❌ Erreur : ' + (e.message || 'inconnue'), 'err');
    }
  });
}

/* ── Câblage de la modale clé API (à appeler une fois au démarrage) ───── */
export function initApiKeyModal(){
  $('#btnSaveApiKey')?.addEventListener('click', saveApiKeyFromModal);
  $('#btnDeleteApiKey')?.addEventListener('click', deleteApiKeyFromModal);
  $('#btnCloseApiKeyModal')?.addEventListener('click', () => closeModal('apiKeyModal'));
  $('#btnToggleApiKeyVisibility')?.addEventListener('click', () => {
    const input = $('#apiKeyModalInput');
    if(input) input.type = input.type === 'password' ? 'text' : 'password';
  });
  $('#apiKeyBtn')?.addEventListener('click', () => openApiKeyModal());
  const lbl = $('#apiKeyBtnLabel');
  if(lbl) lbl.textContent = getGroqKey() ? '🔑 API OK' : 'Clé API';
}
