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
import { GoalBar, MetricTile, NudgeCard, SusuTile, TimelineItem } from "@krado/ui";
import { SettingsIcon } from "../components/SettingsIcon";
import { api } from "../api";
import { useLang } from "../lang";
import type { DashboardPayload } from "../types";

/** Empty chairs are an action, not a dead end: surface the booking link. */
function ShareLinkCard({ lang, handle }: { lang: Lang; handle: string }) {
  const [copied, setCopied] = useState(false);
  const link = `${window.location.origin}/${handle}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable (http, old WebView) — the link is still visible to long-press.
    }
  }

  return (
    <div className="share-cta">
      <p className="share-cta__note">{t(lang, "no_bookings_today")}</p>
      <div className="share-cta__row">
        <span className="share-cta__link">{link.replace(/^https?:\/\//, "")}</span>
        <button type="button" className="krado-btn krado-btn--forest" onClick={() => void copy()}>
          {copied ? t(lang, "copied") : t(lang, "copy_link")}
        </button>
      </div>
    </div>
  );
}

export function Dashboard() {
  const { lang, setLang } = useLang();
  const [data, setData] = useState<DashboardPayload | null>(null);
  const [failed, setFailed] = useState(false);

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
  const firstName = data.artisan.name.split(/\s+/)[0] ?? data.artisan.name;
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

      <div className="card">
        <GoalBar label={t(lang, "goal_label")} earned={data.earned_today} goal={data.daily_goal} lang={lang} />
      </div>

      <div className="tile-row">
        <MetricTile label={t(lang, "earnings_today")} value={formatGHS(data.earned_today)} />
        <MetricTile label={t(lang, "clients_week")} value={String(data.clients_week)} />
      </div>

      <SusuTile label={t(lang, "susu_week")} amountPesewas={data.susu_week} />

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
          <ShareLinkCard lang={lang} handle={data.artisan.handle} />
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
