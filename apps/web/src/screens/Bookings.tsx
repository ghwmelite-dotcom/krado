import { useCallback, useEffect, useState } from "react";
import {
  accraDateOf,
  accraMinutesOf,
  formatGHS,
  minutesToLabel,
  t,
} from "@krado/shared";
import { TimelineItem } from "@krado/ui";
import { api } from "../api";
import { useLang } from "../lang";
import type { BookingRow, ManualClaim } from "../types";

export function Bookings() {
  const { lang } = useLang();
  const [date, setDate] = useState(() => accraDateOf(new Date().toISOString()));
  const [bookings, setBookings] = useState<BookingRow[] | null>(null);
  const [claims, setClaims] = useState<ManualClaim[]>([]);
  const [cancelTarget, setCancelTarget] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [bookingsRes, claimsRes] = await Promise.all([
        api.bookings(date),
        api.manualClaims().catch(() => ({ claims: [] as ManualClaim[] })),
      ]);
      setBookings(bookingsRes.bookings);
      setClaims(claimsRes.claims.filter((c) => c.status === "pending"));
    } catch {
      setError(t(lang, "error_generic"));
    }
  }, [date, lang]);

  useEffect(() => {
    void load();
  }, [load]);

  async function transition(id: string, status: "completed" | "no_show" | "cancelled_by_artisan") {
    setError(null);
    try {
      await api.setBookingStatus(id, status);
      await load();
    } catch {
      setError(t(lang, "error_generic"));
    } finally {
      setCancelTarget(null);
    }
  }

  async function resolveClaim(id: string, action: "confirm" | "reject") {
    setError(null);
    try {
      if (action === "confirm") await api.confirmClaim(id);
      else await api.rejectClaim(id);
      await load();
    } catch {
      setError(t(lang, "error_generic"));
    }
  }

  return (
    <>
      <header className="screen-head">
        <h1 className="screen-head__greeting">{t(lang, "bookings_title")}</h1>
        <label className="field">
          <span className="field__label">{t(lang, "date_label")}</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
      </header>

      {error && <p className="form-error">{error}</p>}

      {bookings === null ? (
        <p className="loading">{t(lang, "loading")}</p>
      ) : bookings.length === 0 ? (
        <p className="empty-note">{t(lang, "no_bookings_date")}</p>
      ) : (
        <ul className="krado-timeline card">
          {bookings.map((booking, i) => (
            <TimelineItem
              key={booking.id}
              lang={lang}
              name={booking.client_name}
              timeLabel={minutesToLabel(accraMinutesOf(booking.starts_at))}
              serviceName={booking.service_name}
              pricePesewas={booking.price}
              status={booking.status}
              last={i === bookings.length - 1}
              actions={
                booking.status === "locked" ? (
                  <div className="booking-actions">
                    <button
                      type="button"
                      className="krado-btn krado-btn--forest"
                      onClick={() => void transition(booking.id, "completed")}
                    >
                      {t(lang, "mark_done")}
                    </button>
                    <button
                      type="button"
                      className="krado-btn krado-btn--clay"
                      onClick={() => void transition(booking.id, "no_show")}
                    >
                      {t(lang, "mark_no_show")}
                    </button>
                    <button
                      type="button"
                      className="krado-btn krado-btn--ghost"
                      onClick={() => setCancelTarget(booking.id)}
                    >
                      {t(lang, "cancel_booking")}
                    </button>
                  </div>
                ) : undefined
              }
            />
          ))}
        </ul>
      )}

      {claims.length > 0 && (
        <section className="card">
          <h2 className="section-title">{t(lang, "manual_claims_title")}</h2>
          {claims.map((claim) => (
            <div className="claim-row" key={claim.id}>
              <p className="claim-row__meta" data-money>
                <span className="claim-row__ref">{claim.reference}</span> · {formatGHS(claim.amount)} ·{" "}
                {claim.method === "momo" ? "MoMo" : "Bank"} · {claim.client_name ?? claim.phone} ·{" "}
                {claim.service_name} · {claim.date} {minutesToLabel(claim.slot)}
              </p>
              <div className="booking-actions">
                <button
                  type="button"
                  className="krado-btn krado-btn--forest"
                  onClick={() => void resolveClaim(claim.id, "confirm")}
                >
                  {t(lang, "claim_confirm")}
                </button>
                <button
                  type="button"
                  className="krado-btn krado-btn--clay"
                  onClick={() => void resolveClaim(claim.id, "reject")}
                >
                  {t(lang, "claim_reject")}
                </button>
              </div>
            </div>
          ))}
        </section>
      )}

      {cancelTarget && (
        <div className="confirm-overlay" role="dialog" aria-modal="true" aria-label={t(lang, "cancel_confirm_title")}>
          <div className="confirm-dialog">
            <h2 className="section-title">{t(lang, "cancel_confirm_title")}</h2>
            <p>{t(lang, "cancel_confirm_body")}</p>
            <div className="form-actions">
              <button
                type="button"
                className="krado-btn krado-btn--ghost"
                onClick={() => setCancelTarget(null)}
              >
                {t(lang, "keep_booking")}
              </button>
              <button
                type="button"
                className="krado-btn krado-btn--clay"
                onClick={() => void transition(cancelTarget, "cancelled_by_artisan")}
              >
                {t(lang, "confirm_cancel")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
