import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { t } from "@krado/shared";
import { KenteStrip, MoMoButton } from "@krado/ui";
import { api, setToken } from "../api";
import { useLang } from "../lang";

export function Login() {
  const { lang, setLang } = useLang();
  const navigate = useNavigate();
  const [phase, setPhase] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendCode(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.requestOtp(phone);
      setPhase("code");
    } catch {
      setError(t(lang, "error_generic"));
    } finally {
      setBusy(false);
    }
  }

  async function verify(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { token } = await api.verifyOtp(phone, code);
      setToken(token);
      // Pick up the artisan's saved language so the dashboard greets right.
      try {
        const { artisan } = await api.me();
        if (artisan.language) setLang(artisan.language);
      } catch {
        // non-fatal
      }
      navigate("/", { replace: true });
    } catch {
      setError(t(lang, "login_invalid_code"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="app-shell">
      <KenteStrip />
      <div className="auth-screen">
        <div className="auth-brand" aria-hidden="true">
          <span className="auth-brand__blocks">
            <i />
            <i />
            <i />
          </span>
          <span className="auth-brand__mark">
            Krado<span className="auth-brand__dot">.</span>
          </span>
          <span className="auth-brand__tag">Lock your slot.</span>
        </div>
        <h1>{t(lang, "login_title")}</h1>

        {phase === "phone" ? (
          <form onSubmit={sendCode} className="onboard-step auth-card">
            <label className="field">
              <span className="field__label">{t(lang, "login_phone_label")}</span>
              <input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="024 123 4567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </label>
            <MoMoButton type="submit" disabled={busy || phone.trim().length < 9}>
              {t(lang, "login_send_code")}
            </MoMoButton>
          </form>
        ) : (
          <form onSubmit={verify} className="onboard-step auth-card">
            <p className="auth-card__note">{t(lang, "login_code_sent")}</p>
            <label className="field">
              <span className="field__label">{t(lang, "login_code_label")}</span>
              <input
                className="code-input"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="\d{6}"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                required
              />
            </label>
            <MoMoButton type="submit" disabled={busy || code.length !== 6}>
              {t(lang, "login_verify")}
            </MoMoButton>
          </form>
        )}

        {error && <p className="form-error">{error}</p>}

        <Link to="/onboarding" className="auth-alt">
          {t(lang, "login_new_shop")}
        </Link>
      </div>
    </div>
  );
}
