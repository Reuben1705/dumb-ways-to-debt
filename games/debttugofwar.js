/* =========================================================
   DEBT TUG OF WAR: mashing game, minimal split-screen look.
   Alternate ← → ← → as fast as you can.
   The arena is split: green = you (savings), red = debt.
   A wall between them slides as you push. The loan shark
   pushes back harder every second (that's the interest).
   Each press pushes the wall towards the shark, but only if
   it's the OTHER button from your last press. Same button
   twice = slip.
     wall reaches the shark's edge → pass ("DEBT FREE!")
     wall reaches your edge        → fail ("IN DEBT!")
     time runs out                 → pass only if you're ahead
   Position x: −1 = you win, 0 = middle, +1 = shark wins.
   ========================================================= */
(function () {
  'use strict';

  const PUSH = 0.07;        // movement per valid press
  const SLIP = 0.03;        // moves the WRONG way when you slip
  const RANGE = 40;         // wall moves 50% ± this many % (faces always stay visible)

  // Shark push per second = a + b × seconds elapsed. Both grow with speed.
  // Tuned by bot-testing: ~7 alternating presses/sec wins at ×1, ~8/sec at ×2.5.
  const sharkA = (s) => 0.2 + 0.04 * (s - 1);
  const sharkB = (s) => 0.08 * Math.pow(s, 0.8);

  /* ---------- faces (same rounded-square sticker style as the HUD mascot) ---------- */
  const INK = '#111';
  const box = (fill) => `<rect x="6" y="14" width="108" height="100" rx="28" fill="${fill}" stroke="${INK}" stroke-width="6"/>`;

  const ME = {
    grit: `${box('#3CCB7F')}
      <path d="M34 46 L52 54 M86 46 L68 54" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>
      <circle cx="44" cy="62" r="7" fill="${INK}"/><circle cx="76" cy="62" r="7" fill="${INK}"/>
      <rect x="40" y="76" width="40" height="15" rx="5" fill="#fff" stroke="${INK}" stroke-width="4.5"/>
      <path d="M50 76v15M60 76v15M70 76v15" stroke="${INK}" stroke-width="3.5"/>`,
    happy: `${box('#3CCB7F')}
      <circle cx="44" cy="62" r="7" fill="${INK}"/><circle cx="76" cy="62" r="7" fill="${INK}"/>
      <path d="M38 74 Q60 100 82 74 Z" fill="#fff" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>`,
    sad: `${box('#FFB347')}
      <path d="M34 52 L50 44 M86 52 L70 44" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>
      <circle cx="44" cy="62" r="7" fill="${INK}"/><circle cx="76" cy="62" r="7" fill="${INK}"/>
      <path d="M40 92 Q60 74 80 92" stroke="${INK}" stroke-width="6" fill="none" stroke-linecap="round"/>
      <path d="M104 28 q-9 15 0 20 q9 -5 0 -20Z" fill="#7FD1F7" stroke="${INK}" stroke-width="3.5"/>`,
  };

  // Shark B: sunglasses. mood: smug | winning | losing
  function shark(mood) {
    const fill = '#8FA6C8';
    const grin = { smug: 1, winning: 1.18, losing: 0.72 }[mood];
    const angry = mood === 'losing'
      ? `<path d="M26 44 L52 52 M94 44 L68 52" stroke="${INK}" stroke-width="7" stroke-linecap="round"/>` : '';
    return `
      <path d="M58 18 L74 -10 L86 20 Z" fill="${fill}" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>
      ${box(fill)}
      <path d="M12 84 Q60 104 108 84 L108 86 Q108 114 86 114 H34 Q12 114 12 86 Z" fill="#EEF2F8"/>
      <rect x="6" y="14" width="108" height="100" rx="28" fill="none" stroke="${INK}" stroke-width="6"/>
      <path d="M100 56 q-5 7 0 14 M106 52 q-5 9 0 18" stroke="${INK}" stroke-width="3.5" fill="none" stroke-linecap="round"/>
      <path d="M24 50 H96 V56 Q96 70 82 70 H72 Q64 70 62 60 H58 Q56 70 48 70 H38 Q24 70 24 56 Z" fill="${INK}"/>
      <path d="M32 54 L42 54" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".7"/>
      ${angry}
      <g transform="translate(60 80) scale(${grin} ${mood === 'losing' ? 0.8 : 1}) translate(-60 -80)">
        <path d="M24 72 Q60 98 96 72 Q60 86 24 72 Z" fill="#fff" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
        <path d="M30 75 l5 8 l5 -6 l5 8 l5 -7 l5 8 l5 -7 l5 8 l5 -7 l5 8 l5 -6 l5 7" stroke="${INK}" stroke-width="3" fill="#fff" stroke-linejoin="round"/>
      </g>`;
  }
  const svg = (inner) => `<svg viewBox="0 -14 120 132" overflow="visible">${inner}</svg>`;

  Game.css('debttugofwar', `
    /* next-button hint on the engine's real buttons */
    #frame.tw-next-l #btn-left, #frame.tw-next-r #btn-right { outline: 6px solid #FFD23FAA; outline-offset: 3px; }

    .tw-arena { position: absolute; inset: 4px 20px 6px; border: 5px solid ${INK}; border-radius: 18px;
      box-shadow: 6px 6px 0 ${INK}; overflow: hidden; --split: 50%; }
    .tw-half { position: absolute; top: 0; bottom: 0; display: grid; place-items: center; overflow: hidden; }
    .tw-half.you { left: 0; width: var(--split); background: #7EE0AA; }
    .tw-half.debt { left: var(--split); right: 0; background: #FF7F73; }
    .tw-arena.slam .tw-half, .tw-arena.slam .tw-wall, .tw-arena.slam .tw-coin { transition: left .25s ease-in, width .25s ease-in; }

    .tw-face { display: grid; justify-items: center; gap: 10px; }
    .tw-face svg { display: block; width: var(--size, 150px); height: calc(var(--size, 150px) * 1.1);
      filter: drop-shadow(6px 6px 0 ${INK}); transition: width .12s, height .12s; }
    .tw-name { font-family: var(--font-display); font-size: 16px; letter-spacing: 2px; padding: 1px 10px; white-space: nowrap;
      border: 3px solid ${INK}; border-radius: 8px; background: var(--cream); transition: opacity .15s; }
    .tw-face.tiny .tw-name { opacity: 0; }
    .tw-face.boop svg { animation: tw-boop .12s ease-out; }
    .tw-face.slip svg { animation: tw-slip .3s ease-out; }
    .tw-face.angry svg { animation: wobble .18s ease-in-out infinite alternate; }

    .tw-wall { position: absolute; top: 0; bottom: 0; left: calc(var(--split) - 6px); width: 12px; background: ${INK}; z-index: 2; }
    .tw-wall.jolt { animation: tw-jolt .12s ease-out; }
    .tw-coin { position: absolute; left: calc(var(--split) - 25px); top: 50%; margin-top: -25px; width: 50px; height: 50px; z-index: 3;
      border-radius: 50%; background: var(--yellow); border: 5px solid ${INK}; display: grid; place-items: center;
      font-family: var(--font-display); font-size: 26px; }
    .tw-coin.spin { animation: tw-spin .25s ease-out; }

    .tw-apr { position: absolute; left: 50%; top: 12px; transform: translateX(-50%); z-index: 4; white-space: nowrap;
      font-family: var(--font-display); font-size: 17px; padding: 2px 12px; border: 4px solid ${INK}; border-radius: 10px; background: var(--cream); }
    .tw-apr b { font-family: var(--font-receipt); font-weight: 700; color: var(--stamp); }
    .tw-apr.hot { animation: shake .3s linear infinite; }

    .tw-slip-word { position: absolute; z-index: 5; font-family: var(--font-display); font-size: 22px; color: #fff; background: var(--red);
      border: 3px solid ${INK}; border-radius: 8px; padding: 0 10px; animation: tw-pop .5s ease-out forwards; pointer-events: none; }

    @keyframes tw-boop { 0% { transform: scale(1); } 40% { transform: scale(1.08, .94); } 100% { transform: scale(1); } }
    @keyframes tw-slip { 0% { transform: rotate(0); } 30% { transform: rotate(-14deg) translateY(6px); } 100% { transform: rotate(0); } }
    @keyframes tw-jolt { 0% { transform: scaleX(1.6); } 100% { transform: scaleX(1); } }
    @keyframes tw-spin { from { transform: rotateY(0); } to { transform: rotateY(360deg); } }
    @keyframes tw-pop { from { transform: translateY(0) scale(.7); opacity: 1; } to { transform: translateY(-40px) scale(1); opacity: 0; } }
  `);

  let s = null;   // per-round state

  function setMe(mood) { if (mood !== s.meMood) { s.meMood = mood; s.meSvg.innerHTML = ME[mood]; } }
  function setShark(mood) { if (mood !== s.shMood) { s.shMood = mood; s.shSvg.innerHTML = shark(mood); } }
  function restart(el, cls) { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }

  function finish(pass, extra) {
    if (s.done) return;
    s.done = true;
    // Slam the wall all the way across: the winning colour fills the screen.
    s.arena.classList.add('slam');
    s.arena.style.setProperty('--split', pass ? '100%' : '0%');
    if (s.frame) s.frame.classList.remove('tw-next-l', 'tw-next-r');
    s.ctx.end(pass, extra);
  }

  const slipLesson = () => (s.slips >= 4
    ? 'Alternate ← → ! Pressing the same arrow twice made you slip. And remember: pay off high-interest debt first.'
    : undefined);

  Game.register({
    id: 'debttugofwar',
    name: 'Debt Tug of War',
    instruction: 'MASH ← →!',
    subtitle: 'Alternate the arrows. Same one twice = slip!',
    readTime: 800,
    controls: { left: 'PUSH', right: 'PUSH' },
    duration: 5000,
    cost: 150,
    passOnTimeout: false,    // decided at the end from the wall position
    failWord: 'IN DEBT!',
    passWord: 'DEBT FREE!',
    lesson: 'Interest makes debt grow faster the longer you leave it. Pay off the highest-interest debt first.',
    personality: {
      title: 'THE MINIMUM PAYER',
      roast: [
        "You've been paying off that £200 phone since 2019.",
        'The loan shark sends you a Christmas card. And a bill.',
        "You've paid the interest twice over and still owe the £200.",
        "Your credit card statement says 'minimum payment' like it's a compliment.",
        'Payday comes and goes. The debt just stays.',
      ],
    },

    start(stage, ctx) {
      stage.innerHTML = `
        <div class="tw-arena">
          <div class="tw-half you"><div class="tw-face me">${svg('')}<span class="tw-name">YOU</span></div></div>
          <div class="tw-half debt"><div class="tw-face shark">${svg('')}<span class="tw-name">LOAN SHARK</span></div></div>
          <div class="tw-wall"></div>
          <div class="tw-coin">£</div>
          <div class="tw-apr">INTEREST <b>19.9%</b></div>
        </div>`;

      const $ = (q) => stage.querySelector(q);
      s = {
        ctx, x: 0, last: null, slips: 0, done: false, splitPct: 50,
        t0: performance.now(), prev: performance.now(),
        a: sharkA(ctx.speed), b: sharkB(ctx.speed),
        arena: $('.tw-arena'), wall: $('.tw-wall'), coin: $('.tw-coin'), apr: $('.tw-apr'), aprNum: $('.tw-apr b'),
        meFace: $('.tw-face.me'), meSvg: $('.tw-face.me svg'), shFace: $('.tw-face.shark'), shSvg: $('.tw-face.shark svg'),
        frame: stage.closest('#frame') || document.getElementById('frame'),
        meMood: null, shMood: null,
      };
      setMe('grit');
      setShark('smug');
      if (s.frame) s.frame.classList.add('tw-next-l', 'tw-next-r');

      ctx.every(16, tick);
      tick();

      // Time's up: pass only if you're ahead.
      ctx.after(Math.max(200, ctx.duration - 60), () => {
        if (s.x < 0) finish(true, { passWord: 'DEBT FREE!', passLabel: 'Held off the loan shark', passRight: 'NO NEW DEBT' });
        else finish(false, { failLabel: 'Loan shark won', lesson: slipLesson() });
      });
    },

    onInput(button, pressed) {
      if (!pressed || !s || s.done) return;

      if (button === s.last) {
        // Same button twice: slip!
        s.slips++;
        s.x = Math.min(1, s.x + SLIP);
        restart(s.meFace, 'slip');
        const w = document.createElement('div');
        w.className = 'tw-slip-word';
        w.textContent = 'SLIP!';
        w.style.left = Math.max(10, s.arena.clientWidth * s.splitPct / 100 / 2 - 34) + 'px';
        w.style.top = '60px';
        s.arena.appendChild(w);
        s.ctx.after(520, () => w.remove());
        Game.sound.blip();
        return;
      }
      s.last = button;
      s.x = Math.max(-1, s.x - PUSH);
      restart(s.meFace, 'boop');
      restart(s.wall, 'jolt');
      restart(s.coin, 'spin');
    },

    cleanup() {
      if (s && s.frame) s.frame.classList.remove('tw-next-l', 'tw-next-r');
      s = null;
    },
  });

  function tick() {
    if (!s || s.done) return;
    const now = performance.now();
    const dt = Math.min(0.05, (now - s.prev) / 1000);
    s.prev = now;
    const t = (now - s.t0) / 1000;

    // The shark pushes harder every second: that's interest.
    const pull = s.a + s.b * t;
    s.x = Math.min(1, s.x + pull * dt);

    // Wall position and face sizes.
    s.splitPct = 50 - s.x * RANGE;
    s.arena.style.setProperty('--split', s.splitPct.toFixed(2) + '%');
    const W = s.arena.clientWidth;
    const meRoom = W * s.splitPct / 100, shRoom = W - meRoom;
    const size = (room) => Math.max(58, Math.min(150, room - 60));
    s.meFace.style.setProperty('--size', size(meRoom) + 'px');
    s.shFace.style.setProperty('--size', size(shRoom) + 'px');
    s.meFace.classList.toggle('tiny', meRoom < 180);
    s.shFace.classList.toggle('tiny', shRoom < 180);

    // Interest pill.
    const apr = 19.9 + t * t * 18 * s.ctx.speed + t * 25;
    s.aprNum.textContent = (apr < 1000 ? apr.toFixed(1) : Math.round(apr).toLocaleString()) + '%';
    s.apr.classList.toggle('hot', t > 2.4 / Math.sqrt(s.ctx.speed));

    // Faces react.
    setMe(s.x > 0.35 ? 'sad' : s.x < -0.3 ? 'happy' : 'grit');
    setShark(s.x > 0.3 ? 'winning' : s.x < -0.3 ? 'losing' : 'smug');
    s.shFace.classList.toggle('angry', s.x < -0.55);

    // Next button to press glows.
    if (s.frame) {
      s.frame.classList.toggle('tw-next-l', s.last !== 'left');
      s.frame.classList.toggle('tw-next-r', s.last !== 'right');
    }

    if (s.x <= -1) finish(true, { passWord: 'DEBT FREE!', passLabel: 'Pushed the loan shark out', passRight: 'DEBT CLEARED' });
    else if (s.x >= 1) finish(false, { failLabel: 'Pushed into debt', lesson: slipLesson() });
  }
})();
