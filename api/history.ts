import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { symbol, date } = req.query;

  if (!symbol || typeof symbol !== 'string') {
    return res.status(400).json({ error: 'Symbol is required' });
  }
  if (!date || typeof date !== 'string') {
    return res.status(400).json({ error: 'Date is required' });
  }

  const ticker = symbol.toUpperCase().trim();

  // Use noon UTC on the target date; look back up to 5 days to handle weekends/holidays
  const d = new Date(date + 'T12:00:00Z');
  const period2 = Math.floor(d.getTime() / 1000) + 86400;
  const period1 = period2 - 86400 * 7; // 7-day window ending day after target

  try {
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&period1=${period1}&period2=${period2}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      return res.status(response.status).json({ error: `Yahoo Finance returned ${response.status}` });
    }

    const data = await response.json() as any;
    const closes: (number | null)[] | undefined =
      data?.chart?.result?.[0]?.indicators?.quote?.[0]?.close;

    if (!closes || closes.length === 0) {
      return res.status(404).json({ error: `No historical data for ${ticker} near ${date}` });
    }

    // Last non-null close in the window (closest trading day on or before the target date)
    const price = [...closes].reverse().find(v => v != null);

    if (price == null) {
      return res.status(404).json({ error: `No valid price for ${ticker} near ${date}` });
    }

    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=3600');
    return res.status(200).json({ symbol: ticker, price, date });
  } catch {
    return res.status(500).json({ error: 'Failed to fetch historical price' });
  }
}
