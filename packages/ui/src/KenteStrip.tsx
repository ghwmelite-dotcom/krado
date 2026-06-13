/**
 * The brand signature: a flat band of woven color at the top of every
 * primary surface. Never gradiented, never animated, never carries text.
 * Ratios 2:1:2:1:2:1:2 — gold · black · green · red · gold · black · green.
 */

const BLOCKS: ReadonlyArray<readonly [number, string]> = [
  [2, "var(--krado-kente-gold)"],
  [1, "var(--krado-kente-black)"],
  [2, "var(--krado-kente-green)"],
  [1, "var(--krado-kente-red)"],
  [2, "var(--krado-kente-gold)"],
  [1, "var(--krado-kente-black)"],
  [2, "var(--krado-kente-green)"],
];

export interface KenteStripProps {
  /** 5px in-app, 8px on marketing surfaces. */
  height?: number;
}

export function KenteStrip({ height = 5 }: KenteStripProps) {
  return (
    <div className="krado-kente" style={{ height }} aria-hidden="true">
      {BLOCKS.map(([grow, color], i) => (
        <span key={i} className="krado-kente__block" style={{ flex: grow, background: color }} />
      ))}
    </div>
  );
}
