export async function fetchQuote(symbol: string): Promise<number> {
  const res = await fetch(`/api/quote?symbol=${encodeURIComponent(symbol)}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).error ?? `Failed to fetch ${symbol}`);
  }
  const data = await res.json();
  return data.price as number;
}

/** Fetch live USD → CAD exchange rate from Yahoo Finance (symbol USDCAD=X). */
export async function fetchExchangeRate(): Promise<number> {
  return fetchQuote('USDCAD=X');
}

/** Fetch historical USD → CAD exchange rate for a specific date (YYYY-MM-DD). Returns 0 on failure. */
export async function fetchHistoricalRate(date: string): Promise<number> {
  try {
    const res = await fetch(`/api/history?symbol=USDCAD%3DX&date=${encodeURIComponent(date)}`);
    if (!res.ok) return 0;
    const data = await res.json();
    return (data.price as number) ?? 0;
  } catch {
    return 0;
  }
}
