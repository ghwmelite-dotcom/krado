import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { minutesToLabel, t, type Hours, type Lang } from "@krado/shared";
import { KenteStrip, MoMoButton, Stepper } from "@krado/ui";
import { api, setToken } from "../api";
import { useLang } from "../lang";
import type { OnboardResult } from "../types";

/**
 * The 2-minute onboarding. Product invariant (CLAUDE.md): exactly 3 steps,
 * and exactly 7 required fields across the whole flow —
 * name · shop_name · area · phone · momo_number · services · hours.
 * Each required field carries data-field-required; tests count them.
 */

type DayKey = keyof Hours;

const DAYS: ReadonlyArray<{ key: DayKey; labelKey: "day_mon" | "day_tue" | "day_wed" | "day_thu" | "day_fri" | "day_sat" | "day_sun" }> = [
  { key: "mon", labelKey: "day_mon" },
  { key: "tue", labelKey: "day_tue" },
  { key: "wed", labelKey: "day_wed" },
  { key: "thu", labelKey: "day_thu" },
  { key: "fri", labelKey: "day_fri" },
  { key: "sat", labelKey: "day_sat" },
  { key: "sun", labelKey: "day_sun" },
];

/** 30-minute grid options, 6:00 am – 10:00 pm. */
const TIME_OPTIONS: number[] = [];
for (let m = 6 * 60; m <= 22 * 60; m += 30) TIME_OPTIONS.push(m);

interface ServiceRow {
  name: string;
  priceGhs: string;
  durationMin: string;
}

const DEFAULT_HOURS: Hours = {
  mon: [540, 1140],
  tue: [540, 1140],
  wed: [540, 1140],
  thu: [540, 1140],
  fri: [540, 1140],
  sat: [540, 1140],
  sun: null,
};

export interface OnboardingProps {
  /** Test hook: start the wizard on a given step. */
  initialStep?: number;
}

