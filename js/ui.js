// ══════════════════════════════════════════════════════════════
// UI.JS — Utilitaires d'interface partagés
// Génération A7 · Marjane Tanger Médina
// ══════════════════════════════════════════════════════════════
// Remplace les dizaines de fonctions ad-hoc dupliquées dans le
// monolithe (closeArticleModal, closeA4TplModal, closePictoMgr…
// une fonction par modale) par des helpers génériques réutilisés
// par les 3 sous-applis (A7 / A4 / Balisage).
// ══════════════════════════════════════════════════════════════

/* ── Sélecteurs courts ──────────────────────────────────────── */
export const $  = (s, root = document) => root.querySelector(s);
export const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));

/* ── Toasts ─────────────────────────────────────────────────────
   toast('Message', 'ok' | 'err' | 'info')                         */
let _toastSeq = 0;

export function toast(msg, type = 'ok', duration = 3200){
  const container = $('#toast');
  if(!container){
    console.warn('[ui] #toast introuvable dans le DOM — message :', msg);
    return;
  }
  const id = 'toast-' + (++_toastSeq);
  const el = document.createElement('div');
  el.id = id;
  el.className = `toast-item toast-${type}`;
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => el.remove(), duration);
}

/* ── Modales génériques ─────────────────────────────────────────
   Convention : chaque modale est un conteneur `.modal-bg` avec un
   id unique. On l'ouvre/ferme en (dés)activant la classe "open" —
   plus besoin d'une fonction closeXxxModal() par modale.

   HTML attendu :
     <div class="modal-bg" id="articleModal"> <div class="modal">…</div> </div>

   Fermeture au clic sur le fond (mais pas sur le contenu) et
   avec la touche Échap, gérées une seule fois ici pour toutes
   les modales de l'app.                                          */
export function openModal(id){
  const el = document.getElementById(id);
  if(!el){ console.warn('[ui] modale introuvable :', id); return; }
  el.classList.add('open');
}

export function closeModal(id){
  const el = document.getElementById(id);
  if(el) el.classList.remove('open');
}

export function closeAllModals(){
  $$('.modal-bg.open').forEach(el => el.classList.remove('open'));
}

// Câblage global une seule fois (clic sur le fond + Échap)
document.addEventListener('click', (e) => {
  if(e.target.classList?.contains('modal-bg')) e.target.classList.remove('open');
});
document.addEventListener('keydown', (e) => {
  if(e.key === 'Escape') closeAllModals();
});

/* ── Routeur d'onglets générique ─────────────────────────────────
   Remplace le switchTab() unique et codé en dur sur '#a7-mode'.
   Chaque sous-appli (a7, a4, balisage) déclare son propre routeur
   avec ses propres callbacks d'activation :

     const a7Tabs = createTabRouter({
       scope: '#a7-mode',
       onEnter: {
         file:       () => renderQueue(),
         base:       () => renderBase(),
         historique: () => renderHistory(),
       }
     });
     a7Tabs.switchTo('file');

   Ainsi ui.js ne connaît rien de la logique métier — il orchestre
   juste l'affichage, la logique reste dans les modules a7/a4/….   */
export function createTabRouter({ scope, onEnter = {}, defaultTab }){
  const root = typeof scope === 'string' ? $(scope) : scope;
  if(!root){ console.warn('[ui] scope introuvable pour le routeur d\'onglets :', scope); }

  function switchTo(name){
    $$('.tab', root).forEach(t => t.classList.remove('active'));
    $$('.nav-btn', root).forEach(b => b.classList.remove('active'));

    const tabEl = root?.querySelector('#tab-' + name) || document.getElementById('tab-' + name);
    const btnEl = root?.querySelector(`[data-tab="${name}"]`) || document.querySelector(`[data-tab="${name}"]`);
    tabEl?.classList.add('active');
    btnEl?.classList.add('active');

    onEnter[name]?.();
  }

  if(defaultTab) switchTo(defaultTab);

  return { switchTo };
}
