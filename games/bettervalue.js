/* =========================================================
   BETTER VALUE: pick-a-side game, supermarket shelf look.
   ← THIS ONE   THIS ONE →
   Two products on a shelf. Press the side that's the better
   deal (cheaper per item / per kg). This is the one game
   where left/right means a SIDE, not no/yes, so the buttons
   turn yellow while it's on.
   Deals are generated fresh every round, so it never repeats.
   From speed ×1.25, fake "BIG SAVING!" stickers turn up on
   the worse deal, and the price gap gets smaller.
   Doing nothing = fail.
   ========================================================= */
(function () {
  'use strict';

  // type 'count' = priced per item, 'weight' = priced per kg.
  // unit = rough real-world price per item (in pence) or per kg (in pounds).
  const PRODUCTS = [
    { name: 'Baked Beans', icon: '🥫', type: 'count', unit: [55, 110], color: '#7FD1F7' },
    { name: 'Loo Roll',    icon: '🧻', type: 'count', unit: [30, 60],  color: '#FFFFFF' },
    { name: 'Cola Cans',   icon: '🥤', type: 'count', unit: [45, 90],  color: '#F04A3E' },
    { name: 'Choc Bars',   icon: '🍫', type: 'count', unit: [45, 100], color: '#B44CF0' },
    { name: 'Eggs',        icon: '🥚', type: 'count', unit: [20, 35],  color: '#FFD23F' },
    { name: 'Bananas',     icon: '🍌', type: 'count', unit: [15, 30],  color: '#FFF08A' },
    { name: 'Pasta',       icon: '🍝', type: 'weight', unit: [1.2, 2.6], color: '#FFB347' },
    { name: 'Coffee',      icon: '☕', type: 'weight', unit: [12, 24],  color: '#A9744F' },
    { name: 'Cheddar',     icon: '🧀', type: 'weight', unit: [7, 12],   color: '#FFD23F' },
    { name: 'Cereal',      icon: '🥣', type: 'weight', unit: [3, 6],    color: '#3CCB7F' },
    { name: 'Biscuits',    icon: '🍪', type: 'weight', unit: [3, 6],    color: '#FFB3C7' },
  ];
  const COUNTS = [1, 2, 3, 4, 6, 8, 10, 12];
  const GRAMS = [250, 300, 400, 500, 750, 1000, 1500];
  const STICKERS = ['BIG SAVING!', 'MEGA DEAL!', 'BEST VALUE*', 'HALF PRICE*', 'WOW!'];

  /* ---------- money helpers ---------- */
  const round5 = (p) => Math.max(5, Math.round(p / 5) * 5);        // pence, to nearest 5p
  const money = (p) => (p < 100 ? `${p}p` : `£${(p / 100).toFixed(2)}`);
  const perItem = (p) => (p < 100 ? `${Math.round(p)}p each` : `£${(p / 100).toFixed(2)} each`);
  const perKg = (p) => `£${(p / 100).toFixed(2)}/kg`;

  // Gap between the good and bad deal: big at the start, small later.
  function gapFor(speed) {
    if (speed >= 2) return [0.05, 0.12];
    if (speed >= 1.5) return [0.07, 0.16];
    if (speed >= 1.25) return [0.10, 0.22];
    return [0.15, 0.35];
  }

  // Build one shelf item: what the label says + its true unit price.
  function makeDeal(product, size, unitPence, ctx, allowMultibuy) {
    const d = { size };
    if (product.type === 'count') {
      // "Buy 2 get 1 free": you pay for 2, get 3.
      if (allowMultibuy && size === 3 && Math.random() < 0.5) {
        const each = round5(unitPence * 1.5);
        d.price = each * 2;
        d.big = `${money(each)} each`;
        d.line = 'BUY 2 GET 1 FREE';
        d.small = '3 in the deal';
      } else {
        d.price = round5(unitPence * size);
        if (size === 1) { d.big = money(d.price); d.line = 'SINGLE'; d.small = '1 item'; }
        else if (Math.random() < 0.5) { d.big = `${size} FOR ${money(d.price)}`; d.line = 'MULTIBUY'; d.small = `${size} items`; }
        else { d.big = money(d.price); d.line = `PACK OF ${size}`; d.small = `${size} items`; }
      }
      d.unit = d.price / size;
      d.unitText = perItem(d.unit);
    } else {
      d.price = round5(unitPence * (size / 1000));
      d.big = money(d.price);
      d.line = size >= 1000 ? `${size / 1000}KG` : `${size}g`;
      d.small = size >= 1000 ? 'family size' : 'regular';
      d.unit = d.price / (size / 1000);
      d.unitText = perKg(d.unit);
    }
    return d;
  }

  // Keep trying until the "better" deal really is better after rounding.
  function makeRound(ctx) {
    const [gMin, gMax] = gapFor(ctx.speed);
    for (let tries = 0; tries < 60; tries++) {
      const product = ctx.pick(PRODUCTS);
      const sizes = product.type === 'count' ? COUNTS : GRAMS;
      const a = ctx.pick(sizes);
      let b = ctx.pick(sizes);
      if (a === b) continue;

      const [lo, hi] = product.unit;
      const r = lo + Math.random() * (hi - lo);                // not ctx.rand: that only does whole numbers
      const base = product.type === 'count' ? r : r * 100;     // pence
      const gap = gMin + Math.random() * (gMax - gMin);

      // Usually the bigger pack is the better deal... but not always.
      const bigIsBetter = Math.random() < 0.55;
      const big = Math.max(a, b), small = Math.min(a, b);
      const goodSize = bigIsBetter ? big : small;
      const badSize = bigIsBetter ? small : big;

      const good = makeDeal(product, goodSize, base, ctx, true);
      const bad = makeDeal(product, badSize, base * (1 + gap), ctx, true);
      const realGap = bad.unit / good.unit - 1;
      if (realGap < 0.05 || realGap > 0.6) continue;
      if (good.unitText === bad.unitText) continue;          // must look different to the player

      const goodOnLeft = Math.random() < 0.5;
      return { product, good, bad, goodOnLeft, left: goodOnLeft ? good : bad, right: goodOnLeft ? bad : good };
    }
    // Fallback that's always valid.
    const product = PRODUCTS[0];
    const good = makeDeal(product, 4, 60, ctx, false);
    const bad = makeDeal(product, 1, 85, ctx, false);
    return { product, good, bad, goodOnLeft: true, left: good, right: bad };
  }

  Game.css('bettervalue', `
    #frame.bv-on .ctl { background: var(--yellow); }

    .bv-shop { position: absolute; inset: 4px 20px 6px; border: 5px solid var(--ink); border-radius: 18px;
      box-shadow: 6px 6px 0 var(--ink); overflow: hidden;
      background:
        linear-gradient(#0000 0 0),
        repeating-linear-gradient(0deg, #E8DFC8 0 2px, #0000 2px 46px),
        repeating-linear-gradient(90deg, #E8DFC8 0 2px, #0000 2px 46px),
        #FFF8E7; }
    .bv-sign { position: absolute; left: 50%; top: 10px; transform: translateX(-50%) rotate(-1.5deg); z-index: 2;
      font-size: 18px; }
    .bv-sign::before, .bv-sign::after { content: ''; position: absolute; top: -14px; width: 3px; height: 12px; background: var(--ink); }
    .bv-sign::before { left: 20%; } .bv-sign::after { right: 20%; }

    .bv-bays { position: absolute; left: 0; right: 0; top: 52px; bottom: 0; display: grid; grid-template-columns: 1fr 1fr; }
    .bv-bay { position: relative; display: flex; flex-direction: column; align-items: center; justify-content: flex-end;
      padding-bottom: 112px; transition: opacity .2s; }
    .bv-bay + .bv-bay { border-left: 4px dashed #D9CDB0; }

    .bv-pack { --s: 1; position: relative; width: calc(150px * var(--s)); height: calc(150px * var(--s));
      background: var(--pc); border: 4px solid var(--ink); border-radius: 14px; box-shadow: 5px 5px 0 var(--ink);
      display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px;
      transition: transform .18s cubic-bezier(.2, 1.6, .4, 1); animation: bv-drop .35s cubic-bezier(.2, 1.4, .4, 1) both; }
    .bv-bay:nth-child(2) .bv-pack { animation-delay: .08s; }
    .bv-icons { display: flex; flex-wrap: wrap; justify-content: center; max-width: 90%; line-height: 1; }
    .bv-icons span { font-size: calc(44px * var(--s)); }
    .bv-icons.many span { font-size: calc(26px * var(--s)); }
    .bv-pname { font-family: var(--font-display); font-size: 15px; background: var(--cream); border: 3px solid var(--ink);
      border-radius: 8px; padding: 0 8px; white-space: nowrap; }
    .bv-qty { position: absolute; right: -16px; top: -16px; font-family: var(--font-display); font-size: 19px;
      background: var(--cream); border: 3px solid var(--ink); border-radius: 999px; min-width: 46px; height: 44px;
      padding: 0 9px; display: grid; place-items: center; white-space: nowrap; transform: rotate(10deg); }

    .bv-shelf { position: absolute; left: 0; right: 0; bottom: 92px; height: 20px; background: #C9CED6;
      border-top: 4px solid var(--ink); border-bottom: 4px solid var(--ink); }
    .bv-tag { position: absolute; top: calc(100% - 84px); left: 50%; transform: translateX(-50%) rotate(var(--tr, 0deg));
      width: 230px; background: var(--yellow); border: 4px solid var(--ink); border-radius: 6px;
      box-shadow: 4px 4px 0 var(--ink); padding: 4px 10px 5px; text-align: center; }
    .bv-tag .t-line { font-family: var(--font-receipt); font-weight: 700; font-size: 12px; letter-spacing: 1px; }
    .bv-tag .t-big { font-family: var(--font-display); font-size: 30px; line-height: 1; }
    .bv-tag .t-was { text-decoration: line-through; color: #555; margin-left: 6px; }
    .bv-tag .t-small { font-family: var(--font-receipt); font-size: 12px; }

    .bv-burst { position: absolute; z-index: 3; width: 124px; height: 124px; left: -62px; top: -50px;
      background: var(--red); color: #fff; display: grid; place-items: center; text-align: center;
      font-family: var(--font-display); font-weight: 900; font-size: 19px; line-height: 1; padding: 22px; text-shadow: 2px 2px 0 var(--ink);
      clip-path: polygon(50% 0, 61% 18%, 82% 10%, 80% 32%, 100% 40%, 85% 56%, 98% 76%, 76% 78%, 70% 100%, 52% 86%, 32% 100%, 26% 79%, 3% 78%, 15% 58%, 0 40%, 20% 32%, 17% 10%, 39% 18%);
      animation: bv-wobble .5s ease-in-out infinite alternate; }

    .bv-bay.picked .bv-pack { transform: translateY(-34px) rotate(-5deg) scale(1.06); }
    .bv-bay.other { opacity: .45; }

    @keyframes bv-drop { from { transform: translateY(-320px); } }
    @keyframes bv-wobble { from { transform: rotate(-10deg) scale(1); } to { transform: rotate(6deg) scale(1.08); } }
  `);

  let frame = null;
  let rnd = null;
  let stickerSide = null;
  let answered = false;

  function bayHtml(deal, product, ctx, maxSize, side, opts) {
    const n = product.type === 'count' ? deal.size : 1;
    const shown = Math.min(n, 6);
    const icons = Array.from({ length: shown }, () => `<span>${product.icon}</span>`).join('');
    // Bigger packs look bigger on the shelf (tempting!)
    const scale = product.type === 'count'
      ? 0.78 + 0.32 * (deal.size / maxSize)
      : 0.7 + 0.4 * (deal.size / maxSize);
    const qty = product.type === 'count' ? `×${deal.size}` : deal.line;
    const was = opts.was ? `<span class="t-was">WAS ${money(opts.was)}</span>` : '';
    const sticker = opts.sticker ? `<div class="bv-burst">${ctx.esc(opts.sticker)}</div>` : '';
    return `
      <div class="bv-bay" data-side="${side}">
        <div class="bv-pack" style="--s:${scale.toFixed(2)};--pc:${product.color}">
          ${sticker}
          <div class="bv-icons ${shown > 2 ? 'many' : ''}">${icons}</div>
          <div class="bv-pname">${ctx.esc(product.name)}</div>
          <div class="bv-qty">${ctx.esc(qty)}</div>
        </div>
        <div class="bv-tag" style="--tr:${ctx.rand(-3, 3)}deg">
          <div class="t-line">${ctx.esc(deal.line)}${was}</div>
          <div class="t-big">${ctx.esc(deal.big)}</div>
          <div class="t-small">${ctx.esc(deal.small)}</div>
        </div>
      </div>`;
  }

  Game.register({
    id: 'bettervalue',
    name: 'Better Value',
    instruction: 'PICK THE BETTER DEAL!',
    subtitle: 'Cheapest per item or per kg wins',
    readTime: 1500,          // extra time on the instruction screen
    controls: { left: 'THIS ONE', right: 'THIS ONE' },
    duration: 6000,          // ms at speed ×1 (there's maths involved!)
    cost: 100,
    passOnTimeout: false,    // standing in the aisle forever = fail
    failWord: 'RIPPED OFF!',
    timeoutWord: 'TOO SLOW!',
    timeoutLesson: 'Stuck? The small print on a shelf label shows the price per item or per kg. Compare that, not the big number.',
    lesson: 'Compare the price per item or per kg, not the price on the sticker.',
    personality: {
      title: 'THE STICKER SUCKER',
      roast: [
        "If it says SALE, you're already at the till.",
        'You bought 12 pineapples because it said BOGOF.',
        'A yellow sticker could sell you anything.',
        "You've never once looked at the price per kg.",
        'Supermarkets put their worst deals at eye level. For you.',
      ],
    },

    start(stage, ctx) {
      answered = false;
      rnd = makeRound(ctx);
      const { product } = rnd;

      // Misleading sticker: random side early on, worse deal later.
      stickerSide = null;
      if (ctx.speed >= 1.25 ? Math.random() < 0.75 : Math.random() < 0.3) {
        const badSide = rnd.goodOnLeft ? 'right' : 'left';
        stickerSide = ctx.speed >= 1.25 ? badSide : ctx.pick(['left', 'right']);
      }
      // Fake "WAS" price on the worse deal from ×1.5.
      const fakeWas = ctx.speed >= 1.5 && Math.random() < 0.5
        ? round5(rnd.bad.price * (1.25 + Math.random() * 0.4)) : null;

      const maxSize = Math.max(rnd.left.size, rnd.right.size);
      const optsFor = (side, deal) => ({
        sticker: stickerSide === side ? ctx.pick(STICKERS) : null,
        was: deal === rnd.bad ? fakeWas : null,
      });

      stage.innerHTML = `
        <div class="bv-shop">
          <div class="bv-sign pill">AISLE ${ctx.rand(2, 14)} · ${ctx.esc(product.name.toUpperCase())}</div>
          <div class="bv-bays">
            ${bayHtml(rnd.left, product, ctx, maxSize, 'left', optsFor('left', rnd.left))}
            ${bayHtml(rnd.right, product, ctx, maxSize, 'right', optsFor('right', rnd.right))}
          </div>
          <div class="bv-shelf"></div>
        </div>`;

      frame = stage.closest('#frame') || document.getElementById('frame');
      if (frame) frame.classList.add('bv-on');
    },

    onInput(button, pressed, ctx) {
      if (!pressed || answered) return;
      answered = true;
      const pickedLeft = button === 'left';
      const stage = document.querySelector('.bv-bays');
      if (stage) {
        stage.querySelector(`[data-side="${button}"]`).classList.add('picked');
        stage.querySelector(`[data-side="${pickedLeft ? 'right' : 'left'}"]`).classList.add('other');
      }

      const correct = pickedLeft === rnd.goodOnLeft;
      const L = rnd.left.unitText, R = rnd.right.unitText;
      const unitWord = rnd.product.type === 'count' ? 'item' : 'kg';

      if (correct) {
        ctx.end(true, {
          passWord: ctx.pick(['BARGAIN!', 'SAVVY!', 'SMART!']),
          passLabel: 'Better deal picked',
          passRight: rnd.good.unitText.toUpperCase(),
        });
      } else {
        const fooled = stickerSide === button;
        ctx.end(false, {
          lesson: `${fooled ? 'That sticker lied! ' : ''}Left works out at ${L}, right at ${R}. Always check the price per ${unitWord}.`,
        });
      }
    },

    cleanup() {
      if (frame) frame.classList.remove('bv-on');
      frame = null;
      rnd = null;
    },
  });
})();
