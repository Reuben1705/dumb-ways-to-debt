/* =========================================================
   CONTACTLESS CHAOS: movement game. Owner: Person 3
   HOLD ← / → to slide your card along the bottom.

   Dodgy card readers ("skimmers") rain down. Dodge them all
   until the timer runs out. Touch one = SKIMMED!
   Some skimmers aim straight at you, so keep moving.
   ========================================================= */
(function () {
  'use strict';

  const STAGE_W = 800;
  const STAGE_H = 400;
  const CARD_W = 124;
  const CARD_H = 78;
  const SK_W = 72;   // skimmer (card reader) size
  const SK_H = 94;
  const HITBOX = 10; // forgiveness in px, so near misses feel fair

  Game.css('contactless', `
    .cc-street { position: absolute; inset: 0; overflow: hidden; }
    .cc-floor { position: absolute; left: 20px; right: 20px; bottom: 10px; border-top: 4px dashed rgba(17, 17, 17, .25); }
    .cc-card { position: absolute; left: 0; top: 0; width: ${CARD_W}px; height: ${CARD_H}px; z-index: 2;
               border: 4px solid var(--ink); border-radius: 12px; background: var(--green);
               box-shadow: 5px 5px 0 var(--ink); padding: 8px 10px;
               display: flex; flex-direction: column; justify-content: space-between;
               font-family: var(--font-display); font-size: 15px; will-change: transform; }
    .cc-card-top { display: flex; justify-content: space-between; align-items: center; }
    .cc-chip { width: 28px; height: 21px; background: var(--yellow); border: 3px solid var(--ink); border-radius: 5px; }
    .cc-card.zapped { background: var(--red); }
    .cc-skim { position: absolute; left: 0; top: 0; width: ${SK_W}px; height: ${SK_H}px;
               filter: drop-shadow(4px 4px 0 var(--ink)); will-change: transform; }
    .cc-skim svg { display: block; width: 100%; height: 100%; overflow: visible; }
    .cc-skim.gotcha .cc-face { fill: var(--fail-bg); }
  `);

  const WAVES = `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#111" stroke-width="2.6" stroke-linecap="round" aria-hidden="true">
      <path d="M8 8.5a5 5 0 0 1 0 7"/><path d="M12 6a8.5 8.5 0 0 1 0 12"/><path d="M16 3.5a12 12 0 0 1 0 17"/></svg>`;
  // White contactless card reader: bezel, 4 status lights, tap symbol, divider, payment-logo blocks.
  const TERMINAL = `<svg viewBox="0 0 72 94" aria-hidden="true">
      <rect x="2" y="2" width="68" height="90" rx="13" fill="#E9E9E4" stroke="#111" stroke-width="4"/>
      <rect class="cc-face" x="8" y="8" width="56" height="78" rx="8" fill="#FFFFFF" stroke="#C9C9C2" stroke-width="1.5"/>
      <circle cx="20" cy="20" r="3.2" fill="#CFCFC8"/><circle cx="31" cy="19" r="3.2" fill="#CFCFC8"/>
      <circle cx="42" cy="18" r="3.2" fill="#CFCFC8"/><circle cx="53" cy="17" r="3.2" fill="#CFCFC8"/>
      <ellipse cx="36" cy="42" rx="17" ry="9.5" fill="none" stroke="#111" stroke-width="1.8"/>
      <path d="M27 39.5a3.5 3.5 0 0 1 0 5M30 37.5a6.5 6.5 0 0 1 0 9M33 35.5a9.5 9.5 0 0 1 0 13"
            fill="none" stroke="#111" stroke-width="1.6" stroke-linecap="round"/>
      <rect x="38" y="36.5" width="8" height="6" rx="1" fill="#FFFFFF" stroke="#111" stroke-width="1.4"/>
      <path d="M40 43.5c2 2.5 6 3 9 1.5l2-3" fill="none" stroke="#111" stroke-width="1.4" stroke-linecap="round"/>
      <line x1="13" y1="58" x2="59" y2="56" stroke="#111" stroke-width="1.4"/>
      <rect x="14" y="63" width="13" height="8" rx="2" fill="#F04A3E"/>
      <rect x="30" y="63" width="14" height="8" rx="2" fill="#2B4FD8"/>
      <rect x="47" y="63" width="11" height="8" rx="2" fill="#3CCB7F"/>
      <rect x="20" y="75" width="13" height="7" rx="2" fill="#FFD23F"/>
      <rect x="38" y="75" width="13" height="7" rx="2" fill="#F2994A"/>
    </svg>`;

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  let s = null;

  function spawn(ctx) {
    const aimed = Math.random() < 0.4;
    let x = aimed
      ? s.x + CARD_W / 2 - SK_W / 2 + ctx.rand(-40, 40)
      : ctx.rand(10, STAGE_W - SK_W - 10);
    x = clamp(x, 6, STAGE_W - SK_W - 6);
    const el = document.createElement('div');
    el.className = 'cc-skim';
    el.innerHTML = TERMINAL;
    s.layer.appendChild(el);
    s.skims.push({ x, y: -SK_H, v: s.fall * (0.85 + Math.random() * 0.3), el, wob: Math.random() * 6 });
  }

  function step(ctx) {
    const now = performance.now();
    const dt = Math.min(0.05, (now - s.last) / 1000);
    s.last = now;

    const dir = (ctx.isHeld('right') ? 1 : 0) - (ctx.isHeld('left') ? 1 : 0);
    s.x = clamp(s.x + dir * s.move * dt, 8, STAGE_W - CARD_W - 8);
    s.card.style.transform = `translate(${s.x}px, ${s.cardY}px) rotate(${dir * 6}deg)`;

    for (let i = s.skims.length - 1; i >= 0; i--) {
      const sk = s.skims[i];
      sk.y += sk.v * dt;
      sk.el.style.transform = `translate(${sk.x}px, ${sk.y}px) rotate(${Math.sin(now / 120 + sk.wob) * 8}deg)`;

      const overlap =
        sk.x + SK_W - HITBOX > s.x + HITBOX && sk.x + HITBOX < s.x + CARD_W - HITBOX &&
        sk.y + SK_H - HITBOX > s.cardY + HITBOX && sk.y + HITBOX < s.cardY + CARD_H;
      if (overlap) {
        s.done = true;
        s.card.classList.add('zapped');
        sk.el.classList.add('gotcha');
        ctx.end(false);
        return;
      }
      if (sk.y > STAGE_H) {
        sk.el.remove();
        s.skims.splice(i, 1);
      }
    }
  }

  Game.register({
    id: 'contactless',
    name: 'Contactless Chaos',
    instruction: 'DODGE THE SKIMMERS!',
    subtitle: 'Hold ← or → to move your card.',
    controls: { left: 'MOVE', right: 'MOVE' },
    duration: 4500,
    cost: 120,
    passOnTimeout: true,     // survive the timer = pass
    failWord: 'SKIMMED!',
    passWord: 'UNTOUCHED!',
    passLabel: 'Card kept safe',
    lesson: "Check your banking app regularly and report any payment you don't recognise straight away.",
    personality: { title: 'THE OPEN WALLET', roast: 'Your card has been in more readers than a library book.' },

    start(stage, ctx) {
      stage.innerHTML = `
        <div class="cc-street">
          <div class="cc-floor"></div>
          <div class="cc-card">
            <div class="cc-card-top"><span class="cc-chip"></span>${WAVES}</div>
            <span>YOUR CARD</span>
          </div>
        </div>`;
      s = {
        layer: stage.querySelector('.cc-street'),
        card: stage.querySelector('.cc-card'),
        x: STAGE_W / 2 - CARD_W / 2,
        cardY: STAGE_H - CARD_H - 18,
        move: 460 * (0.8 + 0.2 * ctx.speed),   // px per second
        fall: 260 * Math.pow(ctx.speed, 0.85), // px per second
        skims: [],
        last: performance.now(),
        done: false,
      };
      s.card.style.transform = `translate(${s.x}px, ${s.cardY}px)`;

      ctx.after(150, () => spawn(ctx));
      ctx.every(Math.round(520 / Math.pow(ctx.speed, 0.75)), () => spawn(ctx)); // spawn gap
      ctx.every(16, () => { if (!s.done) step(ctx); });
    },

    cleanup() { s = null; },
  });
})();
