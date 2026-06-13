/**
 * Money is integer pesewas everywhere. 4000 = GHS 40.00.
 * Format only at the edge with formatGHS(). No floats in storage or APIs.
 */

export function formatGHS(pesewas: number): string {
  if (!Number.isInteger(pesewas)) {
    throw new Error(`formatGHS expects integer pesewas, got ${pesewas}`);
  }
  const cedis = Math.trunc(Math.abs(pesewas) / 100);
  const rem = Math.abs(pesewas) % 100;
  const sign = pesewas < 0 ? "-" : "";
  const grouped = cedis.toLocaleString("en-GH");
  return `${sign}GHS ${grouped}.${String(rem).padStart(2, "0")}`;
}

/**
 * Deposit = pct% of price, clamped up to the artisan's floor,
 * but never more than the price itself.
 */
export function depositFor(pricePesewas: number, pct: number, floorPesewas: number): number {
  if (!Number.isInteger(pricePesewas) || !Number.isInteger(floorPesewas)) {
    throw new Error("depositFor expects integer pesewas");
  }
  const raw = Math.round((pricePesewas * pct) / 100);
  return Math.min(Math.max(raw, floorPesewas), pricePesewas);
}

/**
 * The Krado per-booking fee is absorbed into the deposit: the client pays the
 * same deposit, the fee is Krado's margin, the rest is the artisan's net. The
 * fee never exceeds the deposit. feePesewas of 0 = off (no fee). See
 * docs/MONETIZATION.md.
 */
export function splitDeposit(
  depositPesewas: number,
  feePesewas: number,
): { krado_fee: number; artisan_net: number } {
  if (!Number.isInteger(depositPesewas) || !Number.isInteger(feePesewas)) {
    throw new Error("splitDeposit expects integer pesewas");
  }
  const fee = Math.min(Math.max(feePesewas, 0), depositPesewas);
  return { krado_fee: fee, artisan_net: depositPesewas - fee };
}
