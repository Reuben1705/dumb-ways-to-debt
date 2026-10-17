/* =========================================================
   PUMP AND DUMP: boom or bust. Owner: Person 3
   ← CASH OUT   → INVEST £100

   You start with £100 in a made-up coin. A multiplier climbs
   from 1.00x towards a random peak between 1x and 2x.
   Every round is secretly one of two things (50/50, random):
     BOOM:  it keeps climbing until the timer ends and pays
            out stake × final multiplier.
     CRASH: a rug pull at a random moment. You lose
            EVERYTHING you invested.
   → invests another £100 (no cap, up to your whole balance).
   ← cashes out at the current multiplier, safe from any crash.

   Testing tip: test.html?game=pumpdump&pd=boom (or &pd=crash)
   forces one outcome so you can tune it.
   ========================================================= */
(function () {
  'use strict';

  const TICK = 40;      // ms between chart updates
  const CHUNK = 100;    // invest in £100 chunks
  const FORCE = new URLSearchParams(location.search).get('pd'); // 'boom' | 'crash' | null

  const TICKERS = ['$GOOSE', '$MOON', '$NOODL', '$TOAST', '$HYPE', '$LAMBO', '$SOUP', '$YOLO'];
  const HYPE = ['TO THE MOON!', '+400% THIS WEEK', 'EVERYONE IS BUYING', 'INFLUENCER: "BUY"',
    'NEXT BITCOIN?!', 'DON\'T MISS OUT!', 'WHALES ARE BUYING'];

  const LESSON = "Never invest more than you can afford to lose. A rug pull takes the lot.";

  Game.css('pumpdump', `
    .pd-panel { position: absolute; inset: 6px 20px 14px; display: flex; gap: 16px; padding: 12px 16px 14px; }
    .pd-chart { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 8px; position: relative; overflow: hidden; }
    .pd-head { display: flex; align-items: center; gap: 12px; }
    .pd-ticker { font-family: var(--font-display); font-size: 22px; background: var(--ink); color: var(--cream);
                 border-radius: 8px; padding: 0 10px; }
    .pd-mult { font-family: var(--font-display); font-size: 36px; line-height: 1; }
    .pd-up { color: var(--stamp-good); }
    .pd-down { color: var(--stamp); }
    .pd-svg { flex: 1; width: 100%; display: block; background: var(--paper);
              border: 3px solid var(--ink); border-radius: 10px; }
    .pd-line { fill: none; stroke: #1A9E5A; stroke-width: 5; stroke-linejoin: round; stroke-linecap: round;
               vector-effect: non-scaling-stroke; }
    .pd-line.down { stroke: var(--stamp); }
    .pd-base { stroke: var(--ink); stroke-width: 2; stroke-dasharray: 6 6; opacity: .45; vector-effect: non-scaling-stroke; }
    .pd-two { stroke: var(--stamp-good); stroke-width: 2; stroke-dasharray: 3 6; opacity: .5; vector-effect: non-scaling-stroke; }
    .pd-axis { font-family: var(--font-receipt); font-weight: 700; font-size: 12px; fill: #666; }
    .pd-side { width: 210px; flex: none; display: flex; flex-direction: column; gap: 12px; }
    .pd-side .receipt { font-size: 13px; padding: 10px 14px 22px; }
    .pd-worth-label { font-family: var(--font-receipt); font-weight: 700; font-size: 12px; }
    .pd-worth { font-family: var(--font-display); font-size: 38px; line-height: 1; }
    .pd-note { font-size: 13px; font-weight: 800; line-height: 1.3; }
    .pd-headline { --rot: 0deg; position: absolute; z-index: 2; pointer-events: none; background: var(--green);
                   font-family: var(--font-display); font-size: 22px; padding: 4px 12px; white-space: nowrap;
                   transform: rotate(var(--rot)); animation: pd-pop .2s cubic-bezier(.2, 1.6, .4, 1) both; }
    .pd-rug { position: absolute; left: 18%; top: 40%; z-index: 3; background: var(--ink); color: var(--cream);
              font-family: var(--font-display); font-size: 40px; padding: 4px 16px; transform: rotate(-6deg);
              animation: pd-pop .2s cubic-bezier(.2, 1.6, .4, 1) both; }
    .pd-plus { position: absolute; right: 40px; top: 250px; z-index: 3; pointer-events: none;
               font-family: var(--font-display); font-size: 30px; color: var(--stamp-good);
               text-shadow: 2px 2px 0 var(--cream); animation: pd-float .7s ease-out forwards; }
    .pd-broke { animation: pd-nope .25s; }
    .pd-crash { animation: pd-shake .3s; }
    @keyframes pd-pop { from { transform: scale(0) rotate(var(--rot, -6deg)); } to { transform: scale(1) rotate(var(--rot, -6deg)); } }
    @keyframes pd-float { to { transform: translateY(-50px); opacity: 0; } }
    @keyframes pd-nope { 25% { transform: translateX(-6px); } 75% { transform: translateX(6px); } }
    @keyframes pd-shake { 20% { transform: translate(-8px, 4px); } 50% { transform: translate(8px, -4px); } 80% { transform: translate(-4px, 2px); } }
  `);

  const clamp01 = (x) => Math.max(0, Math.min(1, x));
  const easeInOut = (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
  const gbp = (n) => '£' + Math.round(n).toLocaleString('en-GB');

  /* ---------- chart ---------- */
  const W = 520;
  const H = 290;
  const MAX_M = 2.2; // top of the chart
  const yFor = (m) => (H - 8 - (Math.max(0, Math.min(m, MAX_M)) / MAX_M) * (H - 16)).toFixed(1);

  let s = null;

  function draw() {
    const n = Math.max(2, s.total);
    s.el.line.setAttribute('points',
      s.points.map((m, i) => `${((i / (n - 1)) * W).toFixed(1)},${yFor(m)}`).join(' '));
    const up = s.mult >= 1;
    s.el.line.classList.toggle('down', !up);
    s.el.mult.textContent = s.mult.toFixed(2) + 'x';
    s.el.mult.className = 'pd-mult ' + (up ? 'pd-up' : 'pd-down');
    s.el.stake.textContent = gbp(s.stake);
    const worth = s.stake * s.mult;
    s.el.worth.textContent = gbp(worth);
    s.el.worth.className = 'pd-worth ' + (worth >= s.stake ? 'pd-up' : 'pd-down');
  }

  function headline(ctx) {
    const h = document.createElement('div');
    h.className = 'pd-headline sticker';
    h.textContent = ctx.pick(HYPE);
    h.style.left = ctx.rand(3, 22) + '%';
    h.style.top = ctx.rand(20, 72) + '%';
    h.style.setProperty('--rot', ctx.rand(-7, 7) + 'deg');
    s.el.chart.appendChild(h);
    ctx.after(900, () => h.remove());
  }

  /* ---------- round events ---------- */
  function tick(ctx) {
    const t = clamp01((performance.now() - s.t0) / ctx.duration);
    if (s.crashed) {
      const k = clamp01((performance.now() - s.crashT0) / 250);
      s.mult = s.crashFrom * (1 - k);
    } else {
      if (!s.boom && t >= s.crashAt) { crash(ctx); return; }
      const climb = 1 + (s.peak - 1) * easeInOut(clamp01(t / 0.95));
      s.mult = Math.max(0.9, climb + (Math.random() * 2 - 1) * 0.03);
    }
    s.points.push(s.mult);
    draw();
  }

  function crash(ctx) {
    s.crashed = true;
    s.crashT0 = performance.now();
    s.crashFrom = s.mult;
    s.el.panel.classList.add('pd-crash');
    const rug = document.createElement('div');
    rug.className = 'pd-rug sticker';
    rug.textContent = 'RUG PULLED!';
    s.el.chart.appendChild(rug);
    ctx.after(320, () => {
      s.done = true;
      ctx.end(false, {
        failWord: 'RUG PULLED!',
        failLabel: `Lost all ${gbp(s.stake)} in ${s.ticker}`,
        cost: s.stake,
        lesson: LESSON,
      });
    });
  }

  function payout(ctx, word) {
    s.done = true;
    s.mult = Math.round(s.mult * 100) / 100; // pay out exactly what's on screen
    const back = Math.round(s.stake * s.mult);
    const profit = back - s.stake;
    ctx.end(true, {
      reward: profit,
      passWord: word,
      passLabel: `${gbp(s.stake)} × ${s.mult.toFixed(2)}`,
      passRight: `${gbp(back)} (+${gbp(profit)})`,
    });
  }

  function invest() {
    if (s.stake + CHUNK > s.wallet) {
      // Can't invest money you don't have.
      s.el.stakeBox.classList.remove('pd-broke');
      void s.el.stakeBox.offsetWidth;
      s.el.stakeBox.classList.add('pd-broke');
      return;
    }
    s.stake += CHUNK;
    const plus = document.createElement('div');
    plus.className = 'pd-plus';
    plus.textContent = `+£${CHUNK} IN`;
    s.el.panel.appendChild(plus);
    setTimeout(() => plus.remove(), 800);
    Game.sound.blip();
    draw();
  }

  /* ---------- register ---------- */
  Game.register({
    id: 'pumpdump',
    name: 'Pump and Dump',
    instruction: 'BOOM OR BUST?',
    subtitle: '→ invests £100 at a time. ← cashes out before the rug pull.',
    controls: { left: 'CASH OUT', right: 'INVEST £100' },
    duration: 6000,
    cost: 100,              // overridden: you lose whatever you invested
    passOnTimeout: false,
    failWord: 'RUG PULLED!',
    timeoutWord: 'RUG PULLED!',
    lesson: LESSON,
    personality: { title: 'THE BAG HOLDER', roast: 'You went all in on a coin named after soup.' },

    start(stage, ctx) {
      const boom = FORCE === 'boom' ? true : FORCE === 'crash' ? false : Math.random() < 0.5;
      s = {
        boom,
        peak: 1 + Math.random(),                 // final multiplier, 1x–2x
        crashAt: 0.25 + Math.random() * 0.65,    // when a crash hits (share of the round)
        ticker: ctx.pick(TICKERS),
        wallet: ctx.money ?? 1000,                   // needs the updated engine; falls back to £1,000
        stake: Math.min(CHUNK, ctx.money ?? 1000),
        mult: 1,
        points: [1],
        total: Math.ceil(ctx.duration / TICK),
        t0: performance.now(),
        crashed: false,
        done: false,
      };

      stage.innerHTML = `
        <div class="pd-panel sticker">
          <div class="pd-chart">
            <div class="pd-head">
              <span class="pd-ticker">${ctx.esc(s.ticker)}</span>
              <span class="pd-mult pd-up">1.00x</span>
            </div>
            <svg class="pd-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">
              <line class="pd-two" x1="0" x2="${W}" y1="${yFor(2)}" y2="${yFor(2)}"></line>
              <line class="pd-base" x1="0" x2="${W}" y1="${yFor(1)}" y2="${yFor(1)}"></line>
              <polyline class="pd-line" points=""></polyline>
            </svg>
          </div>
          <div class="pd-side">
            <div class="receipt-wrap pd-stake-box"><div class="receipt">
              <div class="line bold"><span>INVESTED</span><span class="pd-stake">£100</span></div>
              <div class="line"><span>YOUR BALANCE</span><span>${gbp(s.wallet)}</span></div>
              <div class="dash"></div>
              <span class="pd-worth-label">NOW WORTH</span>
              <span class="pd-worth pd-up">£100</span>
            </div></div>
            <div class="pd-note">Boom pays up to 2x. A rug pull takes everything you put in.</div>
          </div>
        </div>`;

      const q = (sel) => stage.querySelector(sel);
      s.el = {
        panel: q('.pd-panel'), chart: q('.pd-chart'), line: q('.pd-line'), mult: q('.pd-mult'),
        stake: q('.pd-stake'), worth: q('.pd-worth'), stakeBox: q('.pd-stake-box'),
      };

      ctx.every(TICK, () => { if (!s.done) tick(ctx); });
      ctx.every(Math.round(800 / ctx.speed), () => { if (!s.crashed && !s.done) headline(ctx); });
      if (s.boom) ctx.after(ctx.duration - 80, () => { if (!s.done) payout(ctx, 'BOOM!'); });
      draw();
    },

    onInput(button, pressed, ctx) {
      if (!pressed || !s || s.done || s.crashed) return;
      if (button === 'left') payout(ctx, 'CASHED OUT!');
      else invest();
    },

    cleanup() { s = null; },
  });
})();
