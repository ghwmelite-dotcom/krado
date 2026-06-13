import { Hono } from "hono";
import { formatGHS, t, type Lang } from "@krado/shared";
import type { AppEnv } from "../env";

/**
 * SSR public booking page — krado.app/{handle}. No framework: fast first
 * paint on entry-level Androids over 3G. All interactivity is one small
 * inline vanilla-JS module talking to /api/p/{handle}/*.
 */
export const publicPage = new Hono<AppEnv>();

const KENTE = ["#BA7517", "#2C2C2A", "#3B6D11", "#A32D2D", "#BA7517", "#2C2C2A", "#3B6D11"];
const KENTE_RATIO = [2, 1, 2, 1, 2, 1, 2];

const CSS = `
*{box-sizing:border-box;margin:0;padding:0}
:root{--gold-100:#FAC775;--gold-200:#EF9F27;--gold-900:#412402;--forest-50:#E1F5EE;--forest-100:#9FE1CB;--forest-600:#0F6E56;--forest-900:#04342C;--clay-50:#FAECE7;--clay-800:#712B13;--ink:#2C2C2A;--paper:#FFF;--mist:#F1EFE8}
body{font-family:'DM Sans',system-ui,sans-serif;background:var(--mist);color:var(--ink);font-size:16px;line-height:1.5}
.wrap{max-width:480px;margin:0 auto;padding:0 16px 96px}
.kente{display:flex;height:5px}
header{padding:24px 0 16px}
h1{font-weight:500;font-size:22px}
.area{font-size:13px;color:#6b6b66}
h2{font-weight:500;font-size:16px;margin:24px 0 12px}
.stepper{display:flex;gap:8px;margin:16px 0}
.step{flex:1;text-align:center;font-size:12px;padding:8px 4px;border-radius:8px;border:1px solid #ddd;background:var(--paper);color:#6b6b66}
.step.current{border-color:var(--forest-600);color:var(--forest-900)}
.step.done{background:var(--forest-50);border-color:var(--forest-50);color:var(--forest-900)}
.cards{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.card{background:var(--paper);border:1px solid #e5e3dc;border-radius:14px;overflow:hidden;cursor:pointer;text-align:left;padding:0;font:inherit;color:inherit}
.card img,.card .ph{width:100%;aspect-ratio:4/3;object-fit:cover;background:var(--mist);display:block}
.card .ph{display:flex;align-items:center;justify-content:center;color:#b5b2a6;font-size:12px}
.card .body{padding:10px 12px 12px}
.card .nm{font-weight:500}
.card .meta{font-size:12px;color:#6b6b66;font-variant-numeric:tabular-nums}
.card.sel{border:2px solid var(--forest-600)}
.days{display:flex;gap:8px;overflow-x:auto;padding-bottom:4px}
.daypill,.slot{min-height:44px;padding:8px 14px;border-radius:999px;border:1px solid #cfccc2;background:var(--paper);font:inherit;font-size:14px;cursor:pointer;white-space:nowrap}
.daypill.sel,.slot.sel{background:var(--forest-900);color:var(--forest-100);border-color:var(--forest-900)}
.slots{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}
.muted{color:#6b6b66;font-size:13px}
input{width:100%;min-height:44px;border:1px solid #cfccc2;border-radius:10px;padding:10px 12px;font:inherit;background:var(--paper);margin-top:8px}
.paybtn{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;min-height:52px;border:0;border-radius:14px;background:var(--gold-200);color:var(--gold-900);font:inherit;font-weight:500;font-size:16px;cursor:pointer;margin-top:16px}
.paybtn.alt{background:var(--paper);border:1px solid #cfccc2;color:var(--ink)}
.paybtn:disabled{opacity:.5}
.trust{font-size:11px;color:#6b6b66;margin-top:10px;display:flex;gap:6px;align-items:flex-start}
.trust ul{list-style:none}
.hold{background:var(--gold-100);color:var(--gold-900);border-radius:10px;padding:10px 12px;font-size:13px;margin-top:16px;font-variant-numeric:tabular-nums}
.manual{background:var(--paper);border:1px solid #e5e3dc;border-radius:14px;padding:16px;margin-top:12px;font-size:14px}
.manual b{font-variant-numeric:tabular-nums}
.ref{font-size:20px;font-weight:500;letter-spacing:1px;font-variant-numeric:tabular-nums}
.ok{background:var(--forest-50);color:var(--forest-900);border-radius:14px;padding:20px;margin-top:24px}
.hidden{display:none}
@media (prefers-reduced-motion:no-preference){.slot,.daypill,.card{transition:background .15s ease-out,border-color .15s ease-out}}
`;

function KenteStrip() {
  return (
    <div class="kente" aria-hidden="true">
      {KENTE.map((color, i) => (
        <div style={`flex:${KENTE_RATIO[i]};background:${color}`} />
      ))}
    </div>
  );
}

