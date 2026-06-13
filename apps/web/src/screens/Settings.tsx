import { useEffect, useState, type FormEvent } from "react";
import { t, type Lang } from "@krado/shared";
import { api } from "../api";
import { useLang } from "../lang";

function TelegramIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M21.9 4.3 18.7 19.4c-.2 1-.9 1.3-1.7.8l-4.6-3.4-2.2 2.1c-.3.3-.5.5-.9.5l.3-4.6 8.4-7.6c.4-.3-.1-.5-.6-.2l-10.4 6.5-4.5-1.4c-1-.3-1-1 .2-1.4l17.6-6.8c.8-.3 1.5.2 1.3 1.3z" />
    </svg>
  );
}

interface SettingsForm {
  dailyGoalGhs: string;
  depositPct: string;
  depositFloorGhs: string;
  susuMode: "flat" | "pct" | "off";
  susuValue: string; // GHS when flat, percent when pct
  acceptManual: boolean;
  bankDetails: string;
  language: Lang;
}

export function Settings() {
  const { lang, setLang } = useLang();
  const [form, setForm] = useState<SettingsForm | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tgLinked, setTgLinked] = useState(false);

  async function connectTelegram() {
    try {
      const { telegram_link } = await api.telegramLink();
      window.open(telegram_link, "_blank", "noopener");
    } catch {
      setError(t(lang, "error_generic"));
    }
  }

  useEffect(() => {
    let alive = true;
    void api
      .me()
      .then(({ artisan }) => {
        if (!alive) return;
        setForm({
          dailyGoalGhs: (artisan.daily_goal / 100).toFixed(2),
          depositPct: String(artisan.deposit_pct),
          depositFloorGhs: (artisan.deposit_floor / 100).toFixed(2),
          susuMode: artisan.susu_mode,
          susuValue:
            artisan.susu_mode === "flat"
              ? (artisan.susu_value / 100).toFixed(2)
              : String(artisan.susu_value),
          acceptManual: Boolean(artisan.accept_manual),
          bankDetails: artisan.bank_details ?? "",
          language: artisan.language,
        });
        setTgLinked(Boolean(artisan.telegram_chat_id));
      })
      .catch(() => setError(t(lang, "error_generic")));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function patch<K extends keyof SettingsForm>(key: K, value: SettingsForm[K]) {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
    setSaved(false);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    setBusy(true);
    setError(null);
    try {
      await api.patchArtisan({
        daily_goal: Math.round(Number.parseFloat(form.dailyGoalGhs || "0") * 100),
        deposit_pct: Number.parseInt(form.depositPct, 10),
        deposit_floor: Math.round(Number.parseFloat(form.depositFloorGhs || "0") * 100),
        susu_mode: form.susuMode,
        susu_value:
          form.susuMode === "flat"
            ? Math.round(Number.parseFloat(form.susuValue || "0") * 100)
            : Number.parseInt(form.susuValue || "0", 10),
        accept_manual: form.acceptManual,
        bank_details: form.bankDetails.trim() === "" ? null : form.bankDetails.trim(),
        language: form.language,
      });
      setLang(form.language);
      setSaved(true);
    } catch {
      setError(t(lang, "error_generic"));
    } finally {
      setBusy(false);
    }
  }

  if (!form) {
    return <p className="loading">{error ?? t(lang, "loading")}</p>;
  }

  return (
    <>
      <header className="screen-head">
        <h1 className="screen-head__greeting">{t(lang, "settings")}</h1>
      </header>

      {tgLinked ? (
        <div className="tg-connect tg-connect--done">
          <TelegramIcon />
          <span>
            <b>{t(lang, "tg_connected")}</b>
          </span>
        </div>
      ) : (
        <button type="button" className="tg-connect" onClick={connectTelegram} style={{ border: 0, cursor: "pointer", textAlign: "left", font: "inherit" }}>
          <TelegramIcon />
          <span>
            <b>{t(lang, "tg_connect_title")}</b>
            <small>{t(lang, "tg_connect_artisan")}</small>
          </span>
        </button>
      )}

      <form className="card" onSubmit={submit}>
        <label className="field">
          <span className="field__label">{t(lang, "daily_goal_label")}</span>
          <input
            type="number"
            inputMode="decimal"
            min={1}
            step="0.01"
            value={form.dailyGoalGhs}
            onChange={(e) => patch("dailyGoalGhs", e.target.value)}
          />
        </label>

        <div className="form-row">
          <label className="field">
            <span className="field__label">{t(lang, "deposit_pct_label")}</span>
            <input
              type="number"
              inputMode="numeric"
              min={5}
              max={100}
              value={form.depositPct}
              onChange={(e) => patch("depositPct", e.target.value)}
            />
          </label>
          <label className="field">
            <span className="field__label">{t(lang, "deposit_floor_label")}</span>
            <input
              type="number"
              inputMode="decimal"
              min={5}
              step="0.01"
              value={form.depositFloorGhs}
              onChange={(e) => patch("depositFloorGhs", e.target.value)}
            />
          </label>
        </div>

        <label className="field">
          <span className="field__label">{t(lang, "susu_mode_label")}</span>
          <select
            value={form.susuMode}
            onChange={(e) => patch("susuMode", e.target.value as SettingsForm["susuMode"])}
          >
            <option value="off">{t(lang, "susu_mode_off")}</option>
            <option value="flat">{t(lang, "susu_mode_flat")}</option>
            <option value="pct">{t(lang, "susu_mode_pct")}</option>
          </select>
        </label>

        {form.susuMode !== "off" && (
          <label className="field">
            <span className="field__label">
              {form.susuMode === "flat"
                ? t(lang, "susu_value_label_flat")
                : t(lang, "susu_value_label_pct")}
            </span>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step={form.susuMode === "flat" ? "0.01" : "1"}
              value={form.susuValue}
              onChange={(e) => patch("susuValue", e.target.value)}
            />
          </label>
        )}

        <label className="field field--inline">
          <input
            type="checkbox"
            checked={form.acceptManual}
            onChange={(e) => patch("acceptManual", e.target.checked)}
          />
          <span className="field__label">{t(lang, "accept_manual_label")}</span>
        </label>

        {form.acceptManual && (
          <label className="field">
            <span className="field__label">{t(lang, "bank_details_label")}</span>
            <textarea
              value={form.bankDetails}
              maxLength={120}
              onChange={(e) => patch("bankDetails", e.target.value)}
            />
          </label>
        )}

        <label className="field">
          <span className="field__label">{t(lang, "language_label")}</span>
          <select value={form.language} onChange={(e) => patch("language", e.target.value as Lang)}>
            <option value="en">English</option>
            <option value="tw">Twi</option>
          </select>
        </label>

        {error && <p className="form-error">{error}</p>}
        {saved && <p className="form-ok">{t(lang, "saved")}</p>}

        <button type="submit" className="krado-btn krado-btn--forest" disabled={busy}>
          {t(lang, "save")}
        </button>
      </form>
    </>
  );
}
