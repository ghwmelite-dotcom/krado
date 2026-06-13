import type { ReactNode } from "react";
import { formatGHS } from "@krado/shared";

export interface SusuTileProps {
  label: string;
  /** Integer pesewas. */
  amountPesewas: number;
  sublabel?: string;
}

/** Forest-tinted money tile for the susu set-aside, with a woven gold band. */
export function SusuTile({ label, amountPesewas, sublabel }: SusuTileProps) {
  return (
    <section className="krado-tile krado-tile--susu">
      <span className="krado-tile__label">{label}</span>
      <span className="krado-tile__value" data-money>
        {formatGHS(amountPesewas)}
      </span>
      {sublabel && <span className="krado-tile__sub">{sublabel}</span>}
    </section>
  );
}

export interface MetricTileProps {
  label: string;
  /** Pre-formatted value — format money with formatGHS at the call site. */
  value: string;
  sublabel?: string;
  /** Optional flat SVG icon rendered in a tinted chip. */
  icon?: ReactNode;
  /** Chip tint when an icon is present. */
  tone?: "gold" | "forest";
}

export function MetricTile({ label, value, sublabel, icon, tone = "gold" }: MetricTileProps) {
  return (
    <section className="krado-tile">
      {icon && <span className={`krado-tile__icon krado-tile__icon--${tone}`}>{icon}</span>}
      <span className="krado-tile__label">{label}</span>
      <span className="krado-tile__value" data-money>
        {value}
      </span>
      {sublabel && <span className="krado-tile__sub">{sublabel}</span>}
    </section>
  );
}
