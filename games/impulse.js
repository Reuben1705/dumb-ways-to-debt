/* =========================================================
   IMPULSE BUY: hands-off game.
   It's 2am and adverts keep popping up. Press NOTHING.
   handsOff: true makes the engine fail you on any press,
   so this game doesn't need an onInput at all.
   ========================================================= */
(function () {
  'use strict';

  const ADS = [
    ['Gold-plated toaster', '£299'],
    ['NFT of a sandwich', '£80'],
    ['Heated phone case', '£45'],
    ['Daily sock subscription', '£19/day'],
    ['Canned mountain air', '£25'],
    ['Bluetooth spoon', '£120'],
    ['Mystery box (probably empty)', '£60'],
    ['Diamond phone charger', '£400'],
    ['Inflatable office chair', '£95'],
    ['Course: Get Rich by Friday', '£499'],
  ];

  Game.css('impulse', `
    .ib-screen { position: absolute; inset: 6px 20px 14px; overflow: hidden;
                 background: var(--night); border: 5px solid var(--ink); border-radius: 22px;
                 box-shadow: 6px 6px 0 var(--ink); }
    .ib-clock { position: absolute; left: 18px; top: 12px; font-family: var(--font-receipt);
                font-weight: 700; font-size: 18px; color: var(--cream); }
    .ib-zzz { position: absolute; right: 18px; top: 10px; font-family: var(--font-display);
              font-size: 20px; color: var(--yellow); }
    .ib-ad { --rot: 0deg; position: absolute; width: 196px; padding: 10px 12px 12px;
             display: flex; flex-direction: column; gap: 6px; align-items: flex-start;
             transform: rotate(var(--rot)); animation: ib-pop .22s cubic-bezier(.2, 1.6, .4, 1) both; }
    .ib-name { font-weight: 800; font-size: 15px; line-height: 1.2; }
    .ib-price { font-family: var(--font-display); font-size: 26px; color: var(--stamp); }
    .ib-buy { font-family: var(--font-display); font-size: 18px; background: var(--yellow);
              border: 3px solid var(--ink); border-radius: 10px; padding: 2px 12px;
              animation: pulse .35s ease-in-out infinite alternate; }
    @keyframes ib-pop { from { transform: scale(0) rotate(var(--rot)); } to { transform: scale(1) rotate(var(--rot)); } }
  `);

  Game.register({
    id: 'impulse',
    name: 'Impulse Buy',
    instruction: "DON'T BUY ANYTHING!",
    handsOff: true,          // any press = fail (engine handles it)
    passOnTimeout: true,     // surviving the timer = pass
    duration: 3600,
    cost: 100,
    failWord: 'SKINT!',
    passWord: 'WILLPOWER!',
    passLabel: 'Impulse resisted',
    lesson: "If you wouldn't buy it at 2pm, don't buy it at 2am.",
    personality: { title: 'THE 2AM SHOPPER', roast: 'Your basket has more in it than your bank account.' },

    start(stage, ctx) {
      stage.innerHTML = `
        <div class="ib-screen">
          <div class="ib-clock">2:13 AM</div>
          <div class="ib-zzz">you should be asleep</div>
        </div>`;
      const screen = stage.firstElementChild;

      const spawn = () => {
        const [name, price] = ctx.pick(ADS);
        const ad = document.createElement('div');
        ad.className = 'ib-ad sticker';
        ad.style.left = ctx.rand(14, 540) + 'px';
        ad.style.top = ctx.rand(44, 230) + 'px';
        ad.style.setProperty('--rot', ctx.rand(-8, 8) + 'deg');
        ad.innerHTML = `
          <div class="ib-name">${ctx.esc(name)}</div>
          <div class="ib-price">${ctx.esc(price)}</div>
          <div class="ib-buy">BUY NOW</div>`;
        screen.appendChild(ad);
        Game.sound.blip();
      };

      spawn();
      ctx.every(Math.round(550 / ctx.speed), spawn);
    },
  });
})();
