/* =========================================================
   PUMP AND DUMP + PANIC SELL. Owner: Person 3
   ← SELL   → BUY MORE

   Every round is secretly one of two things:
   PUMP: price rockets, then crashes at a random moment.
         Sell before the crash. The longer you wait, the more you win.
   DIP:  price plunges with panic headlines, then recovers.
         Don't sell! Holding (or buying more) wins.

   From speed ×1.5 there are fake-outs: pumps can start with a
   dip and dips can start by rising.

   Testing tip: test.html?game=pumpdump&pd=pump (or &pd=dip)
   forces one type so you can tune it.
   ========================================================= */
(function () {
  'use strict';

  const TICK = 40;            // ms between chart updates
  const STAKE_STEP = 100;
  const MAX_STAKE = 400;
  const FORCE = new URLSearchParams(location.search).get('pd'); // 'pump' | 'dip' | null

  const TICKERS = ['$GOOSE', '$MOON', '$NOODL', '$TOAST', '$HYPE', '$LAMBO', '$SOUP', '$YOLO'];
  const HYPE = ['TO THE MOON!', '+400% THIS WEEK', 'EVERYONE IS BUYING', 'INFLUENCER: "BUY"', 'NEXT BITCOIN?!'];
  const PANIC = ['MARKET PANIC!', 'SELL SELL SELL!', 'EXPERTS: "IT\'S OVER"', 'YOUR MATE SOLD', 'RED DAY!'];

  const PUMP_LESSON = "If it only goes up and everyone's shouting about it, someone's about to sell.";
  const DIP_LESSON = 'Prices dip all the time. Panic selling turns a paper loss into a real one.';

  Game.css('pumpdump', `
    .pd-panel { position: absolute; inset: 6px 20px 14px; display: flex; gap: 16px; padding: 12px 16px 14px; }
    .pd-chart { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 8px; position: relative; overflow: hidden; }
    .pd-head { display: flex; align-items: center; gap: 12px; }
    .pd-ticker { font-family: var(--font-display); font-size: 22px; background: var(--ink); color: var(--cream);
                 border-radius: 8px; padding: 0 10px; }
    .pd-price { font-family: var(--font-display); font-size: 34px; line-height: 1; }
    .pd-change { font-family: var(--font-receipt); font-weight: 700; font-size: 18px; }
    .pd-up { color: var(--stamp-good); }
    .pd-down { color: var(--stamp); }
    .pd-svg { flex: 1; width: 100%; display: block; background: var(--paper);
              border: 3px solid var(--ink); border-radius: 10px; }
    .pd-line { fill: none; stroke: #1A9E5A; stroke-width: 5; stroke-linejoin: round; stroke-linecap: round;
               vector-effect: non-scaling-stroke; }
    .pd-line.down { stroke: var(--stamp); }
    .pd-base { stroke: var(--ink); stroke-width: 2; stroke-dasharray: 6 6; opacity: .45; vector-effect: non-scaling-stroke; }
    .pd-side { width: 200px; flex: none; display: flex; flex-direction: column; gap: 12px; }
    .pd-side .receipt { font-size: 13px; padding: 10px 14px 22px; }
    .pd-pnl-label { font-family: var(--font-receipt); font-weight: 700; font-size: 12px; }
    .pd-pnl { font-family: var(--font-display); font-size: 40px; line-height: 1; }
    .pd-stake-note { font-size: 13px; font-weight: 800; line-height: 1.3; }
    .pd-headline { --rot: 0deg; position: absolute; z-index: 2; pointer-events: none;
                   font-family: var(--font-display); font-size: 24px; padding: 4px 12px; white-space: nowrap;
                   transform: rotate(var(--rot)); animation: pd-pop .2s cubic-bezier(.2, 1.6, .4, 1) both; }
    .pd-headline.hype { background: var(--green); }
    .pd-headline.panic { background: var(--red); }
    .pd-headline.rug { background: var(--ink); color: var(--cream); font-size: 40px; left: 22%; top: 40%; }
    .pd-plus { position: absolute; right: 40px; top: 250px; z-index: 3; pointer-events: none;
               font-family: var(--font-display); font-size: 30px; color: var(--stamp-good);
               text-shadow: 2px 2px 0 var(--cream); animation: pd-float .7s ease-out forwards; }
    .pd-maxed { animation: pd-nope .25s; }
    .pd-crash { animation: pd-shake .3s; }
    @keyframes pd-pop { from { transform: scale(0) rotate(var(--rot)); } to { transform: scale(1) rotate(var(--rot)); } }
    @keyframes pd-float { to { transform: translateY(-50px); opacity: 0; } }
    @keyframes pd-nope { 25% { transform: translateX(-6px); } 75% { transform: translateX(6px); } }
    @keyframes pd-shake { 20% { transform: translate(-8px, 4px); } 50% { transform: translate(8px, -4px); } 80% { transform: translate(-4px, 2px); } }
  `);

  const easeOut = (x) => 1 - (1 - x) * (1 - x);
  const easeInOut = (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
  const clamp01 = (x) => Math.max(0, Math.min(1, x));
  const money = (n) => '£' + n.toFixed(2);

  let s = null; // this round's state

  /* ---------- price path ---------- */
  function targetPrice(t) {
    if (s.mode === 'pump') {
      if (s.crashed) {
        const k = clamp01((performance.now() - s.crashT0) / 250);
        return s.crashFrom + (12 - s.crashFrom) * k;
      }
      const u = t / s.crashAt; // 0 → 1 as we approach the crash
      const fake = s.fakeout ? -28 * Math.sin(clamp01(u * 4) * Math.PI) : 0;
      return 100 + 150 * u * u + fake;
    }
    // dip
    const fake = s.fakeout && t < 0.15 ? 22 * Math.sin((t / 0.15) * Math.PI) : 0;
    if (t < s.dropEnd) return 100 - 55 * easeOut(t / s.dropEnd) + fake;
    if (t < s.recoverAt) return 45;
    return 45 + 80 * easeInOut(clamp01((t - s.recoverAt) / (0.95 - s.recoverAt)));
  }

  function jitter(t) {
    if (s.mode === 'pump' && !s.crashed) return t / s.crashAt > 0.8 ? 9 : 3; // gets shaky before a crash
    return s.mode === 'dip' && t < s.recoverAt ? 6 : 3;
  }

  /* ---------- drawing ---------- */
  const W = 520;
  const H = 290;
  const MIN_P = 20;   // chart's price range, so the line fills the box
  const MAX_P = 270;
  const yFor = (p) => {
    const k = (Math.min(Math.max(p, MIN_P), MAX_P) - MIN_P) / (MAX_P - MIN_P);
    return (H - 8 - k * (H - 16)).toFixed(1);
  };

  function draw() {
    const n = Math.max(2, s.total);
    const pts = s.points.map((p, i) => `${((i / (n - 1)) * W).toFixed(1)},${yFor(p)}`).join(' ');
    s.el.line.setAttribute('points', pts);
    const up = s.price >= 100;
    s.el.line.classList.toggle('down', !up);

    const pct = (s.price / 100 - 1) * 100;
    s.el.price.textContent = money(s.price);
    s.el.change.textContent = `${pct >= 0 ? '▲' : '▼'} ${Math.abs(pct).toFixed(1)}%`;
    s.el.change.className = 'pd-change ' + (up ? 'pd-up' : 'pd-down');

    const pnl = s.stake * (s.price / 100 - 1);
    s.el.pnl.textContent = `${pnl >= 0 ? '+' : '−'}£${Math.abs(pnl).toFixed(0)}`;
    s.el.pnl.className = 'pd-pnl ' + (pnl >= 0 ? 'pd-up' : 'pd-down');
    s.el.stake.textContent = '£' + s.stake;
  }

  function headline(text, kind, ctx) {
    const h = document.createElement('div');
    h.className = `pd-headline sticker ${kind}`;
    h.textContent = text;
    if (kind !== 'rug') {
      h.style.left = ctx.rand(3, 22) + '%';   // keep inside the chart, clear of the P/L receipt
      h.style.top = ctx.rand(20, 72) + '%';
      h.style.setProperty('--rot', ctx.rand(-7, 7) + 'deg');
      ctx.after(900, () => h.remove());
    }
    s.el.chart.appendChild(h);
  }

  /* ---------- round events ---------- */
  function tick(ctx) {
    const t = clamp01((performance.now() - s.t0) / ctx.duration);
    if (s.mode === 'pump' && !s.crashed && t >= s.crashAt) crash(ctx);
    const j = jitter(t);
    s.price = Math.max(1, targetPrice(t) + (Math.random() * 2 - 1) * j);
    s.points.push(s.price);
    draw();
  }

  function crash(ctx) {
    s.crashed = true;
    s.crashT0 = performance.now();
    s.crashFrom = s.price;
    s.el.panel.classList.add('pd-crash');
    headline('RUG PULLED!', 'rug', ctx);
    ctx.after(320, () => {
      s.done = true;
      ctx.end(false, {
        failWord: 'REKT!',
        failLabel: `Held ${s.ticker} into the crash`,
        cost: s.stake + 50,
        lesson: PUMP_LESSON,
      });
    });
  }

  function sell(ctx) {
    s.done = true;
    if (s.mode === 'pump') {
      const gain = Math.max(0, s.price / 100 - 1);
      const reward = Math.max(5, Math.round((s.stake * gain) / 5) * 5);
      ctx.end(true, {
        reward,
        passWord: gain >= 1 ? 'PERFECT EXIT!' : 'CASHED OUT!',
        passLabel: `Sold ${s.ticker} at ${money(s.price)}`,
      });
    } else {
      ctx.end(false, {
        failWord: 'PANIC SOLD!',
        failLabel: `Panic sold ${s.ticker}`,
        cost: s.stake,
        lesson: DIP_LESSON,
      });
    }
  }

  function buyMore() {
    if (s.stake >= MAX_STAKE) {
      s.el.stakeBox.classList.remove('pd-maxed');
      void s.el.stakeBox.offsetWidth;
      s.el.stakeBox.classList.add('pd-maxed');
      return;
    }
    s.stake += STAKE_STEP;
    const plus = document.createElement('div');
    plus.className = 'pd-plus';
    plus.textContent = `+£${STAKE_STEP} IN`;
    s.el.panel.appendChild(plus);
    setTimeout(() => plus.remove(), 800);
    Game.sound.blip();
    draw();
  }

  function holdThroughDip(ctx) {
    if (s.done) return;
    s.done = true;
    const reward = Math.max(5, Math.round((s.stake * 0.25) / 5) * 5);
    ctx.end(true, {
      reward,
      passWord: 'DIAMOND HANDS!',
      passLabel: `Held ${s.ticker} through the dip`,
    });
  }

  /* ---------- register ---------- */
  Game.register({
    id: 'pumpdump',
    name: 'Pump and Dump',
    instruction: "DON'T GET REKT!",
    subtitle: 'Sell before a crash. Hold through a dip.',
    controls: { left: 'SELL', right: 'BUY MORE' },
    duration: 5000,
    cost: 150,               // base; actual cost depends on your stake
    passOnTimeout: false,
    failWord: 'REKT!',
    timeoutWord: 'REKT!',
    lesson: PUMP_LESSON,
    personality: { title: 'THE BAG HOLDER', roast: 'You bought the top and sold the bottom. Impressive, really.' },

    start(stage, ctx) {
      const mode = FORCE === 'pump' || FORCE === 'dip' ? FORCE : Math.random() < 0.55 ? 'pump' : 'dip';
      s = {
        mode,
        ticker: ctx.pick(TICKERS),
        fakeout: ctx.speed >= 1.5 && Math.random() < 0.5,
        stake: STAKE_STEP,
        price: 100,
        points: [100],
        total: Math.ceil(ctx.duration / TICK),
        t0: performance.now(),
        crashAt: 0.45 + Math.random() * 0.35,   // pump: when it crashes (share of the round)
        dropEnd: 0.3 + Math.random() * 0.15,    // dip: when it stops falling
        recoverAt: 0.55 + Math.random() * 0.15, // dip: when it starts recovering
        crashed: false,
        done: false,
      };

      stage.innerHTML = `
        <div class="pd-panel sticker">
          <div class="pd-chart">
            <div class="pd-head">
              <span class="pd-ticker">${ctx.esc(s.ticker)}</span>
              <span class="pd-price">£100.00</span>
              <span class="pd-change pd-up">▲ 0.0%</span>
            </div>
            <svg class="pd-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">
              <line class="pd-base" x1="0" x2="${W}" y1="${yFor(100)}" y2="${yFor(100)}"></line>
              <polyline class="pd-line" points=""></polyline>
            </svg>
          </div>
          <div class="pd-side">
            <div class="receipt-wrap pd-stake-box"><div class="receipt">
              <div class="line"><span>STAKE</span><span class="pd-stake">£100</span></div>
              <div class="line"><span>BOUGHT AT</span><span>£100.00</span></div>
              <div class="dash"></div>
              <span class="pd-pnl-label">PROFIT / LOSS</span>
              <span class="pd-pnl pd-up">+£0</span>
            </div></div>
            <div class="pd-stake-note">→ BUY MORE adds £100 (max £400). Great in a dip. Ouch in a crash.</div>
          </div>
        </div>`;

      const q = (sel) => stage.querySelector(sel);
      s.el = {
        panel: q('.pd-panel'), chart: q('.pd-chart'), line: q('.pd-line'),
        price: q('.pd-price'), change: q('.pd-change'), pnl: q('.pd-pnl'),
        stake: q('.pd-stake'), stakeBox: q('.pd-stake-box'),
      };

      ctx.every(TICK, () => tick(ctx));
      ctx.every(Math.round(750 / ctx.speed), () => {
        if (s.crashed) return;
        const t = (performance.now() - s.t0) / ctx.duration;
        if (s.mode === 'pump' && t > 0.1) headline(ctx.pick(HYPE), 'hype', ctx);
        if (s.mode === 'dip' && t > 0.08 && t < s.recoverAt) headline(ctx.pick(PANIC), 'panic', ctx);
      });
      if (mode === 'dip') ctx.after(ctx.duration - 80, () => holdThroughDip(ctx));
      draw();
    },

    onInput(button, pressed, ctx) {
      if (!pressed || !s || s.done || s.crashed) return;
      if (button === 'left') sell(ctx);
      else buyMore();
    },

    cleanup() { s = null; },
  });
})();
