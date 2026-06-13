import type { ReactNode } from "react";
import { formatGHS, type Lang } from "@krado/shared";
import { StatusChip, type ChipStatus } from "./StatusChip";

export interface TimelineItemProps {
  name: string;
  /** Already-rendered local time label, e.g. "2:30 pm". */
  timeLabel: string;
  serviceName: string;
  /** Integer pesewas. */
  pricePesewas: number;
  status: ChipStatus;
  lang?: Lang;
  holdExpiresAt?: string | number;
  /** True on the final item — hides the connector. */
  last?: boolean;
  /** Optional action row (e.g. mark done / no-show) rendered under the meta line. */
  actions?: ReactNode;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => (w[0] ?? "").toUpperCase())
    .join("");
}

export function TimelineItem({
  name,
  timeLabel,
  serviceName,
  pricePesewas,
  status,
  lang = "en",
  holdExpiresAt,
  last = false,
  actions,
}: TimelineItemProps) {
  const dot = status === "locked" ? "locked" : status === "held" ? "held" : "neutral";
  return (
    <li className="krado-timeline-item">
      <div className="krado-timeline-item__rail" aria-hidden="true">
        <span className={`krado-timeline-item__dot krado-timeline-item__dot--${dot}`} />
        {!last && <span className="krado-timeline-item__connector" />}
      </div>
      <span className="krado-avatar" aria-hidden="true">
        {initials(name)}
      </span>
      <div className="krado-timeline-item__body">
        <div className="krado-timeline-item__row1">
          <span>{name}</span>
          <span aria-hidden="true">·</span>
          <span data-money>{timeLabel}</span>
        </div>
        <div className="krado-timeline-item__row2" data-money>
          {serviceName} · {formatGHS(pricePesewas)}
        </div>
        {actions && <div className="krado-timeline-item__actions">{actions}</div>}
      </div>
      <StatusChip status={status} lang={lang} holdExpiresAt={holdExpiresAt} />
    </li>
  );
}
