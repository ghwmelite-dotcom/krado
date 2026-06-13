import { Hono } from "hono";
import { formatGHS, t, type Lang } from "@krado/shared";
import type { AppEnv } from "../env";

/**
 * SSR public pages — landing (/), booking (/{handle}), confirmation (/booked).
 * No framework: fast first paint on entry-level Androids over 3G. The brand
 * is "flat, warm, woven" — kente geometry and sunlit ramps, never clip-art.
 */
export const publicPage = new Hono<AppEnv>();

const KENTE = ["#BA7517", "#2C2C2A", "#3B6D11", "#A32D2D", "#BA7517", "#2C2C2A", "#3B6D11"];
const KENTE_RATIO = [2, 1, 2, 1, 2, 1, 2];

function KenteStrip({ height = 5 }: { height?: number }) {
  return (
    <div class="kente" style={`height:${height}px`} aria-hidden="true">
      {KENTE.map((color, i) => (
        <div style={`flex:${KENTE_RATIO[i]};background:${color}`} />
      ))}
    </div>
  );
}

const FONTS = (
  <>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
    <link
      href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500&family=Fraunces:ital,opsz,wght@0,9..144,500;0,9..144,600;1,9..144,500&display=swap"
      rel="stylesheet"
    />
  </>
);

const BASE_CSS = `
*{box-sizing:border-box;margin:0;padding:0}
:root{
  --gold-100:#FAC775;--gold-200:#EF9F27;--gold-600:#854F0B;--gold-800:#633806;--gold-900:#412402;
  --forest-50:#E1F5EE;--forest-100:#9FE1CB;--forest-600:#0F6E56;--forest-900:#04342C;
  --clay-50:#FAECE7;--clay-600:#993C1D;--clay-800:#712B13;
  --violet-50:#EEEDFE;--violet-600:#534AB7;
  --ink:#2C2C2A;--paper:#FFF;--mist:#F1EFE8;--line:#E5E1D6;--muted:#6B6B63;
  --shadow-sm:0 1px 2px rgba(44,44,42,.05),0 2px 8px rgba(44,44,42,.04);
  --shadow-lg:0 2px 4px rgba(44,44,42,.05),0 12px 32px rgba(44,44,42,.10),0 32px 64px rgba(65,36,2,.08);
}
body{font-family:'DM Sans',system-ui,sans-serif;background:var(--mist);color:var(--ink);font-size:16px;line-height:1.55;-webkit-font-smoothing:antialiased}
.kente{display:flex}
a{color:inherit}
.num{font-variant-numeric:tabular-nums}
:where(a,button):focus-visible{outline:2px solid var(--forest-600);outline-offset:2px;border-radius:6px}
`;

/* ---------------------------------- landing ---------------------------------- */

