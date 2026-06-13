export interface SlotPillProps {
  /** Rendered local time label, e.g. "2:30 pm". */
  label: string;
  selected?: boolean;
  disabled?: boolean;
  onSelect?: () => void;
}

export function SlotPill({ label, selected = false, disabled = false, onSelect }: SlotPillProps) {
  return (
    <button
      type="button"
      className={`krado-slotpill${selected ? " krado-slotpill--selected" : ""}`}
      aria-pressed={selected}
      disabled={disabled}
      onClick={onSelect}
    >
      {label}
    </button>
  );
}
