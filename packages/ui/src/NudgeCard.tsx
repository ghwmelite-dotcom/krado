import { t, type Lang } from "@krado/shared";

export interface NudgeCardProps {
  /** The insight line, e.g. "Yaw is usually back every 14 days". */
  insight: string;
  actionLabel: string;
  onAction: () => void;
  onLater: () => void;
  lang?: Lang;
}

/**
 * Violet means intelligence: the app noticed something. The "Later" dismiss
 * is non-negotiable — a suggestion the artisan can't wave away is a demand.
 * Never render more than one NudgeCard at a time (caller's contract).
 */
export function NudgeCard({ insight, actionLabel, onAction, onLater, lang = "en" }: NudgeCardProps) {
  return (
    <section className="krado-nudge">
      <p className="krado-nudge__insight">{insight}</p>
      <div className="krado-nudge__actions">
        <button type="button" className="krado-btn krado-btn--violet" onClick={onAction}>
          {actionLabel}
        </button>
        <button type="button" className="krado-btn krado-btn--ghost" onClick={onLater}>
          {t(lang, "nudge_later")}
        </button>
      </div>
    </section>
  );
}
