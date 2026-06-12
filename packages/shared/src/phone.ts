/**
 * Phone numbers are identity. One normalizer for every ingress point.
 * Output is E.164 for Ghana (+233 followed by 9 digits) or null.
 */

const GH_SIGNIFICANT_DIGITS = 9;

export function normalizePhone(input: string): string | null {
  const digits = input.replace(/[^\d+]/g, "");
  let national: string;

  if (digits.startsWith("+233")) {
    national = digits.slice(4);
  } else if (digits.startsWith("233")) {
    national = digits.slice(3);
  } else if (digits.startsWith("0")) {
    national = digits.slice(1);
  } else {
    return null;
  }

  if (!/^\d+$/.test(national) || national.length !== GH_SIGNIFICANT_DIGITS) {
    return null;
  }
  return `+233${national}`;
}
