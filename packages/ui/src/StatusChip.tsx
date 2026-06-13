import { useEffect, useState } from "react";
import { t, type BookingStatus, type Lang } from "@krado/shared";

/** `held` lives only in KV server-side, but the UI still shows it on holds. */
export type ChipStatus = BookingStatus | "held";

export interface StatusChipProps {
  status: ChipStatus;
  lang?: Lang;
  /** Hold expiry (ISO string or epoch ms) — drives the live "Hold {m}m" countdown. */
  holdExpiresAt?: string | number;
}

function minutesLeft(expiresAt: string | number): number {
  const ts = typeof expiresAt === "number" ? expiresAt : Date.parse(expiresAt);
  return Math.max(0, Math.ceil((ts - Date.now()) / 60_000));
}

export function StatusChip({ status, lang = "en", holdExpiresAt }: StatusChipProps) {
  const [minutes, setMinutes] = useState(() =>
    holdExpiresAt !== undefined ? minutesLeft(holdExpiresAt) : 0,
  );

  useEffect(() => {
    if (status !== "held" || holdExpiresAt === undefined) return;
    setMinutes(minutesLeft(holdExpiresAt));
    const id = window.setInterval(() => setMinutes(minutesLeft(holdExpiresAt)), 15_000);
    return () => window.clearInterval(id);
  }, [status, holdExpiresAt]);

  const variant =
    status === "cancelled_by_client" || status === "cancelled_by_artisan" ? "cancelled" : status;

  const label =
    status === "held"
      ? t(lang, "status_hold", { minutes })
      : status === "locked"
        ? t(lang, "status_locked")
        : status === "completed"
          ? t(lang, "status_completed")
          : status === "no_show"
            ? t(lang, "status_no_show")
            : t(lang, "status_cancelled");

  return <span className={`krado-chip krado-chip--${variant}`}>{label}</span>;
}
