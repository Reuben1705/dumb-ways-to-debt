/* =========================================================
   PHISHING EMAIL: choice game.
   ← BIN IT   → OPEN IT
   Bin the scams, open the real ones. Doing nothing = fail.

   Emails are GENERATED: every company sends both real and
   fake emails about the same things. Fakes always come from
   a slightly-off address (thistlebank-secure.co.uk,
   amaz0n.co.uk, hmrc.gov-uk.com...). Below speed ×1.5 the
   fake's wording is also a bit dodgy; from ×1.5 it can be
   word-for-word identical, so the address is the only clue.

   Game.makeEmail() is shared with Scam Inbox Rush.
   ========================================================= */
(function () {
  'use strict';

  /* Each topic has the same subject for real and fake versions.
     real = what the genuine company says, scam = the phishing twist. */
  const COMPANIES = [
    { name: 'Thistle Bank', user: 'alerts', domain: 'thistlebank.co.uk', topics: [
      { subject: 'Your monthly statement is ready', real: 'Open the Thistle Bank app to view it.', scam: 'View it here and re-confirm your card details.', button: 'VIEW STATEMENT' },
      { subject: 'New device signed in to your account', real: 'Not you? Call the number on the back of your card.', scam: 'Not you? Secure your account using this link now.', button: 'REVIEW ACTIVITY' },
      { subject: 'Your new card is on its way', real: 'It should arrive within 5 working days.', scam: 'Pay a £2.99 fee to release your new card.', button: 'TRACK CARD' },
    ] },
    { name: 'Royal Mail', user: 'tracking', domain: 'royalmail.com', topics: [
      { subject: 'Your parcel is on its way', real: 'Track it in the Royal Mail app.', scam: 'Pay £1.45 to confirm your delivery slot.', button: 'TRACK PARCEL' },
      { subject: 'Sorry we missed you', real: 'Your parcel is waiting at your local delivery office.', scam: 'Rebook now for £1.99 or it will be returned.', button: 'REBOOK' },
    ] },
    { name: 'HMRC', user: 'noreply', domain: 'hmrc.gov.uk', topics: [
      { subject: 'Your tax code has changed', real: 'Sign in to your HMRC account to see why.', scam: 'You were overcharged £214.60. Claim it with your card.', button: 'VIEW TAX CODE' },
      { subject: 'Self Assessment reminder', real: 'Your tax return is due by 31 January.', scam: 'Pay today by card to avoid a £100 penalty.', button: 'SIGN IN' },
    ] },
    { name: 'Netflix', user: 'info', domain: 'netflix.com', topics: [
      { subject: 'There was a problem with your payment', real: 'Update your details in the Netflix app.', scam: 'Update your card within 24 hours or lose access.', button: 'UPDATE PAYMENT' },
      { subject: 'New sign-in to your account', real: 'If this was you, no action is needed.', scam: 'Confirm your password now to keep watching.', button: 'REVIEW SIGN-IN' },
    ] },
    { name: 'Amazon', user: 'orders', domain: 'amazon.co.uk', topics: [
      { subject: 'Your order has been dispatched', real: 'Arriving Thursday. Track it in Your Orders.', scam: 'Problem with your order. Confirm your card to dispatch it.', button: 'TRACK ORDER' },
      { subject: 'Your refund has been processed', real: '£12.99 will reach your account in 3-5 days.', scam: 'Enter your bank details to receive your £12.99.', button: 'VIEW REFUND' },
    ] },
    { name: 'University IT', user: 'it-services', domain: 'gla.ac.uk', topics: [
      { subject: 'Your password expires in 7 days', real: 'Change it through the usual IT services page.', scam: 'Keep your current password by logging in here.', button: 'MANAGE PASSWORD' },
      { subject: 'Your bursary payment is confirmed', real: 'Your next instalment arrives on the 15th.', scam: 'Confirm your bank login to receive it.', button: 'VIEW DETAILS' },
    ] },
  ];

  const TLD = /\.(co\.uk|gov\.uk|ac\.uk|com)$/;
  const LOOKALIKE = [['l', '1'], ['o', '0'], ['i', 'l'], ['m', 'rn'], ['e', '3']];

  /* Ways to fake a domain. Each keeps it looking very close to the real one. */
  const FAKERS = [
    (d) => d.replace(TLD, '-secure.$1'),                                   // thistlebank-secure.co.uk
    (d) => d.replace(TLD, '-support.com'),                                 // netflix-support.com
    (d) => d + '.account-check.net',                                       // amazon.co.uk.account-check.net
    (d) => d.replace(/\.co\.uk$/, '.co').replace(/\.gov\.uk$/, '.gov-uk.com')
            .replace(/\.ac\.uk$/, '.ac-uk.org').replace(/\.com$/, '.co'),  // hmrc.gov-uk.com
    (d) => {                                                               // amaz0n.co.uk
      const [name, ...rest] = d.split('.');
      for (const [from, to] of LOOKALIKE) {
        if (name.includes(from)) return name.replace(from, to) + '.' + rest.join('.');
      }
      return name + 's.' + rest.join('.');
    },
  ];

  const pickOf = (arr) => arr[Math.floor(Math.random() * arr.length)];

  /* Build one email. opts: { scam: bool, speed: number } */
  function makeEmail(opts = {}) {
    const scam = opts.scam ?? Math.random() < 0.6;
    const subtle = (opts.speed || 1) >= 1.5;
    const company = pickOf(COMPANIES);
    const topic = pickOf(company.topics);
    let domain = company.domain;
    let body = topic.real;
    let lesson = '';
    if (scam) {
      domain = pickOf(FAKERS)(company.domain);
      if (domain === company.domain) domain = FAKERS[0](company.domain);
      const dodgyWords = !subtle || Math.random() < 0.5;
      if (dodgyWords) body = topic.scam;
      lesson = dodgyWords
        ? `Real companies don't ask for card or bank details by email, and "${domain}" isn't "${company.domain}".`
        : `The wording was perfect, but the sender was "${domain}", not "${company.domain}". Always check the address.`;
    }
    return {
      scam,
      company: company.name,
      realDomain: company.domain,
      from: `${company.name} <${company.user}@${domain}>`,
      subject: topic.subject,
      body,
      button: topic.button,
      lesson,
      key: company.name + '|' + topic.subject + '|' + scam,
    };
  }
  Game.makeEmail = makeEmail;

  Game.css('phishing', `
    .ph-wrap { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; }
    .ph-card { width: 500px; animation: ph-in .3s cubic-bezier(.2, 1.4, .4, 1) both; }
    .ph-card .receipt { gap: 8px; padding: 18px 26px 34px; }
    .ph-head { text-align: center; font-size: 13px; letter-spacing: 3px; font-weight: 700; }
    .ph-from { font-size: 15px; font-weight: 700; overflow-wrap: anywhere; }
    .ph-subject { font-family: var(--font-display); font-size: 27px; line-height: 1.05; }
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
  let answered = false;

  Game.register({
    id: 'phishing',
    name: 'Phishing Email',
    instruction: 'BIN THE SCAM!',
    subtitle: 'Some are real. Check who sent it.',
    controls: { left: 'BIN IT', right: 'OPEN IT' },
    duration: 5000,          // ms at speed ×1 (a little longer: you need to read the address)
    cost: 150,
    passOnTimeout: false,    // freezing counts as a fail
    failWord: 'PHISHED!',
    timeoutWord: 'TOO SLOW!',
    timeoutLesson: "Scammers rely on panic. Slow down, but don't freeze: check the sender first.",
    lesson: "Check the sender's address, not just the name.",
    personality: { title: 'THE CLICKER', roast: "You've never met a link you didn't like." },

    start(stage, ctx) {
      answered = false;
      email = makeEmail({ speed: ctx.speed });
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

      if (binned && email.scam) {
        ctx.end(true, { passWord: 'SCAM BINNED!', passLabel: 'Scam binned' });
      } else if (!binned && !email.scam) {
        ctx.end(true, { passWord: 'NICE!', passLabel: `Real ${email.company} email`, passRight: 'NO HARM DONE' });
      } else if (!binned && email.scam) {
        ctx.end(false, { lesson: email.lesson });
      } else {
        ctx.end(false, {
          failWord: 'WRONG BIN!', failLabel: `Binned a real ${email.company} email`, cost: 50,
          lesson: `That one really was from ${email.realDomain}. Binning everything means missing the emails that matter.`,
        });
      }
    },

    cleanup() { card = null; },
  });
})();
