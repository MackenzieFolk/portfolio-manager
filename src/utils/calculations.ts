import { Position, ClosedTrade, PositionMetrics, ClosedTradeMetrics } from '../types';

const COMMISSION = 9.99;

export function calculatePositionMetrics(
  position: Position,
  totalEquity: number
): PositionMetrics {
  const bookCost = position.entryPrice * position.shares + COMMISSION;
  const riskPerShare = position.entryPrice - position.stopPrice;
  const initialRiskDollar = riskPerShare * position.shares;
  const initialRiskPercent = (initialRiskDollar / bookCost) * 100;
  const riskPercentOfEquity = (initialRiskDollar / totalEquity) * 100;

  return {
    bookCost,
    initialRiskDollar,
    initialRiskPercent,
    riskPercentOfEquity,
    targets: {
      r2: position.entryPrice + riskPerShare * 2,
      r3: position.entryPrice + riskPerShare * 3,
      r4: position.entryPrice + riskPerShare * 4,
      r5: position.entryPrice + riskPerShare * 5,
    },
  };
}

export function calculateClosedTradeMetrics(
  trade: ClosedTrade,
  initialEquity: number
): ClosedTradeMetrics {
  const pnlDollar =
    (trade.exitPrice - trade.entryPrice) * trade.shares - COMMISSION * 2;
  const bookCost = trade.entryPrice * trade.shares + COMMISSION;
  const pnlPercent = (pnlDollar / bookCost) * 100;

  const riskPerShare = trade.entryPrice - trade.stopPrice;
  const rrMultiple = (trade.exitPrice - trade.entryPrice) / riskPerShare;

  const entryDate = new Date(trade.entryDate);
  const exitDate = new Date(trade.exitDate);
  const daysHeld = Math.floor(
    (exitDate.getTime() - entryDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  const returnOnEquityPercent = (pnlDollar / initialEquity) * 100;

  return {
    pnlDollar,
    pnlPercent,
    rrMultiple,
    daysHeld,
    returnOnEquityPercent,
  };
}

export function calculateTotalEquity(
  positions: Position[],
  cash: number,
  currentPrices?: Record<string, number>
): number {
  let positionsValue = 0;

  if (currentPrices) {
    positionsValue = positions.reduce((sum, pos) => {
      const price = currentPrices[pos.ticker] || pos.entryPrice;
      return sum + price * pos.shares;
    }, 0);
  } else {
    // If no current prices, use entry prices
    positionsValue = positions.reduce((sum, pos) => {
      return sum + pos.entryPrice * pos.shares;
    }, 0);
  }

  return positionsValue + cash;
}
