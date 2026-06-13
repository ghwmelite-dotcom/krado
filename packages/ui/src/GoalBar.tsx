import { formatGHS, t, type Lang } from "@krado/shared";

export interface GoalBarProps {
  label: string;
  /** Integer pesewas earned so far today. */
  earned: number;
  /** Integer pesewas daily goal. */
  goal: number;
  lang?: Lang;
}

/**
 * Today's goal: label + % + "GHS x of y". The fill animates 300ms ease-out
 * on data change (CSS transition; disabled under prefers-reduced-motion)
 * and visually caps at 100% — the % readout caps too. Numbers do the
 * talking; no celebration copy.
 */
/** "GHS 145 of 200" — one GHS prefix, decimals only when they matter. */
function goalAmount(pesewas: number, stripPrefix: boolean): string {
  const formatted = formatGHS(pesewas).replace(/\.00$/, "");
  return stripPrefix ? formatted.replace(/^GHS /, "") : formatted;
}

export function GoalBar({ label, earned, goal, lang = "en" }: GoalBarProps) {
  const pct = goal > 0 ? Math.min(100, Math.round((earned / goal) * 100)) : 0;
  return (
    <div className={`krado-goalbar${pct >= 100 ? " krado-goalbar--done" : ""}`}>
      <div className="krado-goalbar__head">
        <span className="krado-goalbar__label">{label}</span>
        <span className="krado-goalbar__pct" data-money>
          {pct}%
        </span>
      </div>
      <div
        className="krado-goalbar__track"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
      >
        <div className="krado-goalbar__fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="krado-goalbar__amounts" data-money>
        {t(lang, "goal_of", { earned: goalAmount(earned, false), goal: goalAmount(goal, true) })}
      </div>
    </div>
  );
}
