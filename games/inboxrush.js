/* =========================================================
   SCAM INBOX RUSH: BOSS ROUND (every 10th round). Owner: Person 3
   ← BIN   OPEN →

   10 emails fired at you one after another.
   Bin the scams, open the real ones.
   3 mistakes = INBOX HACKED. Clear all 10 with 2 or fewer
   mistakes to win the biggest reward in the game.

   Test it directly: test.html?game=inboxrush
   ========================================================= */
(function () {
  'use strict';

  const TOTAL = 10;
  const MAX_WRONG = 3;
  const SCAM_COUNT = 6; // out of TOTAL; the rest are real

  const SCAMS = [
    { from: 'security@paypa1-help.com', subject: 'URGENT: Account LOCKED!!', lesson: "'paypa1' is not PayPal. Always check the sender's address." },
    { from: 'HMRC <refund@hmrc-gov-uk.co>', subject: 'Tax refund of £482.19 waiting', lesson: 'HMRC never emails you a link to claim a refund.' },
    { from: 'Royal Mail <redeliver@royalmail-parcels.info>', subject: 'Pay £1.45 to rebook delivery', lesson: 'Tiny "redelivery fees" are a classic way to steal card details.' },
    { from: 'Netflix <billing@netfl1x-account.com>', subject: 'Payment declined: update now', lesson: "Fake urgency is a red flag. Log in through the app, not the email." },
    { from: 'CEO <ceo.office.private@gmail.com>', subject: 'Need 5 gift cards. Keep it quiet', lesson: "Bosses don't ask for gift cards from a Gmail address." },
    { from: 'IT Support <helpdesk@yourcompany-support.net>', subject: 'Password expires today', lesson: 'yourcompany-support.net is not your company. Check the domain.' },
    { from: 'Amazon <orders@amazon.co.uk.order-help.net>', subject: 'iPhone £1,199 ordered. Cancel?', lesson: 'Read domains right to left. This one ends in order-help.net.' },
    { from: 'Student Finance <grants@studentfinance-uk.org>', subject: 'Grant approved: confirm bank login', lesson: 'No real grant ever asks for your bank login.' },
    { from: 'DVLA <refunds@dvla-gov.info>', subject: 'Vehicle tax refund: claim within 24h', lesson: 'Government sites end in .gov.uk, not .info.' },
    { from: 'WhatsApp <verify@whatsapp-security.net>', subject: 'Your account will be DELETED', lesson: 'Threats to delete your account are a pressure tactic.' },
    { from: 'UK Lotto <winner@uk-lotto-claims.com>', subject: 'You WON £1,000,000!!!', lesson: "You can't win a lottery you never entered." },
    { from: 'Crypto King <moon@crypto-doubler.biz>', subject: 'Send 1 BTC, get 2 BTC back', lesson: 'Nobody doubles your money for free. Ever.' },
  ];

  const REAL = [
    { from: 'Sarah (Manager) <s.mcleod@yourcompany.co.uk>', subject: 'Rota for next week' },
    { from: 'Jamie <j.oconnor@student.gla.ac.uk>', subject: 'Slides done, can you check?' },
    { from: 'Thistle Bank <alerts@thistlebank.co.uk>', subject: 'Your statement is ready in the app' },
    { from: 'Mum <mum@outlook.com>', subject: 'Sunday dinner? Bring the tupperware' },
    { from: 'Timetabling <timetable@gla.ac.uk>', subject: 'Tuesday lecture moved to room 204' },
    { from: 'Smile Dental <reminders@smiledental.co.uk>', subject: 'Appointment tomorrow at 10am' },
    { from: 'Hackathon Team <team@hackathon.dev>', subject: 'Pizza arrives at 7pm' },
  ];

  Game.css('inboxrush', `
    .ir-wrap { position: absolute; inset: 0; display: flex; flex-direction: column; padding: 4px 20px 14px; gap: 10px; }
    .ir-top { height: 40px; flex: none; display: flex; align-items: center; justify-content: space-between; }
    .ir-dots { display: flex; gap: 8px; }
    .ir-dot { width: 24px; height: 24px; border: 4px solid var(--ink); border-radius: 50%; background: var(--cream); }
    .ir-dot.now { background: var(--yellow); animation: pulse .4s ease-in-out infinite alternate; }
    .ir-dot.ok { background: var(--green); }
    .ir-dot.bad { background: var(--red); }
    .ir-strikes { display: flex; align-items: center; gap: 8px; font-family: var(--font-display); font-size: 18px; }
    .ir-strike { width: 30px; height: 30px; border: 4px solid var(--ink); border-radius: 8px; background: var(--cream);
                 display: flex; align-items: center; justify-content: center; font-size: 20px; line-height: 1;
                 color: transparent; }
    .ir-strike.on { background: var(--stamp); color: var(--cream); animation: pulse .25s 2 alternate; }
    .ir-main { flex: 1; min-height: 0; display: flex; align-items: center; gap: 18px; }
    .ir-pile { width: 120px; flex: none; position: relative; height: 150px; }
    .ir-env { position: absolute; left: 6px; width: 100px; height: 64px; background: var(--cream);
              border: 4px solid var(--ink); border-radius: 8px; box-shadow: 4px 4px 0 var(--ink); overflow: hidden; }
    .ir-env::before { content: ''; position: absolute; left: -4px; right: -4px; top: -34px; height: 64px;
                      border: 4px solid var(--ink); transform: rotate(45deg) scale(.7); transform-origin: center; background: var(--paper); }
    .ir-count { position: absolute; left: 0; right: 0; bottom: 0; text-align: center;
                font-family: var(--font-display); font-size: 22px; }
    .ir-slot { flex: 1; position: relative; height: 100%; }
    .ir-card { position: absolute; left: 50%; top: 50%; width: 470px; margin-left: -235px; transform: translateY(-50%);
               animation: ir-in .2s cubic-bezier(.2, 1.3, .4, 1) both; }
    .ir-card .receipt { gap: 8px; padding: 16px 24px 30px; }
    .ir-head { display: flex; justify-content: space-between; font-size: 13px; letter-spacing: 2px; font-weight: 700; }
    .ir-from { font-size: 15px; font-weight: 700; overflow-wrap: anywhere; }
    .ir-subject { font-family: var(--font-display); font-size: 27px; line-height: 1.05; }
    .ir-card.out-left { animation: ir-left .25s ease-in forwards; }
    .ir-card.out-right { animation: ir-right .25s ease-in forwards; }
    .ir-mark { position: absolute; right: -16px; top: -16px; width: 44px; height: 44px; border-radius: 50%;
               border: 4px solid var(--ink); display: flex; align-items: center; justify-content: center;
               font-family: var(--font-display); font-size: 26px; }
    .ir-mark.ok { background: var(--green); }
    .ir-mark.bad { background: var(--red); }
    @keyframes ir-in { from { transform: translate(380px, -50%) rotate(10deg); } to { transform: translate(0, -50%) rotate(-1.5deg); } }
    @keyframes ir-left { from { transform: translate(0, -50%); } to { transform: translate(-520px, 10%) rotate(-30deg); opacity: 0; } }
    @keyframes ir-right { from { transform: translate(0, -50%); } to { transform: translate(120px, -180%) rotate(12deg); opacity: 0; } }
  `);

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /* Use the Phishing game's email generator when it's loaded (same companies
     sending real AND fake emails); fall back to the fixed lists otherwise. */
  function buildQueue() {
    if (Game.makeEmail) {
      const out = [];
      const seen = new Set();
      const wants = shuffle(Array.from({ length: TOTAL }, (_, i) => i < SCAM_COUNT));
      for (const scam of wants) {
        let e;
        for (let tries = 0; tries < 20; tries++) {
          e = Game.makeEmail({ scam, speed: 1 }); // easier emails: the challenge here is the speed
          if (!seen.has(e.key)) break;
        }
        seen.add(e.key);
        out.push(e);
      }
      return out;
    }
    const scams = shuffle(SCAMS).slice(0, SCAM_COUNT).map((e) => ({ ...e, scam: true }));
    const real = shuffle(REAL).slice(0, TOTAL - SCAM_COUNT).map((e) => ({ ...e, scam: false }));
    return shuffle(scams.concat(real));
  }

  let s = null;

  function showEmail(ctx) {
    const e = s.queue[s.i];
    const card = document.createElement('div');
    card.className = 'ir-card receipt-wrap';
    card.innerHTML = `
      <div class="receipt">
        <div class="ir-head"><span>*** INBOX ***</span><span>${s.i + 1} / ${TOTAL}</span></div>
        <div class="dash"></div>
        <div class="ir-from">FROM: ${ctx.esc(e.from)}</div>
        <div class="ir-subject">${ctx.esc(e.subject)}</div>
      </div>`;
    s.el.slot.appendChild(card);
    s.card = card;
    s.el.count.textContent = `${TOTAL - s.i} LEFT`;
    s.el.dots.forEach((d, i) => d.classList.toggle('now', i === s.i));
  }

  function answer(button, ctx) {
    const e = s.queue[s.i];
    const binned = button === 'left';
    const correct = binned === e.scam;

    // Send the current card off and mark it.
    const old = s.card;
    old.classList.add(binned ? 'out-left' : 'out-right');
    old.insertAdjacentHTML('beforeend', `<div class="ir-mark ${correct ? 'ok' : 'bad'}">${correct ? '✓' : '✗'}</div>`);
    ctx.after(300, () => old.remove());

    s.el.dots[s.i].classList.add(correct ? 'ok' : 'bad');
    if (correct) {
      Game.sound.blip();
    } else {
      s.el.strikes[s.wrong].classList.add('on');
      s.wrong++;
      s.lastLesson = e.scam
        ? e.lesson
        : 'That one was real. Binning everything is not a strategy: you miss the emails that matter.';
    }
    s.i++;

    if (s.wrong >= MAX_WRONG) {
      s.done = true;
      ctx.end(false, {
        failWord: 'INBOX HACKED!',
        failLabel: `${MAX_WRONG} mistakes in ${s.i} emails`,
        lesson: s.lastLesson,
      });
      return;
    }
    if (s.i >= TOTAL) {
      s.done = true;
      ctx.end(true, {
        passWord: 'BOSS BEATEN!',
        passLabel: `Inbox cleared ${TOTAL - s.wrong}/${TOTAL}`,
      });
      return;
    }
    showEmail(ctx);
  }

  Game.register({
    id: 'inboxrush',
    name: 'Scam Inbox Rush',
    boss: true,              // only appears every 10th round, never in rounds 1–5
    fixedSpeed: 2.5,         // the boss always runs at ×2.5, whatever round it is
    instruction: 'SCAM INBOX RUSH!',
    subtitle: '10 emails. Bin the scams, open the real ones. 3 mistakes and you\'re out.',
    controls: { left: 'BIN', right: 'OPEN' },
    duration: 35000,         // divided by ×2.5 = 14 seconds for 10 emails
    cost: 250,
    reward: 200,
    passOnTimeout: false,
    failWord: 'INBOX HACKED!',
    timeoutWord: 'TOO SLOW!',
    timeoutLesson: 'Speed matters, but checking matters more. Look at the sender first, every time.',
    lesson: "Check the sender's address on every single email.",
    personality: { title: 'THE OPEN-EVERYTHING', roast: 'Your inbox is a buffet and the scammers are all-you-can-eat.' },

    start(stage, ctx) {
      s = { queue: buildQueue(ctx), i: 0, wrong: 0, lastLesson: '', done: false, card: null };

      stage.innerHTML = `
        <div class="ir-wrap">
          <div class="ir-top">
            <div class="ir-dots">${'<span class="ir-dot"></span>'.repeat(TOTAL)}</div>
            <div class="ir-strikes">MISTAKES ${'<span class="ir-strike">✗</span>'.repeat(MAX_WRONG)}</div>
          </div>
          <div class="ir-main">
            <div class="ir-pile">
              <div class="ir-env" style="top: 8px; transform: rotate(-6deg)"></div>
              <div class="ir-env" style="top: 26px; transform: rotate(4deg)"></div>
              <div class="ir-env" style="top: 44px; transform: rotate(-2deg)"></div>
              <div class="ir-count"></div>
            </div>
            <div class="ir-slot"></div>
          </div>
        </div>`;

      s.el = {
        slot: stage.querySelector('.ir-slot'),
        count: stage.querySelector('.ir-count'),
        dots: [...stage.querySelectorAll('.ir-dot')],
        strikes: [...stage.querySelectorAll('.ir-strike')],
      };
      showEmail(ctx);
    },

    onInput(button, pressed, ctx) {
      if (!pressed || !s || s.done) return;
      answer(button, ctx);
    },

    cleanup() { s = null; },
  });
})();