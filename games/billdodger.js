/* =========================================================
   BILL DODGER: flappy game. Owner: Person 3
   ← FLAP   FLAP →  (either button flaps)

   Your wallet flies through gaps between towers of bills.
   Survive until the timer ends = pass.
   Hit a tower or the floor = fail. The ceiling just bonks you.
   Towers get faster and gaps narrower as speed rises.
   ========================================================= */
(function () {
  'use strict';

  const STAGE_W = 800;
  const STAGE_H = 400;
  const GROUND = 18;          // floor strip height
  const PX = 150;             // wallet's fixed x position
  const PW = 60;              // wallet size
  const PH = 46;
  const TW = 86;              // tower width
  const SPACING = 300;        // px between towers
  const GRAVITY = 1500;       // px/s²
  const FLAP = -430;          // px/s upward kick (one flap rises about 60px)
  const HIT = 7;              // hitbox forgiveness in px

  const BILLS = ['RENT', 'COUNCIL TAX', 'PHONE BILL', 'ENERGY BILL', 'TV LICENCE',
    'GYM (UNUSED)', 'PARKING FINE', 'WATER BILL', 'CAR INSURANCE', 'STREAMING ×6'];

  Game.css('billdodger', `
    .bd-world { position: absolute; inset: 0; overflow: hidden; }
    .bd-ground { position: absolute; left: 0; right: 0; bottom: 0; height: ${GROUND}px; z-index: 2;
                 background: #E5C78E; border-top: 4px solid var(--ink); }
    .bd-pair { position: absolute; left: 0; top: 0; width: ${TW}px; height: 100%; will-change: transform; }
    .bd-tower { position: absolute; left: 0; width: ${TW}px; box-sizing: border-box;
                background-color: var(--paper); border: 4px solid var(--ink);
                background-image: repeating-linear-gradient(0deg, transparent 0 14px, #D8D2C2 14px 17px);
                box-shadow: 5px 0 0 rgba(17, 17, 17, .25); }
    .bd-tower.top { top: -6px; border-top: none; border-radius: 0 0 6px 6px; }
    .bd-tower.bot { border-bottom: none; border-radius: 6px 6px 0 0; }
    .bd-cap { position: absolute; left: -10px; right: -10px; min-height: 30px; box-sizing: border-box; padding: 3px 4px;
              background: var(--red); border: 4px solid var(--ink); border-radius: 8px;
              display: flex; align-items: center; justify-content: center; text-align: center;
              font-family: var(--font-display); font-size: 13px; line-height: 1.05; color: var(--ink); }
    .bd-tower.top .bd-cap { bottom: -4px; }
    .bd-tower.bot .bd-cap { top: -4px; }
    .bd-wallet { position: absolute; left: 0; top: 0; width: ${PW}px; height: ${PH}px; z-index: 3; will-change: transform; }
    .bd-wallet svg { display: block; overflow: visible; }
    .bd-wing { transform-box: fill-box; transform-origin: 50% 100%; }
    .bd-wallet.flap .bd-wing { animation: bd-flap .18s ease-out; }
    .bd-wallet.dead .bd-body { fill: var(--red); }
    .bd-tip { position: absolute; left: 50%; top: 42%; z-index: 4; transform: translate(-50%, -50%);
              font-family: var(--font-display); font-size: 30px; padding: 6px 18px; white-space: nowrap;
              animation: pulse .4s ease-in-out infinite alternate; }
    @keyframes bd-flap { 50% { transform: scaleY(-.6); } }
  `);

  const WALLET = `<svg width="${PW}" height="${PH}" viewBox="0 0 60 46" aria-hidden="true">
    <ellipse class="bd-wing" cx="18" cy="7" rx="12" ry="8" fill="#FFF" stroke="#111" stroke-width="3"/>
    <ellipse class="bd-wing" cx="40" cy="7" rx="12" ry="8" fill="#FFF" stroke="#111" stroke-width="3"/>
    <rect class="bd-body" x="2" y="9" width="56" height="35" rx="10" fill="#3CCB7F" stroke="#111" stroke-width="4"/>
    <path d="M3 21 H57" stroke="#111" stroke-width="3"/>
    <circle cx="49" cy="27" r="4.5" fill="#FFD23F" stroke="#111" stroke-width="2.5"/>
    <circle cx="21" cy="29" r="2.8" fill="#111"/><circle cx="32" cy="29" r="2.8" fill="#111"/>
    <path d="M20 35 Q26.5 40 33 35" fill="none" stroke="#111" stroke-width="2.6" stroke-linecap="round"/>
  </svg>`;

  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  let s = null;

  function spawn(ctx, x) {
    const floor = STAGE_H - GROUND;
    const lo = s.gap / 2 + 24;
    const hi = floor - s.gap / 2 - 24;
    // Towers come quicker at high speed, so consecutive gaps can't move as far.
    const reach = Math.round(120 / Math.sqrt(ctx.speed));
    const center = clamp(s.lastCenter + ctx.rand(-reach, reach), lo, hi);
    s.lastCenter = center;
    const gapTop = Math.round(center - s.gap / 2);
    const gapBot = Math.round(center + s.gap / 2);
    const top = ctx.pick(BILLS);
    let bottom = ctx.pick(BILLS);
    if (bottom === top) bottom = BILLS[(BILLS.indexOf(top) + 3) % BILLS.length];

    const el = document.createElement('div');
    el.className = 'bd-pair';
    el.innerHTML = `
      <div class="bd-tower top" style="height:${gapTop + 6}px"><div class="bd-cap">${ctx.esc(top)}</div></div>
      <div class="bd-tower bot" style="top:${gapBot}px; height:${STAGE_H - gapBot}px"><div class="bd-cap">${ctx.esc(bottom)}</div></div>`;
    el.dataset.gapTop = gapTop;
    el.dataset.gapBot = gapBot;
    el.style.transform = `translateX(${x}px)`;
    s.world.appendChild(el);
    s.pairs.push({ x, gapTop, gapBot, top, bottom, el });
  }

  function crash(ctx, label) {
    s.done = true;
    s.wallet.classList.add('dead');
    ctx.end(false, { failLabel: `Hit by ${label}` });
  }

  function step(ctx) {
    const now = performance.now();
    const dt = Math.min(0.05, (now - s.last) / 1000);
    s.last = now;

    // wallet physics
    s.vy += GRAVITY * dt;
    s.y += s.vy * dt;
    if (s.y < 0) { s.y = 0; s.vy = Math.max(0, s.vy); } // bonk the ceiling
    const tilt = clamp(s.vy / 12, -25, 60);
    s.wallet.style.transform = `translate(${PX}px, ${s.y}px) rotate(${tilt}deg)`;

    // towers
    for (let i = s.pairs.length - 1; i >= 0; i--) {
      const p = s.pairs[i];
      p.x -= s.speedPx * dt;
      p.el.style.transform = `translateX(${p.x}px)`;
      if (p.x < -TW - 30) {
        p.el.remove();
        s.pairs.splice(i, 1);
      }
    }
    const last = s.pairs[s.pairs.length - 1];
    if (!last || last.x < STAGE_W - SPACING) spawn(ctx, (last ? last.x : STAGE_W) + SPACING);

    // collisions
    const top = s.y + HIT;
    const bottom = s.y + PH - HIT;
    const left = PX + HIT;
    const right = PX + PW - HIT;
    if (bottom > STAGE_H - GROUND) { crash(ctx, 'the floor (rock bottom)'); return; }
    for (const p of s.pairs) {
      if (right > p.x && left < p.x + TW) {
        if (top < p.gapTop) { crash(ctx, p.top); return; }
        if (bottom > p.gapBot) { crash(ctx, p.bottom); return; }
      }
    }
  }

  Game.register({
    id: 'billdodger',
    name: 'Bill Dodger',
    instruction: 'DODGE THE BILLS!',
    subtitle: 'Press either button to flap.',
    controls: { left: 'FLAP', right: 'FLAP' },
    duration: 5000,
    cost: 120,
    passOnTimeout: true,     // survive the timer = pass
    failWord: 'SKINT!',
    passWord: 'BILLS DODGED!',
    passLabel: 'Made it to payday',
    lesson: "Bills don't stop coming. Set up direct debits for the essentials so you never miss one.",
    personality: { title: 'THE BILL DODGER', roast: 'Your letterbox is 90% red envelopes.' },

    start(stage, ctx) {
      stage.innerHTML = `
        <div class="bd-world">
          <div class="bd-wallet">${WALLET}</div>
          <div class="bd-tip sticker">FLAP!</div>
          <div class="bd-ground"></div>
        </div>`;
      const speedPx = 240 * Math.pow(ctx.speed, 0.8);
      s = {
        world: stage.querySelector('.bd-world'),
        wallet: stage.querySelector('.bd-wallet'),
        tip: stage.querySelector('.bd-tip'),
        y: 150,
        vy: -260,                                       // a little hop to start
        speedPx,
        gap: Math.max(130, 185 - 22 * (ctx.speed - 1)), // gap shrinks with speed
        lastCenter: 190,
        pairs: [],
        last: performance.now(),
        done: false,
      };
      // First tower reaches the wallet after about a second (a bit less at high speed).
      const firstX = PX + PW + speedPx * Math.max(0.6, 1.1 / Math.sqrt(ctx.speed));
      spawn(ctx, firstX);
      ctx.after(900, () => { if (s.tip) s.tip.remove(); });
      ctx.every(16, () => { if (!s.done) step(ctx); });
    },

    onInput(button, pressed) {
      if (!pressed || !s || s.done) return;
      s.vy = FLAP;
      if (s.tip) { s.tip.remove(); s.tip = null; }
      s.wallet.classList.remove('flap');
      void s.wallet.offsetWidth;
      s.wallet.classList.add('flap');
      Game.sound.blip();
    },

    cleanup() { s = null; },
  });
})();
