export function decimalToCents(input: string) {
  const normalized = input.trim().replace(",", ".");
  const m = normalized.match(/^(-?\d+)(?:\.(\d{1,2}))?$/);
  if (!m) throw new Error(`Invalid decimal: ${input}`);
  const sign = m[1].startsWith("-") ? -1 : 1;
  const whole = Number.parseInt(m[1].replace("-", ""), 10);
  const fracRaw = m[2] ?? "";
  const frac = Number.parseInt((fracRaw + "00").slice(0, 2), 10);
  if (!Number.isFinite(whole) || !Number.isFinite(frac)) throw new Error(`Invalid decimal: ${input}`);
  return sign * (whole * 100 + frac);
}

export function centsToDecimal(cents: number) {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const whole = Math.floor(abs / 100);
  const frac = String(abs % 100).padStart(2, "0");
  return `${sign}${whole}.${frac}`;
}
