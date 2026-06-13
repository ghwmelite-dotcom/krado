import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { t } from "@krado/shared";
import { StyleCard } from "@krado/ui";
import { api } from "../api";
import { useLang } from "../lang";
import type { Service } from "../types";

interface FormState {
  name: string;
  priceGhs: string;
  durationMin: string;
}

const EMPTY_FORM: FormState = { name: "", priceGhs: "", durationMin: "30" };

export function Styles() {
  const { lang } = useLang();
  const [services, setServices] = useState<Service[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try {
      const { services: rows } = await api.services();
      setServices(rows.filter((s) => s.active !== 0));
    } catch {
      setError(t(lang, "error_generic"));
    }
  }, [lang]);

  useEffect(() => {
    void load();
  }, [load]);

  const selected = services?.find((s) => s.id === selectedId) ?? null;

  function select(service: Service) {
    if (selectedId === service.id) {
      setSelectedId(null);
      setForm(EMPTY_FORM);
      return;
    }
    setSelectedId(service.id);
    setForm({
      name: service.name,
      priceGhs: (service.price / 100).toFixed(2),
      durationMin: String(service.duration_min),
    });
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const input = {
      name: form.name.trim(),
      // GHS at the edge → integer pesewas immediately.
      price: Math.round(Number.parseFloat(form.priceGhs || "0") * 100),
      duration_min: Number.parseInt(form.durationMin, 10) || 30,
    };
    try {
      if (selected) {
        await api.updateService(selected.id, input);
      } else {
        await api.createService(input);
        setForm(EMPTY_FORM);
      }
      await load();
    } catch {
      setError(t(lang, "error_generic"));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      await api.deleteService(selected.id);
      setSelectedId(null);
      setForm(EMPTY_FORM);
      await load();
    } catch {
      setError(t(lang, "error_generic"));
    } finally {
      setBusy(false);
    }
  }

  async function uploadPhoto(file: File) {
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      await api.uploadServicePhoto(selected.id, file);
      await load();
    } catch {
      setError(t(lang, "error_generic"));
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  if (!services) {
    return <p className="loading">{t(lang, "loading")}</p>;
  }

  return (
    <>
      <header className="screen-head">
        <h1 className="screen-head__greeting">{t(lang, "styles_title")}</h1>
      </header>

      {services.length === 0 ? (
        <p className="empty-note">{t(lang, "no_styles")}</p>
      ) : (
        <div className="styles-grid">
          {services.map((service) => (
            <StyleCard
              key={service.id}
              lang={lang}
              name={service.name}
              durationMin={service.duration_min}
              pricePesewas={service.price}
              photoUrl={service.photo_key ? `/media/${service.photo_key}` : null}
              selected={selectedId === service.id}
              onSelect={() => select(service)}
            />
          ))}
        </div>
      )}

      <form className="card" onSubmit={submit}>
        <h2 className="section-title">{selected ? t(lang, "edit") : t(lang, "add_style")}</h2>
        <label className="field">
          <span className="field__label">{t(lang, "service_name")}</span>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
          />
        </label>
        <div className="form-row">
          <label className="field">
            <span className="field__label">{t(lang, "service_price")}</span>
            <input
              type="number"
              inputMode="decimal"
              min={1}
              step="0.01"
              value={form.priceGhs}
              onChange={(e) => setForm((f) => ({ ...f, priceGhs: e.target.value }))}
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
              value={form.durationMin}
              onChange={(e) => setForm((f) => ({ ...f, durationMin: e.target.value }))}
              required
            />
          </label>
        </div>

        {selected && (
          <label className="field">
            <span className="field__label">{t(lang, "upload_photo")}</span>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void uploadPhoto(file);
              }}
            />
          </label>
        )}

        {error && <p className="form-error">{error}</p>}

        <div className="form-actions">
          {selected && (
            <button type="button" className="krado-btn krado-btn--clay" onClick={() => void remove()} disabled={busy}>
              {t(lang, "delete")}
            </button>
          )}
          <button type="submit" className="krado-btn krado-btn--forest" disabled={busy}>
            {t(lang, "save")}
          </button>
        </div>
      </form>
    </>
  );
}
