import type { ReactNode } from "react";
import { LockIcon } from "./icons";

export interface MoMoButtonProps {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
}

/**
 * The single most-pressed element in the product. Full-width, gold.200 on
 * gold.900, lock icon, min-height 48px.
 */
export function MoMoButton({ children, onClick, disabled = false, type = "button" }: MoMoButtonProps) {
  return (
    <button type={type} className="krado-momo" onClick={onClick} disabled={disabled}>
      <LockIcon size={18} />
      <span>{children}</span>
    </button>
  );
}
