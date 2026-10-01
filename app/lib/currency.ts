export const SUPPORTED_CURRENCIES = [
  { code: "INR", name: "Indian Rupee" },
  { code: "USD", name: "US Dollar" },
  { code: "EUR", name: "Euro" },
  { code: "GBP", name: "British Pound" },
  { code: "AUD", name: "Australian Dollar" },
  { code: "CAD", name: "Canadian Dollar" },
  { code: "SGD", name: "Singapore Dollar" },
  { code: "AED", name: "UAE Dirham" },
  { code: "SAR", name: "Saudi Riyal" },
  { code: "JPY", name: "Japanese Yen" },
] as const;

export type SupportedCurrencyCode = (typeof SUPPORTED_CURRENCIES)[number]["code"];

export const DEFAULT_TEST_CURRENCY: SupportedCurrencyCode = "INR";

export const SUPPORTED_CURRENCY_CODES = SUPPORTED_CURRENCIES.map(({ code }) => code);

export function normalizeCurrency(value: unknown): SupportedCurrencyCode | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toUpperCase();
  return SUPPORTED_CURRENCY_CODES.includes(normalized as SupportedCurrencyCode)
    ? (normalized as SupportedCurrencyCode)
    : null;
}

export function isSupportedCurrency(value: unknown): value is SupportedCurrencyCode {
  return normalizeCurrency(value) !== null;
}

export function formatMoney(amount: string | number, currency: string) {
  const value = Number(amount);
  const code = currency.trim().toUpperCase();
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: code,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${code} ${value.toFixed(2)}`;
  }
}