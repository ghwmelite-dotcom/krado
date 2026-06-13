import { useEffect, useState } from "react";
import { accraDateOf, formatGHS, t } from "@krado/shared";
import { MetricTile, SusuTile } from "@krado/ui";
import { api } from "../api";
import { useLang } from "../lang";
import type { BookingRow, DashboardPayload } from "../types";

interface LedgerDay {
  date: string;
  bookings: BookingRow[];
  total: number;
}

export function Money() {
  const { lang } = useLang();
  const [dash, setDash] = useState<DashboardPayload | null>(null);
  const [ledger, setLedger] = useState<LedgerDay[] | null>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const [dashRes, ...days] = await Promise.all([
        api.dashboard().catch(() => null),
        ...Array.from({ length: 7 }, (_, i) => {
          const date = accraDateOf(new Date(Date.now() - i * 86_400_000).toISOString());
          return api
            .bookings(date)
            .then((res) => ({ date, bookings: res.bookings }))
            .catch(() => ({ date, bookings: [] as BookingRow[] }));
        }),
      ]);
      if (!alive) return;
      setDash(dashRes);
      setLedger(
        days
          .map(({ date, bookings }) => {
            const completed = bookings.filter((b) => b.status === "completed");
            return {
              date,
              bookings: completed,
              total: completed.reduce((sum, b) => sum + b.price, 0),
            };
          })
          .filter((day) => day.bookings.length > 0),
      );
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (!ledger) {
    return <p className="loading">{t(lang, "loading")}</p>;
  }

  return (
    <>
      <header className="screen-head">
        <h1 className="screen-head__greeting">{t(lang, "money_title")}</h1>
      </header>

      {dash && (
        <>
          <div className="tile-row">
            <MetricTile label={t(lang, "earnings_today")} value={formatGHS(dash.earned_today)} />
            <MetricTile label={t(lang, "clients_week")} value={String(dash.clients_week)} />
          </div>
          <SusuTile
            label={t(lang, "susu_week")}
            amountPesewas={dash.susu_week}
            sublabel={`${t(lang, "susu_label")}: ${formatGHS(dash.susu_today)}`}
          />
        </>
      )}

      <section className="card">
        <h2 className="section-title">{t(lang, "ledger_title")}</h2>
        {ledger.length === 0 ? (
          <p className="empty-note">{t(lang, "ledger_empty")}</p>
        ) : (
          ledger.map((day) => (
            <div className="ledger-day" key={day.date}>
              <div className="ledger-day__head">
                <span>{day.date}</span>
                <span>
                  {t(lang, "total_label")}: {formatGHS(day.total)}
                </span>
              </div>
              {day.bookings.map((booking) => (
                <div className="ledger-line" key={booking.id}>
                  <span className="ledger-line__who">
                    {booking.service_name} · {booking.client_name}
                  </span>
                  <span>{formatGHS(booking.price)}</span>
                </div>
              ))}
            </div>
          ))
        )}
      </section>
    </>
  );
}
