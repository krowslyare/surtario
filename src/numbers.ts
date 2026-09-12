/** Decimal explícito: punto o coma, sin separadores de miles ni notación científica. */
export function parseDecimal(value: string, places = 3): number | null {
  const text = value.trim();
  if (!text) return null;
  if (
    !(
      places === 0 ? /^\d+$/ : new RegExp(`^\\d+(?:[.,]\\d{1,${places}})?$`)
    ).test(text)
  )
    return NaN;
  const number = Number(text.replace(",", "."));
  return Number.isFinite(number) ? number : NaN;
}
export function parseCents(value: string): number | null {
  const amount = parseDecimal(value, 2);
  if (amount === null) return null;
  const cents = Math.round(amount * 100);
  return Number.isSafeInteger(cents) ? cents : NaN;
}
export const money = (cents: number | null, currency: string = "PEN") =>
  cents === null
    ? "Pending"
    : `${currency === "PEN" ? "S/" : "USD"} ${new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(cents / 100)}`;
export const numberLabel = (value: number | null) =>
  value === null
    ? "Pending"
    : new Intl.NumberFormat("en-US", { maximumFractionDigits: 3 }).format(
        value,
      );