export function Onboarding({ initialStep = 0 }: OnboardingProps) {
  const { lang } = useLang();
  const navigate = useNavigate();
  const [step, setStep] = useState(initialStep);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<OnboardResult | null>(null);
  const [copied, setCopied] = useState(false);

  const [you, setYou] = useState({ name: "", shop_name: "", area: "", phone: "", momo_number: "" });
  const [services, setServices] = useState<ServiceRow[]>([
    { name: "", priceGhs: "", durationMin: "30" },
    { name: "", priceGhs: "", durationMin: "30" },
  ]);
  const [hours, setHours] = useState<Hours>(DEFAULT_HOURS);

  const steps = [t(lang, "onboard_step_you"), t(lang, "onboard_step_services"), t(lang, "onboard_step_hours")];

  function setYouField(field: keyof typeof you, value: string) {
    setYou((prev) => ({ ...prev, [field]: value }));
  }

  function setServiceField(index: number, field: keyof ServiceRow, value: string) {
    setServices((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  }

  function setDay(day: DayKey, value: Hours[DayKey]) {
    setHours((prev) => ({ ...prev, [day]: value }));
  }

  function nextStep(e: FormEvent) {
    e.preventDefault();
    setStep((s) => Math.min(2, s + 1));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const payload = {
        ...you,
        services: services.map((row) => ({
          name: row.name.trim(),
          // GHS at the edge → integer pesewas immediately.
          price: Math.round(Number.parseFloat(row.priceGhs || "0") * 100),
          duration_min: Number.parseInt(row.durationMin, 10) || 30,
        })),
        hours,
        language: lang as Lang,
      };
      const res = await api.onboard(payload);
      setToken(res.token);
      setResult(res);
    } catch {
      setError(t(lang, "error_generic"));
    } finally {
      setBusy(false);
    }
  }

  async function copyShare() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.share_message);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable — the text stays visible to copy by hand
    }
  }

  if (result) {
    return (
      <div className="app-shell">
        <KenteStrip />
        <div className="auth-screen">
          <h1>{t(lang, "onboard_done")}</h1>
          <div className="share-box">
            <a className="share-box__link" href={result.link}>
              {result.link}
            </a>
            <p>{result.share_message}</p>
            <button type="button" className="krado-btn krado-btn--outline" onClick={copyShare}>
              {copied ? t(lang, "copied") : t(lang, "copy_link")}
            </button>
          </div>
          <MoMoButton onClick={() => navigate("/", { replace: true })}>
            {t(lang, "go_to_dashboard")}
          </MoMoButton>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <KenteStrip />
      <div className="auth-screen">
        <h1>{t(lang, "onboard_title")}</h1>
        <Stepper steps={steps} current={step} />

        {step === 0 && (
          <form className="onboard-step" onSubmit={nextStep}>
            <label className="field">
              <span className="field__label">{t(lang, "field_name")}</span>
              <input
                type="text"
                value={you.name}
                onChange={(e) => setYouField("name", e.target.value)}
                required
                data-field-required="name"
                autoComplete="name"
              />
            </label>
            <label className="field">
              <span className="field__label">{t(lang, "field_shop_name")}</span>
              <input
                type="text"
                value={you.shop_name}
                onChange={(e) => setYouField("shop_name", e.target.value)}
                required
                data-field-required="shop_name"
              />
            </label>
            <label className="field">
              <span className="field__label">{t(lang, "field_area")}</span>
              <input
                type="text"
                value={you.area}
                onChange={(e) => setYouField("area", e.target.value)}
                required
                data-field-required="area"
                placeholder="Osu, Accra"
              />
            </label>
            <label className="field">
              <span className="field__label">{t(lang, "field_phone")}</span>
              <input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={you.phone}
                onChange={(e) => setYouField("phone", e.target.value)}
                required
                data-field-required="phone"
                placeholder="024 123 4567"
              />
            </label>
            <label className="field">
              <span className="field__label">{t(lang, "field_momo")}</span>
              <input
                type="tel"
                inputMode="tel"
                value={you.momo_number}
                onChange={(e) => setYouField("momo_number", e.target.value)}
                required
                data-field-required="momo_number"
                placeholder="024 123 4567"
              />
            </label>
            <MoMoButton type="submit">{t(lang, "next")}</MoMoButton>
          </form>
        )}

        {step === 1 && (
          <form className="onboard-step" onSubmit={nextStep}>
            <fieldset className="onboard-step" data-field-required="services" style={{ border: 0, margin: 0, padding: 0 }}>
              <legend className="section-title">{t(lang, "onboard_step_services")}</legend>
              {services.map((row, i) => (
                <div className="service-row" key={i}>
                  <label className="field">
                    <span className="field__label">{t(lang, "service_name")}</span>
                    <input
                      type="text"
                      value={row.name}
                      onChange={(e) => setServiceField(i, "name", e.target.value)}
                      required
                    />
                  </label>
                  <label className="field">
                    <span className="field__label">{t(lang, "service_price")}</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      min={1}
                      step="0.01"
                      value={row.priceGhs}
                      onChange={(e) => setServiceField(i, "priceGhs", e.target.value)}
                      required
                    />
                  </label>
                  <label className="field">
                    <span className="field__label">{t(lang, "service_duration")}</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={10}
                      max={480}
                      step={5}
                      value={row.durationMin}
                      onChange={(e) => setServiceField(i, "durationMin", e.target.value)}
                      required
                    />
                  </label>
                  {services.length > 2 ? (
                    <button
                      type="button"
                      className="krado-btn krado-btn--ghost"
                      onClick={() => setServices((prev) => prev.filter((_, j) => j !== i))}
                    >
                      {t(lang, "remove_service")}
                    </button>
                  ) : (
                    <span />
                  )}
                </div>
              ))}
              {services.length < 12 && (
                <button
                  type="button"
                  className="krado-btn krado-btn--outline"
                  onClick={() =>
                    setServices((prev) => [...prev, { name: "", priceGhs: "", durationMin: "30" }])
                  }
                >
                  {t(lang, "add_service")}
                </button>
              )}
            </fieldset>
            <div className="form-actions">
              <button type="button" className="krado-btn krado-btn--ghost" onClick={() => setStep(0)}>
                {t(lang, "back")}
              </button>
              <MoMoButton type="submit">{t(lang, "next")}</MoMoButton>
            </div>
          </form>
        )}

        {step === 2 && (
          <form className="onboard-step" onSubmit={submit}>
            <fieldset className="onboard-step" data-field-required="hours" style={{ border: 0, margin: 0, padding: 0 }}>
              <legend className="section-title">{t(lang, "onboard_step_hours")}</legend>
              {DAYS.map(({ key, labelKey }) => {
                const day = hours[key];
                return (
                  <div className="hours-row" key={key}>
                    <span className="hours-row__day">{t(lang, labelKey)}</span>
                    <label className="field field--inline">
                      <input
                        type="checkbox"
                        checked={day === null}
                        onChange={(e) => setDay(key, e.target.checked ? null : [540, 1140])}
                      />
                      <span className="field__label">{t(lang, "hours_closed")}</span>
                    </label>
                    {day !== null ? (
                      <>
                        <label className="field">
                          <span className="field__label">{t(lang, "hours_open_at")}</span>
                          <select
                            value={day[0]}
                            onChange={(e) => setDay(key, [Number(e.target.value), day[1]])}
                          >
                            {TIME_OPTIONS.map((m) => (
                              <option key={m} value={m}>
                                {minutesToLabel(m)}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="field">
                          <span className="field__label">{t(lang, "hours_close_at")}</span>
                          <select
                            value={day[1]}
                            onChange={(e) => setDay(key, [day[0], Number(e.target.value)])}
                          >
                            {TIME_OPTIONS.filter((m) => m > day[0]).map((m) => (
                              <option key={m} value={m}>
                                {minutesToLabel(m)}
                              </option>
                            ))}
                          </select>
                        </label>
                      </>
                    ) : (
                      <>
                        <span />
                        <span />
                      </>
                    )}
                  </div>
                );
              })}
            </fieldset>
            {error && <p className="form-error">{error}</p>}
            <div className="form-actions">
              <button type="button" className="krado-btn krado-btn--ghost" onClick={() => setStep(1)}>
                {t(lang, "back")}
              </button>
              <MoMoButton type="submit" disabled={busy}>
                {t(lang, "finish_setup")}
              </MoMoButton>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
