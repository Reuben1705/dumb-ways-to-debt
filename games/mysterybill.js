/* =========================================================
   MYSTERY BILL: pick an envelope. Owner: Person 3
   ← LEFT ENVELOPE   RIGHT ENVELOPE →

   The post has arrived: two identical envelopes. One holds
   good news (a refund, a gift, a win), the other a bill.
   Pick one. It's luck, like real life's surprise costs.
   Good news = pass, you gain the amount.
   Bill      = fail, you pay it.
   Not picking = fail: ignoring the post doesn't make bills go away.
   ========================================================= */
(function () {
  'use strict';

  const GOOD = [
    { name: 'TAX REFUND', min: 120, max: 300 },
    { name: 'BIRTHDAY MONEY', min: 50, max: 150 },
    { name: 'PREMIUM BONDS WIN', min: 100, max: 250 },
    { name: 'ENERGY BILL REFUND', min: 80, max: 200 },
    { name: 'COUNCIL TAX REBATE', min: 100, max: 220 },
    { name: 'CASHBACK', min: 50, max: 120 },
    { name: 'FORGOTTEN SAVINGS ACCOUNT', min: 150, max: 300 },
    { name: 'DEPOSIT RETURNED', min: 150, max: 300 },
  ];
  const BAD = [
    { name: 'VET BILL', min: 150, max: 300 },
    { name: 'PARKING FINE', min: 70, max: 140 },
    { name: 'BOILER REPAIR', min: 180, max: 300 },
    { name: 'FAILED MOT', min: 120, max: 260 },
    { name: 'DENTIST BILL', min: 90, max: 220 },
    { name: 'CRACKED PHONE SCREEN', min: 100, max: 200 },
    { name: 'OVERDRAFT FEES', min: 60, max: 150 },
    { name: 'LATE PAYMENT CHARGE', min: 50, max: 120 },
  ];

  const REVEAL_MS = 650;
  const LESSON = "Surprise bills always turn up. Keep an emergency fund so one doesn't knock you over.";
  const round5 = (n) => Math.round(n / 5) * 5;

  Game.css('mysterybill', `
    .mb-wrap { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 18px; }
    .mb-title { font-family: var(--font-display); font-size: 26px; padding: 4px 18px; background: var(--cream); }
    .mb-row { display: flex; gap: 70px; align-items: flex-end; }
    .mb-slot { width: 250px; height: 250px; position: relative; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; gap: 10px; }
    .mb-env { position: relative; width: 240px; height: 150px; animation: mb-wobble 1.4s ease-in-out infinite; transform-origin: 50% 100%; }
    .mb-slot.r .mb-env { animation-delay: -.7s; }
    .mb-env svg { display: block; width: 100%; height: 100%; overflow: visible; filter: drop-shadow(6px 6px 0 var(--ink)); }
    .mb-flap { transform-box: fill-box; transform-origin: 50% 0; transition: transform .25s ease-in; }
    .mb-letter { position: absolute; left: 22px; right: 22px; top: 18px; height: 110px; z-index: -1;
                 background: var(--paper); border: 4px solid var(--ink); border-radius: 8px;
                 display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; padding: 6px;
                 text-align: center; transition: transform .35s cubic-bezier(.2, 1.4, .4, 1) .12s; }
    .mb-letter-name { font-family: var(--font-receipt); font-weight: 700; font-size: 13px; line-height: 1.15; }
    .mb-letter-amt { font-family: var(--font-display); font-size: 34px; line-height: 1; }
    .mb-letter.good .mb-letter-amt { color: var(--stamp-good); }
    .mb-letter.bad .mb-letter-amt { color: var(--stamp); }
    .mb-key { font-family: var(--font-display); font-size: 26px; padding: 2px 18px; }
    .mb-slot.l .mb-key { background: var(--red); }
    .mb-slot.r .mb-key { background: var(--green); }
    .mb-slot.open .mb-env { animation: none; }
    .mb-slot.open .mb-flap { transform: scaleY(-1); }
    .mb-slot.open .mb-letter { transform: translateY(-96px); z-index: 2; }
    .mb-wrap.revealed .mb-title { visibility: hidden; }
    .mb-slot.other { opacity: .55; }
    .mb-slot.other .mb-env { animation: none; transform: scale(.9); }
    @keyframes mb-wobble { 0%, 100% { transform: rotate(-2deg); } 50% { transform: rotate(2deg) translateY(-4px); } }
  `);

  const ENVELOPE = `<svg viewBox="0 0 240 150" aria-hidden="true">
    <rect x="3" y="3" width="234" height="144" rx="10" fill="#FFF8E7" stroke="#111" stroke-width="5"/>
    <path d="M6 140 L104 74 M234 140 L136 74" stroke="#111" stroke-width="4" stroke-linecap="round"/>
    <path class="mb-flap" d="M5 6 L120 92 L235 6 Z" fill="#F3E6C4" stroke="#111" stroke-width="5" stroke-linejoin="round"/>
    <rect x="186" y="16" width="34" height="40" rx="3" fill="#FFD23F" stroke="#111" stroke-width="4"/>
    <text x="203" y="44" text-anchor="middle" font-family="Lilita One, Arial Black, sans-serif" font-size="24" fill="#111">?</text>
    <circle cx="120" cy="92" r="16" fill="#F04A3E" stroke="#111" stroke-width="4"/>
  </svg>`;

  let s = null;

  function letterHtml(item) {
    return `<span class="mb-letter-name">${item.name}</span>
            <span class="mb-letter-amt">${item.good ? '+' : '−'}£${item.amount}</span>`;
  }

  function finish(ctx, item) {
    if (item.good) {
      ctx.end(true, {
        reward: item.amount,
        passWord: 'LUCKY!',
        passLabel: item.name,
        passRight: `+£${item.amount}.00`,
      });
    } else {
      ctx.end(false, {
        failWord: 'BILL!',
        failLabel: item.name,
        cost: item.amount,
        lesson: LESSON,
      });
    }
  }

  function choose(side, ctx) {
    s.done = true;
    const mine = s.items[side];
    const otherSide = side === 'left' ? 'right' : 'left';
    s.el.wrap.classList.add('revealed');
    s.el[side].classList.add('open');
    s.el[otherSide].classList.add('open', 'other');
    Game.sound.whoosh();
    // Don't let the reveal run past the round's timer.
    const left = ctx.duration - (performance.now() - s.t0) - 60;
    const wait = Math.max(0, Math.min(REVEAL_MS, left));
    if (wait <= 0) finish(ctx, mine);
    else ctx.after(wait, () => finish(ctx, mine));
  }

  Game.register({
    id: 'mysterybill',
    name: 'Mystery Bill',
    instruction: 'PICK AN ENVELOPE!',
    subtitle: 'One is good news. One is a bill.',
    controls: { left: 'THIS ONE', right: 'THIS ONE' },
    duration: 4500,
    cost: 150,                 // overridden by the bill's amount
    passOnTimeout: false,
    failWord: 'BILL!',
    timeoutWord: 'IGNORED IT!',
    timeoutLesson: "Ignoring the post doesn't make bills go away. Open it, then make a plan.",
    lesson: LESSON,

    start(stage, ctx) {
      const good = ctx.pick(GOOD);
      const bad = ctx.pick(BAD);
      const g = { name: good.name, good: true, amount: round5(ctx.rand(good.min, good.max)) };
      const b = { name: bad.name, good: false, amount: round5(ctx.rand(bad.min, bad.max)) };
      const goodLeft = Math.random() < 0.5;
      s = {
        items: { left: goodLeft ? g : b, right: goodLeft ? b : g },
        done: false,
        t0: performance.now(),
      };

      stage.innerHTML = `
        <div class="mb-wrap">
          <div class="mb-title sticker">THE POST HAS ARRIVED...</div>
          <div class="mb-row">
            <div class="mb-slot l">
              <div class="mb-env">
                <div class="mb-letter ${s.items.left.good ? 'good' : 'bad'}">${letterHtml(s.items.left)}</div>
                ${ENVELOPE}
              </div>
              <span class="mb-key sticker">←</span>
            </div>
            <div class="mb-slot r">
              <div class="mb-env">
                <div class="mb-letter ${s.items.right.good ? 'good' : 'bad'}">${letterHtml(s.items.right)}</div>
                ${ENVELOPE}
              </div>
              <span class="mb-key sticker">→</span>
            </div>
          </div>
        </div>`;
      s.el = {
        wrap: stage.querySelector('.mb-wrap'),
        left: stage.querySelector('.mb-slot.l'),
        right: stage.querySelector('.mb-slot.r'),
      };

      // Never picked? You get the bill anyway (with its real amount).
      ctx.after(ctx.duration - 80, () => {
        if (!s || s.done) return;
        s.done = true;
        const badSide = s.items.left.good ? 'right' : 'left';
        const bill = s.items[badSide];
        s.el.wrap.classList.add('revealed');
        s.el[badSide].classList.add('open');
        ctx.end(false, {
          failWord: 'IGNORED IT!',
          failLabel: `Ignored the ${bill.name.toLowerCase()}`,
          cost: bill.amount,
          lesson: "Ignoring the post doesn't make bills go away. Open it, then make a plan.",
        });
      });
    },

    onInput(button, pressed, ctx) {
      if (!pressed || !s || s.done) return;
      choose(button, ctx);
    },

    cleanup() { s = null; },
  });
})();
