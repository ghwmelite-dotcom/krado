import type { ReactElement } from "react";
import { t, type Lang, type MessageKey } from "@krado/shared";
import { CalendarIcon, CoinsIcon, HomeIcon, ScissorsIcon, type IconProps } from "./icons";

export type NavKey = "home" | "bookings" | "money" | "styles";

const ITEMS: ReadonlyArray<{
  key: NavKey;
  labelKey: MessageKey;
  Icon: (props: IconProps) => ReactElement;
}> = [
  { key: "home", labelKey: "nav_home", Icon: HomeIcon },
  { key: "bookings", labelKey: "nav_bookings", Icon: CalendarIcon },
  { key: "money", labelKey: "nav_money", Icon: CoinsIcon },
  { key: "styles", labelKey: "nav_styles", Icon: ScissorsIcon },
];

export interface BottomNavProps {
  lang?: Lang;
  active?: NavKey;
  onNavigate: (key: NavKey) => void;
}

export function BottomNav({ lang = "en", active, onNavigate }: BottomNavProps) {
  return (
    <nav className="krado-bottomnav">
      {ITEMS.map(({ key, labelKey, Icon }) => (
        <button
          key={key}
          type="button"
          className={`krado-bottomnav__item${active === key ? " krado-bottomnav__item--active" : ""}`}
          aria-current={active === key ? "page" : undefined}
          onClick={() => onNavigate(key)}
        >
          <Icon size={19} />
          <span className="krado-bottomnav__label">{t(lang, labelKey)}</span>
        </button>
      ))}
    </nav>
  );
}
