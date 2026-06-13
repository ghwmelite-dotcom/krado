import { formatGHS, t, type Lang } from "@krado/shared";
import { CheckIcon, ScissorsIcon } from "./icons";

export interface StyleCardProps {
  name: string;
  durationMin: number;
  /** Integer pesewas. */
  pricePesewas: number;
  /** Real portfolio photo — the portfolio IS the storefront. */
  photoUrl?: string | null;
  selected?: boolean;
  onSelect?: () => void;
  lang?: Lang;
}

export function StyleCard({
  name,
  durationMin,
  pricePesewas,
  photoUrl,
  selected = false,
  onSelect,
  lang = "en",
}: StyleCardProps) {
  return (
    <button
      type="button"
      className={`krado-stylecard${selected ? " krado-stylecard--selected" : ""}`}
      aria-pressed={selected}
      onClick={onSelect}
    >
      {photoUrl ? (
        <img className="krado-stylecard__photo" src={photoUrl} alt={name} loading="lazy" />
      ) : (
        <span className="krado-stylecard__placeholder" aria-hidden="true">
          <ScissorsIcon size={28} />
        </span>
      )}
      <span className="krado-stylecard__body">
        <span className="krado-stylecard__name">{name}</span>
        <span className="krado-stylecard__meta" data-money>
          {t(lang, "duration_price", { minutes: durationMin, price: formatGHS(pricePesewas) })}
        </span>
      </span>
      {selected && (
        <span className="krado-stylecard__check" aria-hidden="true">
          <CheckIcon size={14} />
        </span>
      )}
    </button>
  );
}
