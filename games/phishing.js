/* =========================================================
   PHISHING EMAIL: choice game. Use this as your template.
   ← BIN IT   → OPEN IT
   Bin the scams, open the real ones. Doing nothing = fail.
   ========================================================= */
(function () {
  'use strict';

  // tier 1 = obvious, tier 2 = subtle (only appears from speed ×1.5)
  const SCAMS = [
    { tier: 1, from: 'security@paypa1-help.com', subject: 'URGENT: Your account is LOCKED!!',
      body: 'Verify in 5 mins or lose it all.', button: 'VERIFY NOW',
      lesson: "Check the sender's address. 'paypa1' is not PayPal." },
    { tier: 1, from: 'HMRC Refunds <refund@hmrc-gov-uk.co>', subject: 'You are owed a £482.19 tax refund',
      body: 'Enter your card details to claim.', button: 'CLAIM REFUND',
      lesson: 'HMRC never emails you a link to claim a refund.' },
    { tier: 1, from: 'Royal Mail <redeliver@royalmail-parcels.info>', subject: 'Your parcel could not be delivered',
      body: 'Pay a £1.45 fee to rebook delivery.', button: 'PAY £1.45',
      lesson: 'Tiny "redelivery fees" are a classic way to steal card details.' },
    { tier: 1, from: 'Netflix <billing@netfl1x-account.com>', subject: 'Payment declined: update now',
      body: 'Your membership ends TODAY.', button: 'UPDATE CARD',
      lesson: "Fake urgency is a red flag. Log in through the app, not the email." },
    { tier: 2, from: 'CEO <ceo.office.private@gmail.com>', subject: 'Quick favour, are you at your desk?',
      body: 'Need 5 gift cards for a client. Keep it between us.', button: 'REPLY',
      lesson: "Bosses don't ask for gift cards from a Gmail address." },
    { tier: 2, from: 'IT Support <helpdesk@yourcompany-support.net>', subject: 'Your password expires today',
      body: 'Keep your current password by logging in here.', button: 'KEEP PASSWORD',
      lesson: 'Check the domain: yourcompany-support.net is not your company.' },
    { tier: 2, from: 'Amazon <orders@amazon.co.uk.order-help.net>', subject: 'Order confirmed: iPhone £1,199',
      body: "Didn't order this? Cancel within 1 hour.", button: 'CANCEL ORDER',
      lesson: 'Read the domain right to left. This one ends in order-help.net.' },
    { tier: 2, from: 'Student Finance <grants@studentfinance-uk.org>', subject: 'Hardship grant approved: £750',
      body: 'Confirm your bank login to receive it.', button: 'CLAIM GRANT',
      lesson: 'No real grant ever asks for your bank login.' },
  ];

  const REAL = [
    { from: 'Sarah (Manager) <s.mcleod@yourcompany.co.uk>', subject: 'Rota for next week',
      body: "Swapped your Thursday. Shout if that's a problem.", button: 'VIEW ROTA' },
    { from: 'Jamie <j.oconnor@student.gla.ac.uk>', subject: 'Slides done, can you check?',
      body: 'Added the conclusion. Your bit is next.', button: 'OPEN SLIDES' },
    { from: 'Thistle Bank <alerts@thistlebank.co.uk>', subject: 'Your statement is ready',
      body: "Open the app to view it. We'll never email you a link.", button: 'REPLY' },
    { from: 'Mum <mum@outlook.com>', subject: 'Sunday dinner?',
      body: 'Making lasagne. Bring the tupperware back please.', button: 'REPLY' },
  ];

  Game.css('phishing', `
    .ph-wrap { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; }
    .ph-card { width: 480px; animation: ph-in .3s cubic-bezier(.2, 1.4, .4, 1) both; }
    .ph-card .receipt { gap: 8px; padding: 18px 26px 34px; }
    .ph-head { text-align: center; font-size: 13px; letter-spacing: 3px; font-weight: 700; }
    .ph-from { font-size: 15px; font-weight: 700; overflow-wrap: anywhere; }
    .ph-subject { font-family: var(--font-display); font-size: 28px; line-height: 1.05; }
    .ph-body { font-size: 15px; }
    .ph-btn { align-self: center; background: var(--yellow); border: 3px solid var(--ink); border-radius: 10px;
              padding: 4px 16px; font-family: var(--font-display); font-size: 18px; }
    .ph-card.binned { animation: ph-bin .3s ease-in forwards; }
    .ph-card.opened { animation: ph-open .3s ease-in forwards; }
    @keyframes ph-in { from { transform: translateX(460px) rotate(14deg); } to { transform: translateX(0) rotate(-2deg); } }
    @keyframes ph-bin { to { transform: translate(-520px, 180px) rotate(-40deg); } }
    @keyframes ph-open { to { transform: scale(1.3); opacity: 0; } }
  `);

  let card = null;
  let email = null;
  let isScam = false;
  let answered = false;

  Game.register({
    id: 'phishing',
    name: 'Phishing Email',
    instruction: 'BIN THE SCAM!',
    controls: { left: 'BIN IT', right: 'OPEN IT' },
    duration: 4500,          // ms at speed ×1
    cost: 150,
    passOnTimeout: false,    // freezing counts as a fail
    failWord: 'PHISHED!',
    timeoutWord: 'TOO SLOW!',
    timeoutLesson: "Scammers rely on panic. Slow down, but don't freeze: check the sender first.",
    lesson: "Check the sender's address, not just the name.",
    personality: { title: 'THE CLICKER', roast: "You've never met a link you didn't like." },

    start(stage, ctx) {
      answered = false;
      isScam = Math.random() < 0.65;
      const pool = isScam ? SCAMS.filter((s) => ctx.speed >= 1.5 || s.tier === 1) : REAL;
      email = ctx.pick(pool);
      stage.innerHTML = `
        <div class="ph-wrap">
          <div class="ph-card receipt-wrap"><div class="receipt">
            <div class="ph-head">*** NEW MESSAGE ***</div>
            <div class="dash"></div>
            <div class="ph-from">FROM: ${ctx.esc(email.from)}</div>
            <div class="ph-subject">${ctx.esc(email.subject)}</div>
            <div class="ph-body">${ctx.esc(email.body)}</div>
            <div class="dash"></div>
            <div class="ph-btn">${ctx.esc(email.button)}</div>
          </div></div>
        </div>`;
      card = stage.querySelector('.ph-card');
    },

    onInput(button, pressed, ctx) {
      if (!pressed || answered) return;
      answered = true;
      const binned = button === 'left';
      card.classList.add(binned ? 'binned' : 'opened');

      if (binned && isScam) {
        ctx.end(true, { passWord: 'SCAM BINNED!', passLabel: 'Scam binned' });
      } else if (!binned && !isScam) {
        ctx.end(true, { passWord: 'NICE!', passLabel: 'Real email opened', passRight: 'NO HARM DONE' });
      } else if (!binned && isScam) {
        ctx.end(false, { lesson: email.lesson });
      } else {
        ctx.end(false, {
          failWord: 'WRONG BIN!', failLabel: 'Binned a real email', cost: 50,
          lesson: 'Not everything is a scam. That one was real, and ignoring it cost you.',
        });
      }
    },

    cleanup() { card = null; },
  });
})();