const LANDING_CSS = `
body{background:linear-gradient(180deg,#FBF9F3 0%,var(--mist) 38%)}
.shell{max-width:1100px;margin:0 auto;padding:0 24px}
nav{display:flex;align-items:center;justify-content:space-between;padding:22px 0}
.wordmark{font-family:'Fraunces',serif;font-weight:600;font-size:24px;letter-spacing:-.02em;text-decoration:none}
.wordmark .dot{color:var(--gold-200)}
nav .login{font-size:14px;font-weight:500;text-decoration:none;padding:10px 18px;border:1px solid var(--line);border-radius:999px;background:var(--paper);transition:border-color .15s ease-out}
nav .login:hover{border-color:var(--gold-200)}

.hero{display:grid;grid-template-columns:1.05fr .95fr;gap:48px;align-items:center;padding:56px 0 72px}
.eyebrow{display:inline-flex;align-items:center;gap:8px;font-size:13px;font-weight:500;color:var(--gold-600);background:var(--paper);border:1px solid var(--line);border-radius:999px;padding:7px 14px}
.eyebrow .sw{width:8px;height:8px;border-radius:2px;background:var(--gold-200)}
h1{font-family:'Fraunces',serif;font-weight:600;font-size:clamp(42px,6.2vw,74px);line-height:1.04;letter-spacing:-.025em;margin:22px 0 0}
h1 em{font-style:italic;font-weight:500;color:var(--gold-600)}
.sub{font-size:18px;color:var(--muted);max-width:46ch;margin-top:20px}
.sub b{color:var(--ink);font-weight:500}
.cta{display:flex;flex-wrap:wrap;gap:12px;margin-top:32px}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:10px;min-height:52px;padding:0 28px;border-radius:14px;font:inherit;font-weight:500;font-size:16px;text-decoration:none;cursor:pointer;border:0;transition:transform .15s ease-out,box-shadow .15s ease-out,border-color .15s ease-out}
.btn.gold{background:var(--gold-200);color:var(--gold-900);box-shadow:0 2px 0 var(--gold-600)}
.btn.gold:hover{transform:translateY(-2px);box-shadow:0 4px 0 var(--gold-600),0 12px 24px rgba(239,159,39,.25)}
.btn.gold:active{transform:translateY(0);box-shadow:0 1px 0 var(--gold-600)}
.btn.quiet{background:transparent;border:1px solid #CFCBC0;color:var(--ink)}
.btn.quiet:hover{border-color:var(--ink);transform:translateY(-2px)}
.pilot{font-size:13px;color:var(--muted);margin-top:18px;display:flex;align-items:center;gap:7px}
.pilot svg{flex-shrink:0}

.stage{position:relative;justify-self:end;width:min(340px,100%)}
.blocks{position:absolute;inset:0;z-index:0}
.blocks i{position:absolute;border-radius:4px}
.blocks .b1{width:128px;height:128px;background:var(--gold-200);top:-26px;right:-34px}
.blocks .b2{width:72px;height:72px;background:var(--forest-600);bottom:42px;left:-40px}
.blocks .b3{width:34px;height:34px;background:var(--clay-600);bottom:-16px;right:48px}
.phone{position:relative;z-index:1;background:var(--paper);border:1px solid var(--line);border-radius:24px;overflow:hidden;box-shadow:var(--shadow-lg)}
.phone .pad{padding:18px 18px 20px}
.phone .shop{font-weight:500;font-size:17px;margin-top:2px}
.phone .where{font-size:12px;color:var(--muted)}
.style{display:flex;gap:12px;align-items:center;border:2px solid var(--forest-600);border-radius:14px;padding:10px;margin-top:14px;position:relative}
.style .weave{width:56px;height:56px;border-radius:10px;flex-shrink:0;background:
  repeating-linear-gradient(90deg,var(--gold-200) 0 10px,var(--gold-100) 10px 14px),
  repeating-linear-gradient(0deg,transparent 0 12px,rgba(65,36,2,.18) 12px 16px);background-blend-mode:multiply}
.style .nm{font-weight:500;font-size:14px}
.style .meta{font-size:12px;color:var(--muted)}
.style .check{position:absolute;top:-9px;right:-9px;width:22px;height:22px;border-radius:999px;background:var(--forest-600);color:#fff;display:flex;align-items:center;justify-content:center}
.slotrow{display:flex;gap:8px;margin-top:14px}
.pill{font-size:12.5px;padding:8px 13px;border-radius:999px;border:1px solid #CFCBC0;color:var(--muted);white-space:nowrap}
.pill.on{background:var(--forest-900);border-color:var(--forest-900);color:var(--forest-100)}
.paybar{display:flex;align-items:center;justify-content:center;gap:8px;background:var(--gold-200);color:var(--gold-900);border-radius:12px;min-height:46px;font-weight:500;font-size:14.5px;margin-top:16px}
.lockedchip{display:inline-flex;align-items:center;gap:6px;background:var(--forest-50);color:var(--forest-900);font-size:11.5px;font-weight:500;border-radius:999px;padding:5px 11px;margin-top:14px}
.lockedchip .d{width:7px;height:7px;border-radius:999px;background:var(--forest-600)}

.statement{padding:24px 0 8px}
.statement p{font-family:'Fraunces',serif;font-weight:500;font-size:clamp(26px,3.6vw,40px);line-height:1.2;letter-spacing:-.015em;max-width:24ch}
.statement em{font-style:italic;color:var(--clay-600)}

.how{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;padding:48px 0 8px}
.step{background:var(--paper);border:1px solid var(--line);border-radius:18px;padding:26px 24px 28px;position:relative;overflow:hidden;box-shadow:var(--shadow-sm);transition:transform .2s ease-out,box-shadow .2s ease-out}
.step:hover{transform:translateY(-4px);box-shadow:var(--shadow-lg)}
.step .bar{position:absolute;top:0;left:0;right:0;height:4px}
.step:nth-child(1) .bar{background:var(--gold-200)}
.step:nth-child(2) .bar{background:var(--forest-600)}
.step:nth-child(3) .bar{background:var(--clay-600)}
.step .no{font-family:'Fraunces',serif;font-weight:600;font-size:44px;line-height:1;color:var(--ink);opacity:.14}
.step h3{font-size:17px;font-weight:500;margin:10px 0 8px}
.step p{font-size:14.5px;color:var(--muted)}
.step b{color:var(--ink);font-weight:500}

.money{background:var(--forest-900);color:var(--forest-50);border-radius:24px;margin:64px 0;padding:48px clamp(24px,5vw,64px);display:grid;grid-template-columns:1.1fr .9fr;gap:48px;align-items:center}
.money h2{font-family:'Fraunces',serif;font-weight:500;font-size:clamp(26px,3vw,36px);letter-spacing:-.015em;line-height:1.15}
.money .mp{color:var(--forest-100);margin-top:14px;font-size:15.5px;max-width:42ch}
.goalcard{background:rgba(255,255,255,.06);border:1px solid rgba(159,225,203,.25);border-radius:18px;padding:24px}
.goalcard .lbl{display:flex;justify-content:space-between;font-size:13px;color:var(--forest-100)}
.goalcard .amt{font-size:26px;font-weight:500;margin-top:6px}
.track{height:6px;background:rgba(159,225,203,.22);border-radius:999px;margin-top:14px;overflow:hidden}
.fill{height:100%;width:72.5%;background:var(--forest-100);border-radius:999px}
.susuline{display:flex;align-items:center;gap:8px;margin-top:18px;font-size:13.5px;color:var(--forest-100)}
.susuline .sq{width:10px;height:10px;border-radius:3px;background:var(--gold-200)}

.final{text-align:center;padding:8px 0 80px}
.final h2{font-family:'Fraunces',serif;font-weight:600;font-size:clamp(30px,4vw,46px);letter-spacing:-.02em}
.final p{color:var(--muted);margin-top:12px}
.final .cta{justify-content:center}
footer{border-top:1px solid var(--line);padding:28px 0 36px;display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;color:var(--muted);font-size:13px}

@media (max-width:880px){
  .hero{grid-template-columns:1fr;gap:56px;padding-top:40px}
  .stage{justify-self:center}
  .how{grid-template-columns:1fr}
  .money{grid-template-columns:1fr;gap:32px}
}
@media (prefers-reduced-motion:no-preference){
  .reveal{opacity:0;transform:translateY(14px);animation:rise .65s ease-out forwards}
  .reveal.r2{animation-delay:.08s}.reveal.r3{animation-delay:.16s}.reveal.r4{animation-delay:.24s}.reveal.r5{animation-delay:.34s}
  @keyframes rise{to{opacity:1;transform:none}}
}
`;

