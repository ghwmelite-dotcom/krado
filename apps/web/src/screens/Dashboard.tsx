import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { Lang } from "@krado/shared";
import {
  accraMinutesOf,
  formatGHS,
  greetingFor,
  minutesToLabel,
  t,
} from "@krado/shared";
import { CoinsIcon, GoalBar, MetricTile, NudgeCard, PeopleIcon, SusuTile, TimelineItem } from "@krado/ui";
import { SettingsIcon } from "../components/SettingsIcon";
import { api } from "../api";
import { useLang } from "../lang";
import type { DashboardPayload } from "../types";

/**
 * Sharing the booking link is the #1 growth action, so it lives on the
 * dashboard permanently — not just in the empty state. Native share sheet
 * (WhatsApp/IG) where available, with a copy fallback.
 */
function ShareShopCard({ lang, handle, shopName }: { lang: Lang; handle: string; shopName: string }) {
  const [copied, setCopied] = useState(false);
  const link = `${window.location.origin}/${handle}`;
  const message = t(lang, "onboard_share_message", { shop: shopName, link });

  async function copy() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable (http, old WebView) — the link stays visible to long-press.
    }
  }

  async function share() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: shopName, text: message, url: link });
        return;
      } catch {
        // user dismissed, or share unsupported — fall through to copy
      }
    }
    await copy();
  }

  return (
    <section className="share-card">
      <div className="share-card__head">
        <ShareIcon />
        <h2>{t(lang, "share_title")}</h2>
      </div>
      <p className="share-card__guide">{t(lang, "share_guide")}</p>
      <span className="share-card__link">{link.replace(/^https?:\/\//, "")}</span>
      <div className="share-card__actions">
        <button type="button" className="krado-btn krado-btn--gold" onClick={() => void share()}>
          {t(lang, "share_button")}
        </button>
        <button type="button" className="krado-btn krado-btn--outline" onClick={() => void copy()}>
          {copied ? t(lang, "copied") : t(lang, "copy_link")}
        </button>
      </div>
    </section>
  );
}

function ShareIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" />
    </svg>
  );
}

const WELCOME_KEY = "krado_welcomed_v1";

/** Shown once, the first time an artisan opens the dashboard. */
function WelcomeCard({ lang, name, onDismiss }: { lang: Lang; name: string; onDismiss: () => void }) {
  const points: Array<{ key: "welcome_share" | "welcome_money" | "welcome_noshow"; n: string }> = [
    { key: "welcome_share", n: "1" },
    { key: "welcome_money", n: "2" },
    { key: "welcome_noshow", n: "3" },
  ];
  return (
    <section className="welcome">
      <p className="welcome__title">{t(lang, "welcome_title", { name })}</p>
      <p className="welcome__lead">{t(lang, "welcome_lead")}</p>
      <ul className="welcome__list">
        {points.map((p) => (
          <li key={p.key}>
            <span className="welcome__n">{p.n}</span>
            <span>{t(lang, p.key)}</span>
          </li>
        ))}
      </ul>
      <button type="button" className="krado-btn krado-btn--forest" onClick={onDismiss}>
        {t(lang, "welcome_dismiss")}
      </button>
    </section>
  );
}

export function Dashboard() {
  const { lang, setLang } = useLang();
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [failed, setFailed] = useState(false);
  const [showWelcome, setShowWelcome] = useState(() => {
    try {
      return localStorage.getItem(WELCOME_KEY) === null;
    } catch {
      return false;
    }
  });

  function dismissWelcome() {
    setShowWelcome(false);
    try {
      localStorage.setItem(WELCOME_KEY, "1");
    } catch {
      // private mode — fine, it just shows again next time
    }
  }

  const load = useCallback(async () => {
    try {
      const payload = await api.dashboard();
      setData(payload);
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggleLang() {
    const next = lang === "en" ? "tw" : "en";
    setLang(next);
    // Persist on the artisan record; the toggle never blocks on the network.
    api.patchArtisan({ language: next }).catch(() => {});
  }

  async function actOnNudge(id: string, action: "send" | "dismiss") {
    setData((prev) => (prev ? { ...prev, pending_nudges: [] } : prev));
    api.nudgeAction(id, action).catch(() => {});
  }

  if (failed) {
    return <p className="loading">{t(lang, "error_generic")}</p>;
  }
  if (!data) {
    return <p className="loading">{t(lang, "loading")}</p>;
  }

  const minutesNow = accraMinutesOf(new Date().toISOString());
  const firstName = (data.artisan.name ?? "").split(/\s+/)[0] || data.artisan.name || "";
  const nudge = data.pending_nudges[0];

  return (
    <>
      <header className="screen-head">
        <div>
          <h1 className="screen-head__greeting">
            {greetingFor(lang, minutesNow)}, {firstName}
          </h1>
          <p className="screen-head__sub">{data.artisan.shop_name}</p>
        </div>
        <div className="screen-head__tools">
          <button type="button" className="lang-pill" onClick={toggleLang} aria-label={t(lang, "language_label")}>
            <span className={`lang-pill__opt${lang === "en" ? " lang-pill__opt--on" : ""}`}>en</span>
            <span className={`lang-pill__opt${lang === "tw" ? " lang-pill__opt--on" : ""}`}>tw</span>
          </button>
          <Link to="/settings" className="icon-link" aria-label={t(lang, "settings")}>
            <SettingsIcon size={19} />
          </Link>
        </div>
      </header>

      {data.offline && <p className="banner banner--offline">{t(lang, "offline_cached")}</p>}

      {showWelcome && <WelcomeCard lang={lang} name={firstName} onDismiss={dismissWelcome} />}

      <div className="goal-hero">
        <GoalBar label={t(lang, "goal_label")} earned={data.earned_today} goal={data.daily_goal} lang={lang} />
      </div>

      <div className="tile-row">
        <MetricTile
          label={t(lang, "earnings_today")}
          value={formatGHS(data.earned_today)}
          icon={<CoinsIcon size={18} />}
          tone="gold"
        />
        <MetricTile
          label={t(lang, "clients_week")}
          value={String(data.clients_week)}
          icon={<PeopleIcon size={18} />}
          tone="forest"
        />
      </div>

      <SusuTile label={t(lang, "susu_week")} amountPesewas={data.susu_week} />

      <ShareShopCard lang={lang} handle={data.artisan.handle} shopName={data.artisan.shop_name} />

      {data.pending_manual_claims > 0 && (
        <Link to="/bookings" className="banner banner--claims">
          {t(lang, "claims_pending", { count: data.pending_manual_claims })}
        </Link>
      )}

      {nudge && (
        <NudgeCard
          lang={lang}
          insight={t(lang, "nudge_due_short", { client: nudge.client_name, days: nudge.cycle_days })}
          actionLabel={t(lang, "nudge_send")}
          onAction={() => void actOnNudge(nudge.id, "send")}
          onLater={() => void actOnNudge(nudge.id, "dismiss")}
        />
      )}

      <section>
        <h2 className="section-title">{t(lang, "up_next")}</h2>
        {data.up_next.length === 0 ? (
          <p className="empty-note">{t(lang, "no_bookings_today")}</p>
        ) : (
          <ul className="krado-timeline">
            {data.up_next.map((booking, i) => (
              <TimelineItem
                key={booking.id}
                lang={lang}
                name={booking.client_name}
                timeLabel={minutesToLabel(accraMinutesOf(booking.starts_at))}
                serviceName={booking.service_name}
                pricePesewas={booking.price}
                status={booking.status}
                last={i === data.up_next.length - 1}
              />
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
