/* =========================================================
   COMPOUND INTEREST: timing game. Owner: Person 3
   ← INVEST   INVEST →

   A coin sweeps along a track. A green zone appears on the
   left or right half. Press THAT side's button while the
   coin is inside the zone. Each hit = one "year": the pot
   doubles, the tree grows, the zone shrinks and the coin
   speeds up. Hit 3 years in a row to win the pot.
   Wrong time, wrong side, or running out of time = fail.
   ========================================================= */
(function () {
  'use strict';

  const YEARS = 3;
  const START_POT = 50;   // doubles each year: £50 → £100 → £200 → £400 payout
  const LESSON = 'Small amounts invested early grow the most. Miss the years and you miss the growth.';

  Game.css('compound', `
    .ci-wrap { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; padding: 8px 20px 18px; gap: 14px; }
    .ci-top { flex: 1; min-height: 0; width: 100%; display: flex; align-items: center; justify-content: center; gap: 40px; }
    .ci-tree { width: 220px; height: 220px; }
    .ci-tree svg { width: 100%; height: 100%; display: block; overflow: visible; }
    .ci-tree .grow { animation: ci-grow .35s cubic-bezier(.2, 1.6, .4, 1) both; transform-origin: 100px 170px; }
    .ci-info { display: flex; flex-direction: column; gap: 14px; align-items: flex-start; }
    .ci-years { display: flex; gap: 10px; align-items: center; font-family: var(--font-display); font-size: 22px; }
    .ci-dot { width: 30px; height: 30px; border: 4px solid var(--ink); border-radius: 50%; background: var(--cream); }
    .ci-dot.on { background: var(--yellow); animation: ci-grow .3s cubic-bezier(.2, 1.6, .4, 1); }
    .ci-pot { width: 240px; }
    .ci-pot .receipt { font-size: 13px; padding: 10px 16px 24px; }
    .ci-pot-value { font-family: var(--font-display); font-size: 48px; line-height: 1; color: var(--stamp-good); }
    .ci-pot-value.pop { animation: ci-grow .3s cubic-bezier(.2, 1.6, .4, 1); }
    .ci-track { width: 700px; height: 78px; flex: none; position: relative; padding: 0 14px; display: flex; }
    .ci-half { flex: 1; }
    .ci-half.l { background: rgba(240, 74, 62, .16); border-right: 3px dashed var(--ink); }
    .ci-half.r { background: rgba(60, 203, 127, .16); }
    .ci-rail { position: absolute; inset: 10px 14px; }
    .ci-zone { position: absolute; top: 0; bottom: 0; background: var(--green); border: 4px solid var(--ink);
               border-radius: 10px; transition: left .18s ease-out, width .18s ease-out; }
    .ci-zone.new { animation: ci-flash .3s ease-out; }
    .ci-marker { position: absolute; top: 50%; width: 38px; height: 38px; margin: -19px 0 0 -19px;
                 background: var(--yellow); border: 4px solid var(--ink); border-radius: 50%;
                 box-shadow: 3px 3px 0 var(--ink); z-index: 2;
                 display: flex; align-items: center; justify-content: center;
                 font-family: var(--font-display); font-size: 18px; }
    .ci-labels { width: 700px; display: flex; justify-content: space-between; font-family: var(--font-display); font-size: 18px; margin-top: -8px; }
    @keyframes ci-grow { from { transform: scale(.4); } to { transform: scale(1); } }
    @keyframes ci-flash { from { transform: scaleY(1.4); } to { transform: scaleY(1); } }
  `);

  /* Money tree, drawn in SVG. Stage 0 = seed, 3 = full tree with coins. */
  function treeSvg(stage) {
    const pot = `
      <path d="M62 170 L138 170 L130 205 L70 205 Z" fill="#F04A3E" stroke="#111" stroke-width="5" stroke-linejoin="round"/>
      <rect x="56" y="160" width="88" height="16" rx="4" fill="#F04A3E" stroke="#111" stroke-width="5"/>`;
    const leaf = (x, y, rot) =>
      `<ellipse cx="${x}" cy="${y}" rx="20" ry="10" transform="rotate(${rot} ${x} ${y})" fill="#3CCB7F" stroke="#111" stroke-width="4"/>`;
    const coin = (x, y) =>
      `<circle cx="${x}" cy="${y}" r="10" fill="#FFD23F" stroke="#111" stroke-width="4"/>`;
    let plant = '';
    if (stage === 0) {
      plant = `<ellipse cx="100" cy="158" rx="10" ry="7" fill="#8B5A2B" stroke="#111" stroke-width="4"/>`;
    } else if (stage === 1) {
      plant = `<path d="M100 160 V125" stroke="#111" stroke-width="6" stroke-linecap="round"/>
               ${leaf(84, 128, -25)}${leaf(116, 122, 25)}`;
    } else if (stage === 2) {
      plant = `<path d="M100 160 V85" stroke="#111" stroke-width="7" stroke-linecap="round"/>
               ${leaf(82, 128, -25)}${leaf(118, 118, 25)}${leaf(80, 98, -30)}${leaf(120, 88, 30)}`;
    } else {
      plant = `<path d="M100 160 V95" stroke="#111" stroke-width="10" stroke-linecap="round"/>
               <circle cx="100" cy="70" r="58" fill="#3CCB7F" stroke="#111" stroke-width="5"/>
               ${coin(78, 52)}${coin(118, 44)}${coin(128, 82)}${coin(84, 92)}${coin(102, 68)}`;
    }
    return `<svg viewBox="0 0 200 210" aria-hidden="true"><g class="grow">${plant}</g>${pot}</svg>`;
  }

  let s = null;

  function placeZone(ctx) {
    const w = Math.max(0.07, 0.17 - 0.025 * s.hits - 0.02 * (ctx.speed - 1));
    let side;
    let x;
    // Try a few times to avoid spawning the zone right under the coin.
    for (let i = 0; i < 6; i++) {
      side = Math.random() < 0.5 ? 'left' : 'right';
      const lo = side === 'left' ? 0.03 : 0.53;
      const hi = side === 'left' ? 0.47 - w : 0.97 - w;
      x = lo + Math.random() * (hi - lo);
      if (s.x < x - 0.08 || s.x > x + w + 0.08) break;
    }
    s.zone = { side, x, w };
    const z = s.el.zone;
    z.style.left = x * 100 + '%';
    z.style.width = w * 100 + '%';
    z.classList.remove('new');
    void z.offsetWidth;
    z.classList.add('new');
  }

  function move() {
    const now = performance.now();
    const dt = (now - s.last) / 1000;
    s.last = now;
    s.x += s.dir * s.v * dt;
    if (s.x > 1) { s.x = 2 - s.x; s.dir = -1; }
    if (s.x < 0) { s.x = -s.x; s.dir = 1; }
    s.el.marker.style.left = s.x * 100 + '%';
  }

  function render() {
    s.el.tree.innerHTML = treeSvg(s.hits);
    s.el.pot.textContent = '£' + s.pot;
    s.el.pot.classList.remove('pop');
    void s.el.pot.offsetWidth;
    s.el.pot.classList.add('pop');
    s.el.dots.forEach((d, i) => d.classList.toggle('on', i < s.hits));
  }

  function hit(ctx) {
    s.hits++;
    s.pot *= 2;
    s.v *= 1.15;
    render();
    Game.sound.blip();
    if (s.hits >= YEARS) {
      s.done = true;
      ctx.end(true, {
        reward: s.pot,
        passWord: 'MONEY TREE!',
        passLabel: `£${START_POT} grew to £${s.pot}`,
      });
    } else {
      placeZone(ctx);
    }
  }

  Game.register({
    id: 'compound',
    name: 'Compound Interest',
    instruction: 'HIT THE GREEN!',
    subtitle: 'Press the side the green zone is on. 3 years in a row.',
    controls: { left: 'INVEST', right: 'INVEST' },
    duration: 6000,
    cost: 100,
    passOnTimeout: false,
    failWord: 'WITHERED!',
    timeoutWord: 'TOO SLOW!',
    timeoutLesson: "Compounding only works once you start. Every year you wait is growth you don't get.",
    lesson: LESSON,
    personality: { title: 'THE NOT-YET INVESTOR', roast: "You'll start saving next month. You said that last month too." },

    start(stage, ctx) {
      s = {
        hits: 0,
        pot: START_POT,
        x: Math.random() < 0.5 ? 0.02 : 0.98,
        dir: 1,
        v: 1.0 * ctx.speed, // track widths per second
        last: performance.now(),
        done: false,
        zone: null,
      };
      if (s.x > 0.5) s.dir = -1;

      stage.innerHTML = `
        <div class="ci-wrap">
          <div class="ci-top">
            <div class="ci-tree"></div>
            <div class="ci-info">
              <div class="ci-years">YEAR
                <span class="ci-dot"></span><span class="ci-dot"></span><span class="ci-dot"></span>
              </div>
              <div class="receipt-wrap ci-pot"><div class="receipt">
                <div class="line bold"><span>INVESTED</span><span>£${START_POT}.00</span></div>
                <div class="dash"></div>
                <span>NOW WORTH</span>
                <span class="ci-pot-value">£${START_POT}</span>
              </div></div>
            </div>
          </div>
          <div class="ci-track sticker">
            <div class="ci-half l"></div><div class="ci-half r"></div>
            <div class="ci-rail">
              <div class="ci-zone"></div>
              <div class="ci-marker">£</div>
            </div>
          </div>
          <div class="ci-labels"><span>← LEFT SIDE</span><span>RIGHT SIDE →</span></div>
        </div>`;

      const q = (sel) => stage.querySelector(sel);
      s.el = {
        tree: q('.ci-tree'), pot: q('.ci-pot-value'), zone: q('.ci-zone'),
        marker: q('.ci-marker'), dots: [...stage.querySelectorAll('.ci-dot')],
      };
      s.el.tree.innerHTML = treeSvg(0);
      s.el.marker.style.left = s.x * 100 + '%';
      placeZone(ctx);
      ctx.every(16, move);
    },

    onInput(button, pressed, ctx) {
      if (!pressed || !s || s.done) return;
      move(); // judge against the exact position right now
      const z = s.zone;
      const inZone = s.x >= z.x - 0.015 && s.x <= z.x + z.w + 0.015;
      if (inZone && button === z.side) {
        hit(ctx);
        return;
      }
      s.done = true;
      ctx.end(false, {
        failWord: inZone ? 'WRONG SIDE!' : 'WITHERED!',
        failLabel: s.hits ? `Lost £${s.pot} after ${s.hits} year${s.hits > 1 ? 's' : ''}` : 'Missed the first year',
        lesson: inZone ? 'Right time, wrong side. Check where the green zone is before you press.' : LESSON,
      });
    },

    cleanup() { s = null; },
  });
})();
