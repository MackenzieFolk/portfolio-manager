export type Tranche = {
  id: string;
  account: string;
  referenceNumber: string;
  action: 'Buy' | 'Sell' | 'Short' | 'Cover';
  date: string;
  shares: number;
  fillPrice: number;
  stopPrice?: number;
};

export type Position = {
  id: string;
  ticker: string;
  entryDate: string; // ISO string
  type: 'long' | 'short';
  shares: number;
  entryPrice: number;
  stopPrice: number;
  lastPrice?: number;
  currency?: 'USD' | 'CAD'; // position's native currency, default USD
  entryReason?: string;
  notes?: string;
  tags?: string[];
  tranches?: Tranche[];
};

export type ClosedTrade = Position & {
  exitDate: string; // ISO string
  exitPrice: number;
  exitReason?: string;
};

export type PortfolioState = {
  initialEquity: number;
  initialEquityDate?: string;       // YYYY-MM-DD when equity was set
  initialEquityCurrency?: 'USD' | 'CAD'; // currency it was entered in
  cash: number;
  positions: Position[];
  closedTrades: ClosedTrade[];
  currency: 'USD' | 'CAD';
};

export type PositionMetrics = {
  bookCost: number;
  initialRiskDollar: number;
  initialRiskPercent: number;
  riskPercentOfEquity: number;
  targets: {
    r2: number;
    r3: number;
    r4: number;
    r5: number;
  };
};

export type ClosedTradeMetrics = {
  pnlDollar: number;
  pnlPercent: number;
  rrMultiple: number;
  daysHeld: number;
  returnOnEquityPercent: number;
};

export type PerformanceStats = {
  totalTrades: number;
  winCount: number;
  lossCount: number;
  winRate: number;
  avgWinDollar: number;
  avgLossDollar: number;
  avgWinR: number;
  avgLossR: number;
  expectancy: number;
  avgDaysHeldWinners: number;
  avgDaysHeldLosers: number;
  pnlLong: number;
  pnlShort: number;
  rMultiples: number[];
};

export type HistogramBucket = {
  label: string;
  min: number;
  max: number;
  count: number;
};
