export type Position = {
  id: string;
  ticker: string;
  entryDate: string; // ISO string
  type: 'long' | 'short';
  shares: number;
  entryPrice: number;
  stopPrice: number;
  lastPrice?: number;
  entryReason?: string;
};

export type ClosedTrade = Position & {
  exitDate: string; // ISO string
  exitPrice: number;
  exitReason?: string;
};

export type PortfolioState = {
  initialEquity: number;
  cash: number;
  positions: Position[];
  closedTrades: ClosedTrade[];
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
