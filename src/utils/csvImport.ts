import { Position, Tranche } from '../types';
import { v4 as uuidv4 } from 'uuid';

export type CsvImportResult = {
  positions: Omit<Position, 'id'>[];
  warnings: string[];
};

const FIELD_ALIASES: Record<string, string[]> = {
  ticker:     ['ticker', 'symbol', 'stock'],
  entryDate:  ['entrydate', 'date', 'opendate', 'tradedate', 'purchasedate'],
  type:       ['type', 'direction', 'side', 'action'],
  shares:     ['shares', 'quantity', 'qty', 'size'],
  entryPrice: ['entryprice', 'averagecost', 'avgcost', 'avgprice', 'costbasis', 'buyprice'],
  lastPrice:  ['price', 'lastprice', 'currentprice', 'marketprice'],
  stopPrice:  ['stopprice', 'stop', 'stoploss', 'stoplossprice'],
  notes:      ['notes', 'memo', 'comment', 'comments', 'description'],
  tags:       ['tags', 'label', 'labels', 'category'],
};

function normalize(s: string): string {
  return s.toLowerCase().replace(/[\s_\-$%#]/g, '');
}

function findColumn(headers: string[], field: string): number {
  const aliases = FIELD_ALIASES[field] ?? [field];
  for (const alias of aliases) {
    const idx = headers.findIndex(h => normalize(h) === normalize(alias));
    if (idx !== -1) return idx;
  }
  return -1;
}

function parseType(raw: string): 'long' | 'short' {
  const v = raw.toLowerCase().trim();
  if (['short', 'sell', 's'].includes(v)) return 'short';
  return 'long';
}

function parseDate(raw: string): string {
  if (!raw) return new Date().toISOString().split('T')[0];
  const d = new Date(raw);
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  return new Date().toISOString().split('T')[0];
}

// Find the actual header row — scan until we find a row containing 'symbol' or 'ticker'
function findHeaderRowIndex(lines: string[]): number {
  for (let i = 0; i < lines.length; i++) {
    const normalized = lines[i].toLowerCase();
    if (normalized.includes('symbol') || normalized.includes('ticker')) {
      return i;
    }
  }
  return 0;
}

export function parsePositionsCsv(csvText: string): CsvImportResult {
  const lines = csvText.split('\n').map(l => l.replace(/\r/g, '').trim()).filter(Boolean);
  if (lines.length < 2) return { positions: [], warnings: ['CSV must have a header row and at least one data row.'] };

  const headerRowIdx = findHeaderRowIndex(lines);
  const headers = lines[headerRowIdx].split(',').map(h => h.replace(/"/g, '').trim());

  const colIdx: Record<string, number> = {};
  for (const field of Object.keys(FIELD_ALIASES)) {
    colIdx[field] = findColumn(headers, field);
  }

  if (colIdx.ticker === -1 || colIdx.entryPrice === -1 || colIdx.shares === -1) {
    return {
      positions: [],
      warnings: ['Could not find required columns (ticker/symbol, quantity/shares, average cost/entry price). Check your CSV headers.'],
    };
  }

  const positions: Omit<Position, 'id'>[] = [];
  const warnings: string[] = [];

  for (let i = headerRowIdx + 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.replace(/"/g, '').trim());
    const get = (field: string) => colIdx[field] !== -1 ? (cols[colIdx[field]] ?? '') : '';

    const ticker = get('ticker').toUpperCase();
    if (!ticker) continue;

    const rawShares = parseFloat(get('shares'));
    const entryPrice = parseFloat(get('entryPrice'));

    if (isNaN(rawShares) || isNaN(entryPrice)) {
      warnings.push(`Row ${i + 1} (${ticker}): skipped — missing shares or entry price.`);
      continue;
    }

    // Skip zero-quantity rows (closed/empty positions in broker export)
    if (rawShares === 0) continue;

    // Negative quantity = short position
    const type: 'long' | 'short' = rawShares < 0 ? 'short' : 'long';
    const shares = Math.abs(rawShares);

    // For shorts, stop is above entry; for longs, below entry
    const rawStop = get('stopPrice');
    let stopPrice = parseFloat(rawStop);
    if (isNaN(stopPrice) || stopPrice <= 0) {
      stopPrice = type === 'long' ? entryPrice * 0.95 : entryPrice * 1.05;
      warnings.push(`${ticker}: no stop price found, defaulted to 5% ${type === 'long' ? 'below' : 'above'} entry ($${stopPrice.toFixed(2)}). Please update via Edit.`);
    }

    // Use broker's current price as lastPrice if available
    const rawLastPrice = get('lastPrice');
    const lastPrice = rawLastPrice ? parseFloat(rawLastPrice) : undefined;

    const rawTags = get('tags');
    const tags = rawTags ? rawTags.split(';').map(t => t.trim()).filter(Boolean) : [];

    // Detect type from explicit column if present, otherwise use quantity sign
    const explicitType = colIdx.type !== -1 ? get('type') : '';
    const finalType = explicitType ? parseType(explicitType) : type;

    positions.push({
      ticker,
      entryDate: parseDate(get('entryDate')),
      type: finalType,
      shares,
      entryPrice,
      stopPrice,
      lastPrice: lastPrice && !isNaN(lastPrice) ? lastPrice : undefined,
      notes: get('notes') || undefined,
      tags: tags.length > 0 ? tags : undefined,
    });
  }

  return { positions, warnings };
}

export type ExitFillSummary = {
  exitPrice: number;   // weighted average fill price
  exitDate: string;    // date of the last fill
  totalShares: number;
  fills: { date: string; shares: number; fillPrice: number; action: string }[];
};

/**
 * Parse an orders CSV and extract exit fills (Sell/Cover/Buy-against-short)
 * for a specific ticker. Returns a blended summary ready to populate ClosePositionForm.
 */
export function parseExitFillsForTicker(
  csvText: string,
  ticker: string,
  positionType: 'long' | 'short',
): ExitFillSummary | null {
  const lines = csvText.split('\n').map(l => l.replace(/\r/g, '').trim()).filter(Boolean);
  const headerIdx = lines.findIndex(l =>
    l.toLowerCase().includes('fill quantity') || l.toLowerCase().includes('action')
  );
  if (headerIdx === -1) return null;

  const headers = lines[headerIdx].split(',').map(h => h.replace(/"/g, '').trim());
  const col = (name: string) => headers.findIndex(h => normalize(h) === normalize(name));

  const iAction     = col('Action');
  const iSymbol     = col('Symbol');
  const iDate       = col('Order Date');
  const iFillQty    = col('Fill Quantity');
  const iFillPrice  = col('Avg Fill Price');
  const iFillStatus = col('Fill Status');

  if (iAction === -1 || iSymbol === -1 || iFillQty === -1 || iFillPrice === -1) return null;

  const exitActions = positionType === 'long'
    ? ['sell']
    : ['cover', 'buy'];

  const fills: ExitFillSummary['fills'] = [];

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.replace(/"/g, '').trim());
    const get = (idx: number) => (idx !== -1 ? cols[idx] ?? '' : '');

    if (iFillStatus !== -1 && get(iFillStatus).toLowerCase() !== 'filled') continue;

    const sym = get(iSymbol).split(' ')[0].toUpperCase();
    if (sym !== ticker.toUpperCase()) continue;

    const action = get(iAction).toLowerCase();
    if (!exitActions.includes(action)) continue;

    const shares = parseFloat(get(iFillQty));
    const fillPrice = parseFloat(get(iFillPrice));
    if (isNaN(shares) || isNaN(fillPrice) || shares <= 0) continue;

    fills.push({ date: parseDate(get(iDate)), shares, fillPrice, action: get(iAction) });
  }

  if (fills.length === 0) return null;

  fills.sort((a, b) => a.date.localeCompare(b.date));

  const totalShares = fills.reduce((s, f) => s + f.shares, 0);
  const weightedPrice = fills.reduce((s, f) => s + f.fillPrice * f.shares, 0) / totalShares;

  return {
    exitPrice: Math.round(weightedPrice * 10000) / 10000,
    exitDate: fills[fills.length - 1].date,
    totalShares: Math.round(totalShares * 10000) / 10000,
    fills,
  };
}

// ── Order history CSV ─────────────────────────────────────────────────────────

type RawFill = {
  account: string;
  referenceNumber: string;
  action: 'Buy' | 'Sell' | 'Short' | 'Cover';
  ticker: string;
  date: string;       // ISO datetime string
  shares: number;
  fillPrice: number;
};

export type OrderImportResult = {
  positions: Omit<Position, 'id'>[];
  warnings: string[];
};

/** Returns true if the CSV looks like a filled-orders export (vs holdings). */
export function isOrdersCsv(csvText: string): boolean {
  const firstLines = csvText.split('\n').slice(0, 6).join(' ').toLowerCase();
  return firstLines.includes('fill quantity') || firstLines.includes('fillquantity') || firstLines.includes('avg fill price');
}

export function parseOrdersCsv(csvText: string): OrderImportResult {
  const lines = csvText.split('\n').map(l => l.replace(/\r/g, '').trim()).filter(Boolean);
  const warnings: string[] = [];

  // Find header row
  const headerIdx = lines.findIndex(l => l.toLowerCase().includes('fill quantity') || l.toLowerCase().includes('action'));
  if (headerIdx === -1) return { positions: [], warnings: ['Could not find order header row.'] };

  const headers = lines[headerIdx].split(',').map(h => h.replace(/"/g, '').trim());
  const col = (name: string) => headers.findIndex(h => normalize(h) === normalize(name));

  const iAccount    = col('Account');
  const iRef        = col('Reference Number');
  const iAction     = col('Action');
  const iSymbol     = col('Symbol');
  const iDate       = col('Order Date');
  const iFillQty    = col('Fill Quantity');
  const iFillPrice  = col('Avg Fill Price');
  const iFillStatus = col('Fill Status');

  if (iAction === -1 || iSymbol === -1 || iFillQty === -1 || iFillPrice === -1) {
    return { positions: [], warnings: ['Missing required columns (Action, Symbol, Fill Quantity, Avg Fill Price).'] };
  }

  const fills: RawFill[] = [];

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.replace(/"/g, '').trim());
    const get = (idx: number) => (idx !== -1 ? cols[idx] ?? '' : '');

    if (iFillStatus !== -1 && get(iFillStatus).toLowerCase() !== 'filled') continue;

    const rawAction = get(iAction);
    const action = rawAction as RawFill['action'];
    if (!['Buy', 'Sell', 'Short', 'Cover'].includes(action)) continue;

    // "NUE US" → "NUE"
    const ticker = get(iSymbol).split(' ')[0].toUpperCase();
    if (!ticker) continue;

    const shares = parseFloat(get(iFillQty));
    const fillPrice = parseFloat(get(iFillPrice));
    if (isNaN(shares) || isNaN(fillPrice) || shares <= 0) continue;

    fills.push({
      account: get(iAccount),
      referenceNumber: get(iRef),
      action,
      ticker,
      date: parseDate(get(iDate)),
      shares,
      fillPrice,
    });
  }

  if (fills.length === 0) return { positions: [], warnings: ['No filled orders found.'] };

  // Sort chronologically
  fills.sort((a, b) => a.date.localeCompare(b.date));

  // Group by ticker and simulate running position to find current open trade
  const byTicker = new Map<string, RawFill[]>();
  for (const f of fills) {
    if (!byTicker.has(f.ticker)) byTicker.set(f.ticker, []);
    byTicker.get(f.ticker)!.push(f);
  }

  const positions: Omit<Position, 'id'>[] = [];

  for (const [ticker, tickerFills] of byTicker) {
    let openShares = 0;
    let totalCostBasis = 0;
    let currentTrade: RawFill[] = [];
    let posType: 'long' | 'short' = 'long';

    for (const fill of tickerFills) {
      // Context-aware entry/exit: TD Direct uses "Buy" for both opening longs
      // AND covering shorts. Determine by the current open position direction.
      let resolvedAction = fill.action;
      if (openShares > 0) {
        if (posType === 'short' && fill.action === 'Buy') resolvedAction = 'Cover';
        if (posType === 'long'  && fill.action === 'Short') resolvedAction = 'Sell';
      }

      const isEntry = resolvedAction === 'Buy' || resolvedAction === 'Short';
      const isExit  = resolvedAction === 'Sell' || resolvedAction === 'Cover';

      if (isEntry) {
        if (openShares === 0) {
          // Fresh trade starting
          posType = resolvedAction === 'Short' ? 'short' : 'long';
          currentTrade = [];
          totalCostBasis = 0;
        }
        totalCostBasis += fill.shares * fill.fillPrice;
        openShares += fill.shares;
        currentTrade.push({ ...fill, action: resolvedAction });
      } else if (isExit && openShares > 0) {
        const avgCost = totalCostBasis / openShares;
        totalCostBasis = Math.max(0, totalCostBasis - fill.shares * avgCost);
        openShares = Math.max(0, openShares - fill.shares);
        currentTrade.push({ ...fill, action: resolvedAction });

        if (openShares === 0) {
          // Position fully closed — reset, next entry is a new trade
          currentTrade = [];
          totalCostBasis = 0;
        }
      }
    }

    if (openShares <= 0 || currentTrade.length === 0) continue; // closed, skip

    const blendedAvg = totalCostBasis / openShares;
    const entryFills = currentTrade.filter(f => f.action === 'Buy' || f.action === 'Short');
    const entryDate = entryFills[0]?.date ?? currentTrade[0].date;

    const tranches: Tranche[] = currentTrade.map(f => ({
      id: uuidv4(),
      account: f.account,
      referenceNumber: f.referenceNumber,
      action: f.action,
      date: f.date,
      shares: f.shares,
      fillPrice: f.fillPrice,
    }));

    positions.push({
      ticker,
      type: posType,
      shares: Math.round(openShares * 10000) / 10000,
      entryPrice: Math.round(blendedAvg * 10000) / 10000,
      entryDate,
      stopPrice: 0, // user must enter
      tranches,
    });
  }

  return { positions, warnings };
}
