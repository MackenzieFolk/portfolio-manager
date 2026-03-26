export async function fetchQuote(symbol: string): Promise<number> {
  const res = await fetch(`/api/quote?symbol=${encodeURIComponent(symbol)}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).error ?? `Failed to fetch ${symbol}`);
  }
  const data = await res.json();
  return data.price as number;
}