const LANDING_CSS = `
.hero{padding:56px 0 32px}
.hero .brand{font-family:'DM Sans',system-ui,sans-serif;font-weight:500;font-size:34px;letter-spacing:-.5px}
.hero .tag{font-size:20px;margin-top:8px}
.hero .sub{color:#6b6b66;margin-top:12px;max-width:38ch}
.cta{display:flex;flex-direction:column;gap:12px;margin-top:28px;max-width:340px}
.how{margin-top:40px;display:grid;gap:16px}
.how .item{background:var(--paper);border:1px solid #e5e3dc;border-radius:14px;padding:16px}
.how .n{display:inline-flex;width:28px;height:28px;border-radius:999px;background:var(--forest-50);color:var(--forest-900);align-items:center;justify-content:center;font-size:13px;font-weight:500;margin-bottom:8px}
footer{margin-top:48px;padding:24px 0;color:#6b6b66;font-size:12px}
`;

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
        <style>{CSS + LANDING_CSS}</style>
      </head>
      <body>
        <KenteStrip />
        <div class="wrap">
          <div class="hero">
            <div class="brand">Krado</div>
            <p class="tag">Krado? Lock your slot.</p>
            <p class="sub">
              WhatsApp-first bookings for barbers, hairdressers and seamstresses. Clients pay a small
              MoMo deposit to lock their slot — no-shows die, and your day's money shows on one screen.
            </p>
            <div class="cta">
              <a class="paybtn" href="/app/onboarding" style="text-decoration:none">
                Set up your shop — 2 minutes
              </a>
              <a class="paybtn alt" href="/app/" style="text-decoration:none">
                Open your dashboard
              </a>
            </div>
          </div>
          <div class="how">
            <div class="item">
              <div class="n">1</div>
              <div>Onboard in two minutes: your services, prices and hours. You get a booking link like <b>krado.app/kojo</b>.</div>
            </div>
            <div class="item">
              <div class="n">2</div>
              <div>Paste the link in your WhatsApp status and IG bio. Clients pick a style, pick a time, and lock it with a deposit.</div>
            </div>
            <div class="item">
              <div class="n">3</div>
              <div>The deposit counts toward the cut. No-show? You keep it. Your daily goal, earnings and susu set-aside live on one screen.</div>
            </div>
          </div>
          <footer>Hodges &amp; Co. · OHWPStudios · Accra</footer>
        </div>
      </body>
    </html>,
  );
});

publicPage.get("/booked", (c) => {
  return c.html(
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <title>Krado — locked</title>
        <style>{CSS}</style>
      </head>
      <body>
        <KenteStrip />
        <div class="wrap">
          <div class="ok">
            <h1>Slot locked</h1>
            <p>Your deposit is in and your slot is locked. Confirmation is on its way to your WhatsApp.</p>
          </div>
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
        <meta name="description" content={`Book your slot at ${artisan.shop_name}, ${artisan.area}. Lock it with a small MoMo deposit.`} />
        <style>{CSS}</style>
      </head>
      <body>
        <KenteStrip />
        <div class="wrap">
          <header>
            <h1>{artisan.shop_name}</h1>
            <p class="area">{artisan.area}</p>
          </header>

          <div class="stepper" id="stepper">
            <div class="step current" data-step="1">1 · {t(lang, "step_style")}</div>
            <div class="step" data-step="2">2 · {t(lang, "step_time")}</div>
            <div class="step" data-step="3">3 · {t(lang, "step_lock")}</div>
          </div>

          <section id="sec-style">
            <h2>{t(lang, "pick_style")}</h2>
            <div class="cards">
              {services.map((s) => (
                <button class="card" data-svc={s.id} data-price={s.price} data-name={s.name} type="button">
                  {s.photo_key ? <img src={`/media/${s.photo_key}`} alt={s.name} loading="lazy" /> : <div class="ph">{artisan.shop_name}</div>}
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
            <p class="muted hidden" id="noslots">—</p>
          </section>

          <section id="sec-lock" class="hidden">
            <h2>{t(lang, "lock_slot")}</h2>
            <input id="phone" type="tel" inputmode="tel" placeholder="024 412 3456" autocomplete="tel" />
            <input id="cname" type="text" placeholder={lang === "tw" ? "Wo din (optional)" : "Your name (optional)"} autocomplete="name" />
            <div class="hold hidden" id="holdbox"></div>
            <button class="paybtn" id="paybtn" type="button">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <rect x="5" y="11" width="14" height="9" rx="2" />
                <path d="M8 11V7a4 4 0 0 1 8 0v4" />
              </svg>
              <span id="paylabel">{t(lang, "pay_deposit", { amount: "…" })}</span>
            </button>
            {artisan.accept_manual === 1 && (
              <button class="paybtn alt" id="manualbtn" type="button">
                {lang === "tw" ? "Tua kɔ MoMo so tee" : "Pay direct to MoMo / bank"}
              </button>
            )}
            <div class="manual hidden" id="manualbox"></div>
            <div class="trust">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true" style="flex-shrink:0;margin-top:2px">
                <path d="M12 22s8-3 8-10V5l-8-3-8 3v7c0 7 8 10 8 10z" />
              </svg>
              <ul>
                <li>{t(lang, "deposit_counts")}</li>
                <li>{t(lang, "deposit_no_show", { artisan: artisan.shop_name })}</li>
                <li>{t(lang, "deposit_refund", { artisan: artisan.shop_name })}</li>
              </ul>
            </div>
          </section>
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

function deposit(){return state.hold?state.hold.deposit:null}
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
      body:JSON.stringify({method:cfg.has_bank?'momo':'momo'})})
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
