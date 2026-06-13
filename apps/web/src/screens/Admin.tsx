import { useCallback, useEffect, useState, type FormEvent } from "react";
import { formatGHS } from "@krado/shared";
import { KenteStrip } from "@krado/ui";
import { adminApi, getAdminToken, setAdminToken, clearAdminToken, ApiError } from "../api";
import type { AdminArtisan, AdminOverview, LookupResult, ReconRow } from "../types";

/** Pilot ops console — operator-only, separate passcode auth. */
export function Admin() {
  const [authed, setAuthed] = useState(() => !!getAdminToken());
  if (!authed) return <AdminLogin onIn={() => setAuthed(true)} />;
  return <AdminConsole onOut={() => setAuthed(false)} />;
}

function AdminLogin({ onIn }: { onIn: () => void }) {
  const [passcode, setPasscode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { token } = await adminApi.login(passcode);
      setAdminToken(token);
      onIn();
    } catch {
      setError("Wrong passcode.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="app-shell">
      <KenteStrip />
      <div className="auth-screen">
        <h1 style={{ fontFamily: "var(--krado-font-display)", fontSize: 26 }}>Krado ops</h1>
        <form onSubmit={submit} className="auth-card">
          <label className="field">
            <span className="field__label">Operator passcode</span>
            <input
              type="password"
              autoComplete="current-password"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              required
            />
          </label>
          <button type="submit" className="krado-btn krado-btn--forest" disabled={busy || !passcode}>
            {busy ? "…" : "Enter"}
          </button>
        </form>
        {error && <p className="form-error">{error}</p>}
      </div>
    </div>
  );
}

function AdminConsole({ onOut }: { onOut: () => void }) {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [artisans, setArtisans] = useState<AdminArtisan[]>([]);
  const [recon, setRecon] = useState<ReconRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [o, a, r] = await Promise.all([adminApi.overview(), adminApi.artisans(), adminApi.recon()]);
      setOverview(o);
      setArtisans(a.artisans);
      setRecon(r.recon);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        clearAdminToken();
        onOut();
        return;
      }
      setError("Could not load. Try again.");
    }
  }, [onOut]);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggleStatus(a: AdminArtisan) {
    const next = a.status === "active" ? "paused" : "active";
    await adminApi.setArtisanStatus(a.id, next).catch(() => {});
    void load();
  }

  async function resolve(id: string) {
    await adminApi.resolveRecon(id).catch(() => {});
    void load();
  }

  function signOut() {
    clearAdminToken();
    onOut();
  }

  return (
    <div className="app-shell admin">
      <KenteStrip />
      <main className="app-shell__main">
        <header className="screen-head">
          <h1 className="screen-head__greeting">Krado ops</h1>
          <button type="button" className="krado-btn krado-btn--outline" onClick={signOut}>
            Sign out
          </button>
        </header>

        {error && <p className="banner banner--offline">{error}</p>}

        {overview && (
          <>
            <div className="admin-metrics">
              <Metric label="Active shops (wk)" value={`${overview.artisans_active_week}/${overview.artisans_total}`} />
              <Metric label="No-show rate" value={`${overview.no_show_rate}%`} tone={overview.no_show_rate > 10 ? "warn" : "ok"} />
              <Metric label="GMV (completed)" value={formatGHS(overview.gmv_completed)} />
              <Metric label="Krado fees" value={formatGHS(overview.krado_fees_accrued)} />
              <Metric label="Via nudges" value={String(overview.bookings_via_nudge)} />
              <Metric label="Bookings" value={String(overview.bookings_total)} />
            </div>
            {(overview.pending_recon > 0 || overview.pending_claims > 0) && (
              <p className="admin-flags">
                {overview.pending_recon} payment{overview.pending_recon === 1 ? "" : "s"} to reconcile ·{" "}
                {overview.pending_claims} manual claim{overview.pending_claims === 1 ? "" : "s"} pending
              </p>
            )}
          </>
        )}

        <Lookup />

        <section>
          <h2 className="section-title">Reconciliation queue</h2>
          {recon.length === 0 ? (
            <p className="empty-note">Nothing to reconcile.</p>
          ) : (
            <div className="admin-list">
              {recon.map((r) => (
                <div key={r.id} className="admin-row">
                  <div>
                    <strong className="num">{formatGHS(r.amount)}</strong> · {r.reason}
                    <div className="admin-row__sub num">
                      {r.reference} · {r.phone ?? "unknown payer"}
                    </div>
                  </div>
                  <button type="button" className="krado-btn krado-btn--forest" onClick={() => void resolve(r.id)}>
                    Resolve
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="section-title">Artisans</h2>
          <div className="admin-list">
            {artisans.map((a) => (
              <div key={a.id} className="admin-row">
                <div>
                  <strong>{a.shop_name}</strong>
                  {a.status === "paused" && <span className="admin-paused">paused</span>}
                  <div className="admin-row__sub num">
                    /{a.handle} · {a.area} · {a.week_bookings} this wk · {formatGHS(a.week_gmv)}
                    {a.telegram_linked ? " · TG" : ""}
                  </div>
                </div>
                <button type="button" className="krado-btn krado-btn--outline" onClick={() => void toggleStatus(a)}>
                  {a.status === "active" ? "Pause" : "Activate"}
                </button>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: "ok" | "warn" }) {
  return (
    <div className={`admin-metric${tone === "warn" ? " admin-metric--warn" : ""}`}>
      <span className="admin-metric__label">{label}</span>
      <span className="admin-metric__value num">{value}</span>
    </div>
  );
}

function Lookup() {
  const [q, setQ] = useState("");
  const [res, setRes] = useState<LookupResult | null>(null);
  const [busy, setBusy] = useState(false);

  async function search(e: FormEvent) {
    e.preventDefault();
    if (q.trim().length < 3) return;
    setBusy(true);
    try {
      setRes(await adminApi.lookup(q.trim()));
    } catch {
      setRes(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <h2 className="section-title">Lookup</h2>
      <form onSubmit={search} className="admin-search">
        <input
          type="search"
          placeholder="phone, handle, or payment reference"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button type="submit" className="krado-btn krado-btn--forest" disabled={busy || q.trim().length < 3}>
          Find
        </button>
      </form>
      {res && (
        <div className="admin-lookup">
          {res.artisans.map((a) => (
            <div key={a.id} className="admin-row__sub">
              Shop: <strong>{a.shop_name}</strong> /{a.handle} · {a.phone} · {a.status}
            </div>
          ))}
          {res.clients.map((c) => (
            <div key={c.id} className="admin-row__sub num">
              Client: {c.name ?? "—"} · {c.phone}
            </div>
          ))}
          {res.payments.map((p) => (
            <div key={p.id} className="admin-row__sub num">
              Payment: {p.reference} · {p.kind} · {formatGHS(p.amount)} · {p.status}
            </div>
          ))}
          {res.bookings.map((b) => (
            <div key={b.id} className="admin-row__sub num">
              Booking: {b.service_name} · {formatGHS(b.price)} · {b.status} · {b.starts_at.slice(0, 16).replace("T", " ")}
            </div>
          ))}
          {res.artisans.length + res.clients.length + res.payments.length + res.bookings.length === 0 && (
            <p className="empty-note">No matches.</p>
          )}
        </div>
      )}
    </section>
  );
}
