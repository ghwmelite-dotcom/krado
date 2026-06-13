import { formatGHS } from "@krado/shared";

export interface SusuTileProps {
  label: string;
  /** Integer pesewas. */
  amountPesewas: number;
  sublabel?: string;
}

/** Forest-tinted money tile for the susu set-aside. */
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
}

export function MetricTile({ label, value, sublabel }: MetricTileProps) {
  return (
    <section className="krado-tile">
      <span className="krado-tile__label">{label}</span>
      <span className="krado-tile__value" data-money>
        {value}
      </span>
      {sublabel && <span className="krado-tile__sub">{sublabel}</span>}
    </section>
  );
}
