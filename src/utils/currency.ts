export type Currency = 'USD' | 'CAD';

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  USD: '$',
  CAD: 'C$',
};

/** Format a monetary value with the appropriate currency prefix. */
export function fmt(amount: number, currency: Currency): string {
  return `${CURRENCY_SYMBOLS[currency]}${amount.toFixed(2)}`;
}

/**
 * Convert an amount from one currency to another.
 * usdCadRate: how many CAD per 1 USD (e.g. 1.38)
 */
export function convert(
  amount: number,
  from: Currency,
  to: Currency,
  usdCadRate: number,
): number {
  if (from === to) return amount;
  if (from === 'USD' && to === 'CAD') return amount * usdCadRate;
  if (from === 'CAD' && to === 'USD') return amount / usdCadRate;
  return amount;
}
