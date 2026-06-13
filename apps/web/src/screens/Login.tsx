import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { t } from "@krado/shared";
import { KenteStrip, MoMoButton } from "@krado/ui";
import { api, setToken } from "../api";
import { useLang } from "../lang";

export function Login() {
  const { lang, setLang } = useLang();
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { token } = await api.login(phone, pin);
      setToken(token);
      try {
        const { artisan } = await api.me();
        if (artisan.language) setLang(artisan.language);
      } catch {
        // non-fatal
      }
      navigate("/", { replace: true });
    } catch {
      setError(t(lang, "login_wrong_pin"));
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

        <form onSubmit={submit} className="onboard-step auth-card">
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
          <label className="field">
            <span className="field__label">{t(lang, "login_pin_label")}</span>
            <input
              className="code-input"
              type="password"
              inputMode="numeric"
              autoComplete="current-password"
              pattern="\d{4}"
              maxLength={4}
              placeholder="••••"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              required
            />
          </label>
          <MoMoButton type="submit" disabled={busy || phone.trim().length < 9 || pin.length !== 4}>
            {t(lang, "login_verify")}
          </MoMoButton>
        </form>

        {error && <p className="form-error">{error}</p>}

        <Link to="/onboarding" className="auth-alt">
          {t(lang, "login_new_shop")}
        </Link>
      </div>
    </div>
  );
}