const LockIcon = ({ size = 15 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2.2"
    aria-hidden="true"
  >
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </svg>
);

publicPage.get("/", (c) => {
  return c.html(
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <title>Krado — bookings and daily money for Ghana's artisans</title>
        <meta
          name="description"
          content="Clients lock their slot with a small MoMo deposit. No-shows die. Your day's money and susu on one screen."
        />
        {FONTS}
        <style dangerouslySetInnerHTML={{ __html: BASE_CSS + LANDING_CSS }} />
      </head>
      <body>
        <KenteStrip height={8} />
        <div class="shell">
          <nav>
            <a class="wordmark" href="/">
              Krado<span class="dot">.</span>
            </a>
            <a class="login" href="/app/">
              Open your dashboard
            </a>
          </nav>

          <section class="hero">
            <div>
              <span class="eyebrow reveal">
                <i class="sw"></i>For barbers, hairdressers &amp; seamstresses in Accra
              </span>
              <h1 class="reveal r2">
                Krado? <em>Lock your slot.</em>
              </h1>
              <p class="sub reveal r3">
                Your clients book from a link in your WhatsApp status and pay a <b>small MoMo deposit</b> to
                lock the time. No-shows die. Your day's money — and your susu — show on one screen.
              </p>
              <div class="cta reveal r4">
                <a class="btn gold" href="/app/onboarding">
                  <LockIcon />
                  Set up your shop — 2 minutes
                </a>
                <a class="btn quiet" href="#how">
                  How it works
                </a>
              </div>
              <p class="pilot reveal r4">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <path d="M12 22s8-3 8-10V5l-8-3-8 3v7c0 7 8 10 8 10z" />
                </svg>
                Free during the Accra pilot. No card, no contract — just your phone.
              </p>
            </div>

            <div class="stage reveal r5" aria-hidden="true">
              <div class="blocks">
                <i class="b1"></i>
                <i class="b2"></i>
                <i class="b3"></i>
              </div>
              <div class="phone">
                <KenteStrip />
                <div class="pad">
                  <div class="shop">Kojo's Cuts</div>
                  <div class="where">Madina, Accra</div>
                  <div class="style">
                    <div class="weave"></div>
                    <div>
                      <div class="nm">Low fade</div>
                      <div class="meta num">45 min · GHS 40.00</div>
                    </div>
                    <div class="check">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2">
                        <path d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                  <div class="slotrow">
                    <span class="pill num">2:00 pm</span>
                    <span class="pill on num">2:30 pm</span>
                    <span class="pill num">3:30 pm</span>
                  </div>
                  <div class="paybar num">
                    <LockIcon size={14} />
                    Pay GHS 10.00 deposit
                  </div>
                  <span class="lockedchip">
                    <i class="d"></i>Locked · Sat 2:30 pm
                  </span>
                </div>
              </div>
            </div>
          </section>

          <section class="statement reveal r5">
            <p>
              A barber loses the 4 pm slot to a no-show and gets nothing.{" "}
              <em>A GHS 10 deposit ends that.</em>
            </p>
          </section>

          <section class="how" id="how">
            <div class="step">
              <i class="bar"></i>
              <div class="no num">01</div>
              <h3>Set up in two minutes</h3>
              <p>
                Your name, your services, your hours. You get a booking link like <b>krado.app/kojo</b> and a
                ready-to-paste WhatsApp status.
              </p>
            </div>
            <div class="step">
              <i class="bar"></i>
              <div class="no num">02</div>
              <h3>Clients lock slots with MoMo</h3>
              <p>
                They pick a style, pick a time, and pay a small deposit — MoMo prompt or direct transfer you
                confirm. The deposit counts toward the cut.
              </p>
            </div>
            <div class="step">
              <i class="bar"></i>
              <div class="no num">03</div>
              <h3>Your money, on one screen</h3>
              <p>
                Daily goal, earnings, susu set-aside, and quiet WhatsApp nudges that bring regulars back on
                their natural cycle. <b>No-show? You keep the deposit.</b>
              </p>
            </div>
          </section>

          <section class="money">
            <div>
              <h2>The day's money does the talking.</h2>
              <p class="mp">
                Every completed cut fills your goal bar and sets a little aside for susu. By Sunday you know
                exactly what the week made — and Krado never touches your money.
              </p>
            </div>
            <div class="goalcard" aria-hidden="true">
              <div class="lbl">
                <span>Today's goal</span>
                <span class="num">72%</span>
              </div>
              <div class="amt num">GHS 145 of 200</div>
              <div class="track">
                <div class="fill"></div>
              </div>
              <div class="susuline">
                <i class="sq"></i>
                <span class="num">GHS 35.00 set aside for susu this week</span>
              </div>
            </div>
          </section>

          <section class="final">
            <h2>Your chair, always booked.</h2>
            <p>Onboard now — your booking link is live before your next client sits down.</p>
            <div class="cta">
              <a class="btn gold" href="/app/onboarding">
                <LockIcon />
                Set up your shop
              </a>
            </div>
          </section>

          <footer>
            <span>
              <b>Krado</b> · ready, prepared (Twi)
            </span>
            <span>Hodges &amp; Co. · OHWPStudios · Accra</span>
          </footer>
        </div>
        <KenteStrip height={8} />
      </body>
    </html>,
  );
});

/* ---------------------------------- booking ---------------------------------- */

const BOOKING_CSS = `
body{background:linear-gradient(180deg,#FBF9F3 0%,var(--mist) 30%)}
.wrap{max-width:480px;margin:0 auto;padding:0 16px 96px}
header{padding:26px 0 14px}
h1{font-family:'Fraunces',serif;font-weight:600;font-size:26px;letter-spacing:-.02em}
.area{font-size:13px;color:var(--muted);margin-top:2px}
h2{font-weight:500;font-size:16px;margin:26px 0 12px}
.stepper{display:flex;gap:8px;margin:14px 0 4px}
.step{flex:1;text-align:center;font-size:12px;font-weight:500;padding:9px 4px;border-radius:10px;border:1px solid var(--line);background:var(--paper);color:var(--muted)}
.step.current{border-color:var(--forest-600);color:var(--forest-900)}
.step.done{background:var(--forest-50);border-color:var(--forest-50);color:var(--forest-900)}
.cards{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.card{background:var(--paper);border:1px solid var(--line);border-radius:16px;overflow:hidden;cursor:pointer;text-align:left;padding:0;font:inherit;color:inherit;box-shadow:var(--shadow-sm);transition:transform .15s ease-out,box-shadow .15s ease-out,border-color .15s ease-out}
.card:hover{transform:translateY(-2px);box-shadow:var(--shadow-lg)}
.card img,.card .ph{width:100%;aspect-ratio:4/3;object-fit:cover;display:block}
.card .ph{background:
  repeating-linear-gradient(90deg,var(--gold-100) 0 14px,#F6E9D2 14px 20px),
  repeating-linear-gradient(0deg,transparent 0 16px,rgba(65,36,2,.10) 16px 21px);
  display:flex;align-items:center;justify-content:center}
.card .body{padding:10px 12px 13px}
.card .nm{font-weight:500}
.card .meta{font-size:12px;color:var(--muted);font-variant-numeric:tabular-nums;margin-top:2px}
.card.sel{border:2px solid var(--forest-600)}
.days{display:flex;gap:8px;overflow-x:auto;padding-bottom:6px;scrollbar-width:none}
.daypill,.slot{min-height:44px;padding:8px 15px;border-radius:999px;border:1px solid #CFCBC0;background:var(--paper);font:inherit;font-size:14px;cursor:pointer;white-space:nowrap;font-variant-numeric:tabular-nums;transition:border-color .15s ease-out,background .15s ease-out}
.daypill:hover,.slot:hover{border-color:var(--forest-600)}
.daypill.sel,.slot.sel{background:var(--forest-900);color:var(--forest-100);border-color:var(--forest-900)}
.slots{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
.muted{color:var(--muted);font-size:13px}
input{width:100%;min-height:48px;border:1px solid #CFCBC0;border-radius:12px;padding:10px 14px;font:inherit;background:var(--paper);margin-top:10px;transition:border-color .15s ease-out}
input:focus{outline:none;border-color:var(--forest-600);box-shadow:0 0 0 3px var(--forest-50)}
.paybtn{display:flex;align-items:center;justify-content:center;gap:9px;width:100%;min-height:54px;border:0;border-radius:14px;background:var(--gold-200);color:var(--gold-900);font:inherit;font-weight:500;font-size:16px;cursor:pointer;margin-top:18px;box-shadow:0 2px 0 var(--gold-600);transition:transform .15s ease-out,box-shadow .15s ease-out}
.paybtn:hover{transform:translateY(-1px);box-shadow:0 3px 0 var(--gold-600),0 10px 20px rgba(239,159,39,.25)}
.paybtn:active{transform:none;box-shadow:0 1px 0 var(--gold-600)}
.paybtn.alt{background:var(--paper);border:1px solid #CFCBC0;color:var(--ink);box-shadow:none}
.paybtn.alt:hover{border-color:var(--ink);box-shadow:none}
.paybtn:disabled{opacity:.5}
.trust{font-size:11.5px;color:var(--muted);margin-top:12px;display:flex;gap:7px;align-items:flex-start}
.trust ul{list-style:none}
.trust li{margin-top:2px}
.hold{background:var(--gold-100);color:var(--gold-900);border-radius:12px;padding:11px 14px;font-size:13px;font-weight:500;margin-top:16px;font-variant-numeric:tabular-nums}
.manual{background:var(--paper);border:1px solid var(--line);border-radius:16px;padding:18px;margin-top:12px;font-size:14px;box-shadow:var(--shadow-sm)}
.manual b{font-variant-numeric:tabular-nums}
.ref{font-size:22px;font-weight:500;letter-spacing:1.5px;font-variant-numeric:tabular-nums;color:var(--forest-900)}
.ok{background:var(--forest-50);color:var(--forest-900);border-radius:18px;padding:24px;margin-top:28px}
.ok h1{font-size:24px}
.ok p{margin-top:8px;font-size:14.5px}
.hidden{display:none}
.foot{margin-top:40px;font-size:12px;color:var(--muted);text-align:center}
.foot a{text-decoration:none;font-weight:500}
.kente-in{display:none}
@media (min-width:720px){
  .wrap{max-width:520px;background:var(--paper);border:1px solid var(--line);border-radius:24px;margin:36px auto 48px;padding:0 28px 56px;box-shadow:var(--shadow-lg);overflow:hidden}
  .kente-in{display:block;margin:0 -28px}
  body>.kente{display:none}
  body{padding-bottom:40px}
}
`;

publicPage.get("/booked", (c) => {
  return c.html(
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <title>Krado — locked</title>
        {FONTS}
        <style dangerouslySetInnerHTML={{ __html: BASE_CSS + BOOKING_CSS }} />
      </head>
      <body>
        <KenteStrip />
        <div class="wrap">
          <div class="kente-in">
            <KenteStrip />
          </div>
          <div class="ok">
            <h1>Slot locked</h1>
            <p>Your deposit is in and your slot is locked. Confirmation is on its way to your WhatsApp.</p>
          </div>
          <p class="foot">
            <a href="/">Krado</a> · Lock your slot.
          </p>
        </div>
      </body>
    </html>,
  );
});

publicPage.get("/:handle", async (c) => {
  const handle = c.req.param("handle");
  const artisan = await c.env.DB.prepare(
    `SELECT id, handle, shop_name, area, language, deposit_pct, deposit_floor, accept_manual, bank_details
     FROM artisans WHERE handle = ? AND status = 'active'`,
  )
    .bind(handle)
    .first<{
      id: string;
      handle: string;
      shop_name: string;
      area: string;
      language: Lang;
      deposit_pct: number;
      deposit_floor: number;
      accept_manual: number;
      bank_details: string | null;
    }>();
  if (!artisan) return c.notFound();

  const { results: services } = await c.env.DB.prepare(
    "SELECT id, name, price, duration_min, photo_key FROM services WHERE artisan_id = ? AND active = 1 ORDER BY position",
  )
    .bind(artisan.id)
    .all<{ id: string; name: string; price: number; duration_min: number; photo_key: string | null }>();

  const lang = artisan.language;
  const config = {
    handle: artisan.handle,
    lang,
    accept_manual: artisan.accept_manual === 1,
    has_bank: !!artisan.bank_details,
    services: services.map((s) => ({ id: s.id, price: s.price })),
    i18n: {
      pick_time: t(lang, "pick_time"),
      hold_countdown: t(lang, "hold_countdown", { minutes: "{m}" }),
      pay_deposit: t(lang, "pay_deposit", { amount: "{amt}" }),
      balance_at_shop: t(lang, "balance_at_shop", { deposit: "{d}", balance: "{b}" }),
      error_generic: t(lang, "error_generic"),
    },
  };

  return c.html(
    <html lang={lang}>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <title>{artisan.shop_name} — Krado</title>
        <meta
          name="description"
          content={`Book your slot at ${artisan.shop_name}, ${artisan.area}. Lock it with a small MoMo deposit.`}
        />
        {FONTS}
        <style dangerouslySetInnerHTML={{ __html: BASE_CSS + BOOKING_CSS }} />
      </head>
      <body>
        <KenteStrip />
        <div class="wrap">
          <div class="kente-in">
            <KenteStrip />
          </div>
          <header>
            <h1>{artisan.shop_name}</h1>
            <p class="area">{artisan.area}</p>
          </header>

          <div class="stepper" id="stepper">
            <div class="step current" data-step="1">
              1 · {t(lang, "step_style")}
            </div>
            <div class="step" data-step="2">
              2 · {t(lang, "step_time")}
            </div>
            <div class="step" data-step="3">
              3 · {t(lang, "step_lock")}
            </div>
          </div>

          <section id="sec-style">
            <h2>{t(lang, "pick_style")}</h2>
            <div class="cards">
              {services.map((s) => (
                <button class="card" data-svc={s.id} data-price={s.price} data-name={s.name} type="button">
                  {s.photo_key ? (
                    <img src={`/media/${s.photo_key}`} alt={s.name} loading="lazy" />
                  ) : (
                    <div class="ph"></div>
                  )}
                  <div class="body">
                    <div class="nm">{s.name}</div>
                    <div class="meta">
                      {s.duration_min} min · {formatGHS(s.price)}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section id="sec-time" class="hidden">
            <h2>{t(lang, "pick_time")}</h2>
            <div class="days" id="days"></div>
            <div class="slots" id="slots"></div>
            <p class="muted hidden" id="noslots">
              —
            </p>
          </section>

          <section id="sec-lock" class="hidden">
            <h2>{t(lang, "lock_slot")}</h2>
            <input id="phone" type="tel" inputmode="tel" placeholder="024 412 3456" autocomplete="tel" />
            <input
              id="cname"
              type="text"
              placeholder={lang === "tw" ? "Wo din (optional)" : "Your name (optional)"}
              autocomplete="name"
            />
            <div class="hold hidden" id="holdbox"></div>
            <button class="paybtn" id="paybtn" type="button">
              <LockIcon />
              <span id="paylabel">{t(lang, "pay_deposit", { amount: "…" })}</span>
            </button>
            {artisan.accept_manual === 1 && (
              <button class="paybtn alt" id="manualbtn" type="button">
                {lang === "tw" ? "Tua kɔ MoMo so tee" : "Pay direct to MoMo / bank"}
              </button>
            )}
            <div class="manual hidden" id="manualbox"></div>
            <div class="trust">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                aria-hidden="true"
                style="flex-shrink:0;margin-top:2px"
              >
                <path d="M12 22s8-3 8-10V5l-8-3-8 3v7c0 7 8 10 8 10z" />
              </svg>
              <ul>
                <li>{t(lang, "deposit_counts")}</li>
                <li>{t(lang, "deposit_no_show", { artisan: artisan.shop_name })}</li>
                <li>{t(lang, "deposit_refund", { artisan: artisan.shop_name })}</li>
              </ul>
            </div>
          </section>
          <p class="foot">
            <a href="/">Krado</a> · Lock your slot.
          </p>
        </div>
        <script id="cfg" type="application/json" dangerouslySetInnerHTML={{ __html: JSON.stringify(config) }} />
        <script dangerouslySetInnerHTML={{ __html: PAGE_JS }} />
      </body>
    </html>,
  );
});

const PAGE_JS = `
(function(){
var cfg=JSON.parse(document.getElementById('cfg').textContent);
var state={svc:null,price:0,date:null,slot:null,hold:null,exp:null,timer:null};
var $=function(id){return document.getElementById(id)};
function ghs(p){var c=Math.floor(p/100),r=p%100;return 'GHS '+c.toLocaleString()+'.'+String(r).padStart(2,'0')}
function show(id){$(id).classList.remove('hidden')}
function hide(id){$(id).classList.add('hidden')}
function step(n){document.querySelectorAll('.step').forEach(function(el){
  var s=+el.dataset.step;el.className='step'+(s<n?' done':s===n?' current':'')})}

// step 1: style
document.querySelectorAll('.card').forEach(function(card){
  card.addEventListener('click',function(){
    document.querySelectorAll('.card').forEach(function(x){x.classList.remove('sel')});
    card.classList.add('sel');
    state.svc=card.dataset.svc;state.price=+card.dataset.price;
    show('sec-time');step(2);buildDays();
    $('sec-time').scrollIntoView({behavior:'smooth'});
  });
});

function buildDays(){
  var days=$('days');days.innerHTML='';
  for(var i=0;i<7;i++){
    var d=new Date(Date.now()+i*86400000);
    var iso=d.toISOString().slice(0,10);
    var b=document.createElement('button');b.type='button';b.className='daypill';
    b.textContent=i===0?'Today':d.toLocaleDateString(undefined,{weekday:'short',day:'numeric'});
    b.dataset.date=iso;
    b.addEventListener('click',function(e){
      document.querySelectorAll('.daypill').forEach(function(x){x.classList.remove('sel')});
      e.currentTarget.classList.add('sel');loadSlots(e.currentTarget.dataset.date);
    });
    days.appendChild(b);
  }
  days.firstChild.click();
}

function loadSlots(date){
  state.date=date;state.slot=null;
  fetch('/api/p/'+cfg.handle+'/slots?date='+date+'&service='+state.svc)
    .then(function(r){return r.json()})
    .then(function(b){
      var wrap=$('slots');wrap.innerHTML='';
      if(!b.slots||!b.slots.length){show('noslots');$('noslots').textContent='No open slots this day.';return}
      hide('noslots');
      b.slots.forEach(function(m){
        var btn=document.createElement('button');btn.type='button';btn.className='slot';
        var h=Math.floor(m/60),mm=m%60,h12=h%12===0?12:h%12;
        btn.textContent=h12+':'+String(mm).padStart(2,'0')+(h<12?' am':' pm');
        btn.addEventListener('click',function(){
          document.querySelectorAll('.slot').forEach(function(x){x.classList.remove('sel')});
          btn.classList.add('sel');state.slot=m;show('sec-lock');step(3);updatePay();
          $('sec-lock').scrollIntoView({behavior:'smooth'});
        });
        wrap.appendChild(btn);
      });
    });
}

function updatePay(){
  $('paylabel').textContent=cfg.i18n.pay_deposit.replace('{amt}',state.hold?ghs(state.hold.deposit):'deposit');
}

function ensureHold(){
  if(state.hold)return Promise.resolve(state.hold);
  var phone=$('phone').value.trim();
  if(!phone){$('phone').focus();return Promise.reject('phone')}
  return fetch('/api/p/'+cfg.handle+'/hold',{method:'POST',headers:{'content-type':'application/json'},
    body:JSON.stringify({service_id:state.svc,date:state.date,slot:state.slot,phone:phone,client_name:$('cname').value.trim()||undefined})})
    .then(function(r){if(!r.ok)throw r;return r.json()})
    .then(function(h){state.hold={token:h.hold_token,deposit:h.deposit};state.exp=new Date(h.expires_at);
      startCountdown();updatePay();
      $('holdbox').textContent='';show('holdbox');tick();
      return state.hold});
}
function tick(){
  if(!state.exp)return;
  var ms=state.exp-Date.now();
  if(ms<=0){hide('holdbox');state.hold=null;clearInterval(state.timer);return}
  var m=Math.ceil(ms/60000);
  $('holdbox').textContent=cfg.i18n.hold_countdown.replace('{m}',m);
}
function startCountdown(){clearInterval(state.timer);state.timer=setInterval(tick,5000)}

$('paybtn').addEventListener('click',function(){
  $('paybtn').disabled=true;
  ensureHold().then(function(h){
    return fetch('/api/bookings/'+h.token+'/pay',{method:'POST'})
      .then(function(r){if(!r.ok)throw r;return r.json()})
      .then(function(b){location.href=b.authorization_url});
  }).catch(function(e){if(e!=='phone')alert(cfg.i18n.error_generic)})
  .finally(function(){$('paybtn').disabled=false});
});

var mb=$('manualbtn');
if(mb)mb.addEventListener('click',function(){
  mb.disabled=true;
  ensureHold().then(function(h){
    return fetch('/api/bookings/'+h.token+'/manual',{method:'POST',headers:{'content-type':'application/json'},
      body:JSON.stringify({method:'momo'})})
      .then(function(r){if(!r.ok)throw r;return r.json()})
      .then(function(b){
        var box=$('manualbox');
        var html='<p>Send <b>'+ghs(b.amount)+'</b> to:</p>';
        html+='<p><b>MoMo: '+b.instructions.momo_number+'</b></p>';
        if(b.instructions.bank_details)html+='<p>or bank: '+b.instructions.bank_details+'</p>';
        html+='<p style="margin-top:8px">Reference (add this to your transfer):</p><p class="ref">'+b.reference+'</p>';
        html+='<p class="muted" style="margin-top:8px">Your slot is held for 60 minutes. It locks when the shop confirms your payment.</p>';
        box.innerHTML=html;box.classList.remove('hidden');
      });
  }).catch(function(e){if(e!=='phone')alert(cfg.i18n.error_generic)})
  .finally(function(){mb.disabled=false});
});
})();
`;
