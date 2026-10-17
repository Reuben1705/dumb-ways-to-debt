/* =========================================================
   YOUR MATE'S STARTUP: choice game, DM chat look.
   ← NAH   → INVEST
   Your mate slides into your DMs with a business idea.
   Decline the daft pitches, invest in the sensible ones.
   Doing nothing = fail.
   ========================================================= */
(function () {
  'use strict';

  // Who's messaging you. handle/emoji/bio show at the top of the chat.
  const PEOPLE = {
    'Dazza':      { handle: 'dazza.ceo',        emoji: '😎', bio: 'Founder · CEO · Visionary 🚀' },
    'Kyle':       { handle: 'kyle.nft',         emoji: '🐱', bio: 'Web3 · cat dad · not a bot' },
    'Big Mike':   { handle: 'bigmike.ventures', emoji: '🍺', bio: 'Serial entrepreneur (3 failed pubs)' },
    'Chloe':      { handle: 'chloe.builds',     emoji: '🔧', bio: 'Disrupting kitchens' },
    'Ollie':      { handle: 'ollie.alpha',      emoji: '📈', bio: 'Crypto · gym · mindset' },
    'Priya':      { handle: 'priya.hustles',    emoji: '💼', bio: 'Hustle never sleeps' },
    'Uncle Gary': { handle: 'gary_fx_king',     emoji: '💰', bio: 'Forex millionaire (allegedly)' },
    'Jess':       { handle: 'jess.bossbabe',    emoji: '✨', bio: 'Be your own boss 💅 DM me' },
    'Sophie':     { handle: 'sophie.saves',     emoji: '🐷', bio: 'Spreadsheets are my love language' },
    'Mum':        { handle: 'Mum',              emoji: '👩', bio: 'Online now' },
    'Dad':        { handle: 'Dad',              emoji: '👨', bio: 'Last seen 2014' },
    'Tyler':      { handle: 'tyler.alphagrind', emoji: '🦍', bio: '5am club · cold showers · DM for mentoring' },
    'Zara':       { handle: 'zara.vibes',       emoji: '🔮', bio: 'Manifesting abundance ✨' },
    'Connor':     { handle: 'connor.dropship',  emoji: '📦', bio: '6 figures by 21 (trust)' },
    'Grandad':    { handle: 'Grandad',          emoji: '👴', bio: 'Typing with one finger' },
    'Amir':       { handle: 'amir.saves',       emoji: '🧮', bio: 'Budgeting nerd' },
  };

  const DAFT_OPENERS = ['mate', 'u up?', 'bro', 'hear me out', 'you busy?', 'yo', 'quick one', 'ur gonna love this'];
  const DAFT_HOOKS = ['got a business idea 👀', 'this is THE one', 'ground floor opportunity', "don't tell anyone",
                      'no risk at all', 'we\'re gonna be rich', 'only telling my close mates', 'trust me on this'];
  const SENSIBLE_OPENERS = ['hey', 'quick money tip', 'had a thought'];
  const SENSIBLE_HOOKS = ['about your savings', 'boring but trust me', 'future you will thank me'];

  // tier 1 = obviously daft, tier 2 = sounds plausible (only appears from speed ×1.5)
  const DAFT = [
    { tier: 1, from: 'Dazza', title: 'Uber for socks 🧦', detail: 'You tap the app, a man brings you one sock.', ask: '£500',
      lesson: "If you can't explain how it makes money, don't invest." },
    { tier: 1, from: 'Kyle', title: 'NFTs of my cat', detail: "Only 10,000 made. She's VERY photogenic.", ask: '£300',
      lesson: 'Something is only worth what someone else will pay for it.' },
    { tier: 1, from: 'Big Mike', title: 'A pub that only sells water', detail: 'Low costs. Tap water. £6 a pint.', ask: '£1,000',
      lesson: 'Ask who the customers are. If the answer is "nobody", walk away.' },
    { tier: 1, from: 'Chloe', title: 'Bluetooth toaster 🍞', detail: 'Toast from your phone. Still have to put bread in.', ask: '£400',
      lesson: 'Adding tech to something that works fine is not a business plan.' },
    { tier: 1, from: 'Dazza', title: '$DAZZACOIN 🚀', detail: "Made it last night. It's going to the moon.", ask: '£250',
      lesson: 'A coin your mate made last night is worth exactly what it cost to make: nothing.' },
    { tier: 1, from: 'Ollie', title: 'Rent-a-goose 🪿', detail: 'Security goose for your house. Very angry.', ask: '£600',
      lesson: "A funny idea isn't the same as a profitable one." },
    { tier: 1, from: 'Priya', title: 'Gym for pigeons', detail: 'Huge untapped market. Literally millions of them.', ask: '£350',
      lesson: "A big market is useless if it can't pay you." },
    { tier: 1, from: 'Kyle', title: 'Netflix but only Shrek', detail: 'One film. Forever. £9.99 a month.', ask: '£200',
      lesson: "If there's no reason to keep paying, customers won't." },
    { tier: 2, from: 'Uncle Gary', title: 'Guaranteed 20% a month', detail: 'My forex bot never loses. Trust me.', ask: '£2,000',
      lesson: 'Nothing guarantees 20% a month. "Guaranteed" + "huge returns" = scam.' },
    { tier: 2, from: 'Jess', title: 'Bring 3 friends, earn £££', detail: 'Join my team, sell the shakes, recruit more people.', ask: '£150',
      lesson: "If you earn more from recruiting than selling, it's a pyramid scheme." },
    { tier: 2, from: 'Ollie', title: 'Invest before it lists', detail: 'Pre-sale token. Only today. Influencer backed.', ask: '£800',
      lesson: 'Pressure to act "today only" is a classic scam tactic.' },
    { tier: 2, from: 'Big Mike', title: 'Off-plan flats in Dubai', detail: "My mate's mate sells them. 40% returns. Cash only.", ask: '£5,000',
      lesson: "Cash only, no paperwork and a mate's mate? Never." },
    { tier: 1, from: 'Tyler', title: 'Ice cubes for penguins 🐧', detail: 'Nobody else is doing it. That means no competition.', ask: '£450',
      lesson: 'No competition can mean nobody wants it.' },
    { tier: 1, from: 'Zara', title: 'Crystals that grow money 💎', detail: 'Put it in your wallet. Wait. Rich.', ask: '£120',
      lesson: "If it sounds magic, it's a scam. Money doesn't grow on rocks." },
    { tier: 1, from: 'Connor', title: 'Dropshipping fidget spinners', detail: "They were huge in 2017. They're due a comeback.", ask: '£700',
      lesson: "Betting on a fad that's already over is a fast way to lose money." },
    { tier: 1, from: 'Dazza', title: 'Tinder for houseplants 🌱', detail: 'Swipe right on a cactus. Monthly fee.', ask: '£300',
      lesson: "A cute app idea isn't a business until people will pay for it." },
    { tier: 1, from: 'Big Mike', title: 'Cash-only nightclub ATM', detail: '£10 fee per withdrawal. I keep the machine in my van.', ask: '£900',
      lesson: 'If it sounds dodgy and lives in a van, keep your money.' },
    { tier: 1, from: 'Kyle', title: 'AI that writes my essays', detail: "It got 12%. But it's learning.", ask: '£250',
      lesson: "Don't invest in a product that doesn't work yet, and might never." },
    { tier: 1, from: 'Chloe', title: 'Subscription box of air', detail: 'Every month: a box. Inside: nothing. Premium nothing.', ask: '£200',
      lesson: 'People cancel subscriptions that give them nothing. Fast.' },
    { tier: 1, from: 'Priya', title: 'Self-driving shopping trolley', detail: "Only crashed into 4 people. In the demo.", ask: '£1,500',
      lesson: 'If the demo goes badly, the real thing will go worse.' },
    { tier: 2, from: 'Tyler', title: 'My trading course', detail: '£997 for the secrets. I made £50k (screenshots in bio).', ask: '£997',
      lesson: 'Real traders make money from trading, not from selling you courses.' },
    { tier: 2, from: 'Connor', title: 'Copy my trades on the app', detail: '300% last month. Just link your bank.', ask: '£1,000',
      lesson: 'Past wins mean nothing, and never link your bank to a stranger.' },
    { tier: 2, from: 'Zara', title: 'Join my savings circle', detail: 'Put in £100, get £800 back once 7 more people join!', ask: '£100',
      lesson: 'Money that only comes from new people joining is a pyramid scheme.' },
    { tier: 2, from: 'Uncle Gary', title: 'Gold bars, half price', detail: 'Bloke at the market. Very shiny. Cash.', ask: '£3,000',
      lesson: "If gold is half price, it isn't gold." },
    { tier: 2, from: 'Ollie', title: 'Lend me money, I\'ll pay double', detail: 'Promise. By Christmas. Which Christmas TBC.', ask: '£500',
      lesson: 'Only lend money you would be OK never seeing again.' },
  ];

  const SENSIBLE = [
    { from: 'Sophie', title: 'A boring index fund', detail: 'Low fees, tracks the whole market, leave it for years.', ask: '£50 a month',
      lesson: 'Boring is good. Low-fee index funds beat most "hot tips" over time.' },
    { from: 'Mum', title: 'Put it in an ISA', detail: "Tax-free savings. Don't touch it till you need it.", ask: '£100',
      lesson: 'An ISA lets your savings grow without paying tax on them.' },
    { from: 'Sophie', title: 'An emergency fund', detail: 'Three months of bills in an easy-access account.', ask: '£200',
      lesson: 'Savings for emergencies stop one bad week becoming debt.' },
    { from: 'Dad', title: 'Your workplace pension', detail: 'Your employer adds money too. Free cash.', ask: '5% of pay',
      lesson: 'Employer pension contributions are free money. Take them.' },
    { from: 'Priya', title: 'Pay off your credit card', detail: "You're paying 24% interest on it. Clear it first.", ask: 'whatever you can',
      lesson: 'Paying off high-interest debt is a guaranteed return.' },
    { from: 'Grandad', title: 'A Lifetime ISA', detail: 'For your first house. The government adds 25% on top.', ask: '£50 a month',
      lesson: 'A Lifetime ISA adds a 25% bonus when saving for your first home.' },
    { from: 'Amir', title: 'A simple budget', detail: "Write down what comes in and goes out. That's it.", ask: '10 minutes',
      lesson: "You can't fix your money if you don't know where it goes." },
    { from: 'Amir', title: 'Cancel subs you forgot', detail: "You're paying for 3 apps you never open.", ask: '£0',
      lesson: 'Check your statements. Forgotten subscriptions add up fast.' },
    { from: 'Mum', title: 'An easy-access savings account', detail: 'Better interest than your current account. Still easy to get to.', ask: '£100',
      lesson: 'Spare cash should earn interest, not sit doing nothing.' },
  ];

  Game.css('startup', `
    .su-phone { position: absolute; left: 50%; top: 6px; bottom: -40px; width: 380px;
      transform: translateX(-50%) rotate(-2deg); background: #fff; border: 5px solid var(--ink);
      border-radius: 34px; box-shadow: 7px 7px 0 var(--ink); overflow: hidden;
      display: flex; flex-direction: column; animation: su-up .35s cubic-bezier(.2, 1.4, .4, 1) both; }
    .su-top { display: flex; align-items: center; gap: 10px; padding: 14px 16px 10px; border-bottom: 3px solid var(--ink); }
    .su-av { width: 40px; height: 40px; flex: none; border-radius: 50%; border: 3px solid var(--ink);
      background: conic-gradient(var(--yellow), var(--red), #B44CF0, var(--yellow));
      display: grid; place-items: center; font-size: 20px; }
    .su-name { font-weight: 900; font-size: 16px; line-height: 1.1; }
    .su-bio { font-size: 12px; color: #666; }
    .su-body { flex: 1; padding: 12px 14px; display: flex; flex-direction: column; gap: 7px; }
    .su-b { max-width: 80%; padding: 7px 13px; border-radius: 20px 20px 20px 6px; background: #EDEDED;
      border: 3px solid var(--ink); font-weight: 700; font-size: 15px; line-height: 1.25;
      transform-origin: left bottom; animation: su-pop .22s cubic-bezier(.2, 1.6, .4, 1) both; }
    .su-b.big { background: var(--yellow); font-family: var(--font-display); font-weight: 400; font-size: 24px; line-height: 1.05; }
    .su-b.ask { background: var(--green); }
    .su-b.me { align-self: flex-end; border-radius: 20px 20px 6px 20px; transform-origin: right bottom; color: #fff; }
    .su-b.me.yes { background: #3B82F6; }
    .su-b.me.no { background: var(--red); }
    .su-phone.declined { animation: su-decline .35s .15s ease-in forwards; }
    .su-phone.invested { animation: su-invest .35s .15s ease-in forwards; }
    @keyframes su-up { from { transform: translate(-50%, 420px) rotate(-2deg); } }
    @keyframes su-pop { from { transform: scale(0); } }
    @keyframes su-decline { to { transform: translate(-130%, 120px) rotate(-25deg); } }
    @keyframes su-invest { to { transform: translate(40%, -40px) rotate(18deg); opacity: 0; } }
  `);

  let phone = null;
  let body = null;
  let pitch = null;
  let isDaft = false;
  let answered = false;

  function bubble(cls, text) {
    const b = document.createElement('div');
    b.className = 'su-b ' + cls;
    b.textContent = text;
    body.appendChild(b);
  }

  Game.register({
    id: 'startup',
    name: "Your Mate's Startup",
    instruction: 'INVEST?',
    controls: { left: 'NAH', right: 'INVEST' },
    readTime: 1000,          // extra time on the instruction screen
    duration: 4800,          // ms at speed ×1 (a little extra for the messages popping in)
    cost: 200,
    passOnTimeout: false,    // leaving them on read counts as a fail
    failWord: 'SKINT!',
    timeoutWord: 'LEFT ON READ!',
    timeoutLesson: "You don't have to say yes on the spot, but you do have to decide.",
    lesson: "If you can't explain how it makes money, don't invest.",
    personality: {
      title: 'THE ANGEL INVESTOR',
      roast: [
        'Every mate with a dream has your bank details.',
        'You own 40% of a goose rental company.',
        "Dazza calls you 'the bank'. It's not a nickname.",
        "You've invested in more startups than you've had hot dinners.",
        'Your portfolio is 100% $DAZZACOIN.',
        'You believed in Uber for socks. Nobody else did.',
      ],
    },

    start(stage, ctx) {
      answered = false;
      isDaft = Math.random() < 0.65;
      const pool = isDaft ? DAFT.filter((p) => ctx.speed >= 1.5 || p.tier === 1) : SENSIBLE;
      pitch = ctx.pick(pool);
      const who = PEOPLE[pitch.from] || { handle: pitch.from, emoji: '🙂', bio: '' };

      stage.innerHTML = `
        <div class="su-phone">
          <div class="su-top">
            <div class="su-av">${who.emoji}</div>
            <div><div class="su-name">${ctx.esc(who.handle)}</div><div class="su-bio">${ctx.esc(who.bio)}</div></div>
          </div>
          <div class="su-body"></div>
        </div>`;
      phone = stage.querySelector('.su-phone');
      body = stage.querySelector('.su-body');

      const messages = isDaft
        ? [['', ctx.pick(DAFT_OPENERS)], ['', ctx.pick(DAFT_HOOKS)], ['big', pitch.title], ['', pitch.detail], ['ask', `need ${pitch.ask} by friday`]]
        : [['', ctx.pick(SENSIBLE_OPENERS)], ['', ctx.pick(SENSIBLE_HOOKS)], ['big', pitch.title], ['', pitch.detail], ['ask', `start with ${pitch.ask}?`]];

      // Messages pop in one by one, faster as the game speeds up.
      const gap = Math.round(230 / ctx.speed);
      messages.forEach(([cls, text], i) => {
        ctx.after(120 + i * gap, () => { if (!answered) { bubble(cls, text); Game.sound.blip(); } });
      });
    },

    onInput(button, pressed, ctx) {
      if (!pressed || answered) return;
      answered = true;
      const declined = button === 'left';
      bubble(declined ? 'me no' : 'me yes', declined ? 'nah mate 🙃' : "I'm in 💸");
      phone.classList.add(declined ? 'declined' : 'invested');

      if (declined && isDaft) {
        ctx.end(true, { passWord: 'DODGED IT!', passLabel: 'Daft pitch declined' });
      } else if (!declined && !isDaft) {
        ctx.end(true, { passWord: 'SMART!', passLabel: 'Sensible investment', passRight: 'MONEY GROWING' });
      } else if (!declined && isDaft) {
        ctx.end(false, { lesson: pitch.lesson });
      } else {
        ctx.end(false, {
          failWord: 'MISSED OUT!', failLabel: 'Turned down a good idea', cost: 50,
          lesson: pitch.lesson,
        });
      }
    },

    cleanup() { phone = null; body = null; },
  });
})();
