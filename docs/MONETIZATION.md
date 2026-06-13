# MONETIZATION — Krado

> Thesis: **the booking tool is the wedge; the money is in the financial layer.**
> Krado's defensible asset is verified cash-flow history for businesses banks
> can't see. Charge lightly for the tool to win trust and density; earn the
> real margin on payments and credit built on that data.

## Phased revenue model

### Phase 1 — Transaction fee (now → ~6 months)
Flat **GHS 1 per *locked* booking**, absorbed into the deposit, shown as
"incl. GHS 1 Krado fee". Aligned with value (a booking just prevented a
no-show), zero monthly-churn risk, fits the daily-cash mental model.

- Unit economics: a barber at ~15 locked bookings/week ≈ **GHS 60/month**,
  invisible because it comes out of a deposit that already protected them.
- Implementation: `KRADO_FEE_PESEWAS` Worker var (default `0` = off). Flip to
  `100` to switch on for the pilot. The fee is recorded on each booking
  (`bookings.krado_fee`) and split from the deposit — the client pays the same,
  the artisan's net is `deposit − fee`. No-shows the artisan keeps are not
  charged (handled at settlement, when payouts are built).
- Phase 1 is not about profit — it proves willingness-to-pay and funds growth.

### Phase 2 — Own the payment rail (~6–18 months)
Let clients pay the **full service** through Krado, not just the deposit. Take
a small spread (~1–1.5%) on total volume → revenue scales with the artisan's
whole turnover, not just bookings. Add instant-vs-next-day payout (charge for
instant). Now Krado is where their money lives — sticky.

### Phase 3 — Credit & savings on proprietary data (~12–24 months) — the prize
Months of deposit-verified revenue history = collateral no bank has. Via
**licensed partners** (never solo):
- **Working-capital advances / BNPL** for artisans (against upcoming bookings;
  equipment/supplies finance). Origination fee or spread — highest margin.
- **Real susu / savings** (float + fees) — BoG-regulated; partner with a
  licensed deposit-taker. v1 stays a ledger until then.
- **Insurance** (income protection, equipment) — commission.

### Phase 4 — Demand aggregation (later, optional)
Discovery / featured placement once both sides have density. Kept late: it
trades the "we're your tool, not your competitor" trust that drives onboarding.

## Adjacent lines (low effort)
- **Premium tier** for bigger shops: multi-staff, analytics, branded booking
  page, hide the Krado-fee line. Modest monthly, opt-in.
- **White-label the rail** to adjacent verticals (nail techs, tailors, makeup,
  mechanics, tutors) — same engine, new segments.

## Traps to avoid
1. **Never charge the client to book** — kills deposit conversion. Monetize the
   artisan / transaction / financial layer, keep the client side free.
2. **Don't move real susu/savings money without a licence or partner** — BoG
   deposit-taking rules; existential if wrong. Ledger until licensed.
3. **Don't lead with subscriptions** — micro-merchants churn in lean weeks.
4. **Don't build the marketplace early** — it dilutes onboarding trust.
5. **Mind processor economics** — MoMo/Paystack fees can eat a thin
   per-transaction margin; negotiate volume rates, pass through transparently.

## Next 90 days
Keep the pilot **free**; nail retention and the no-show metric (the real proof).
Quietly instrument willingness-to-pay (A/B the fee line on a subset). The most
valuable thing to accumulate now is **clean, repayment-grade transaction
history** — the collateral for everything in Phase 3.
