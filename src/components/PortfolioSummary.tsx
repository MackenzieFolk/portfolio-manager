import { fmt, convert, Currency } from '../utils/currency';
import { Position } from '../types';
import { PieChart, PieSegment } from './PieChart';

const POSITION_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899',
  '#06b6d4', '#84cc16', '#f97316', '#a78bfa', '#34d399',
];

type PortfolioSummaryProps = {
  initialEquity: number;
  initialEquityCurrency: Currency;
  initialEquityUsdCadRate: number;
  cash: number;
  positions: Position[];
  currency: Currency;
  usdCadRate: number;
  onEditEquity: () => void;
  onEditPosition: (id: string) => void;
  onClosePosition: (id: string) => void;
  onDeletePosition: (id: string) => void;
  onAddTranche: (id: string) => void;
};

export function PortfolioSummary({
  initialEquity,
  initialEquityCurrency,
  initialEquityUsdCadRate,
  cash,
  positions,
  currency,
  usdCadRate,
  onEditEquity,
  onEditPosition,
  onClosePosition,
  onDeletePosition,
  onAddTranche,
}: PortfolioSummaryProps) {
  const initialEquityConverted = convert(initialEquity, initialEquityCurrency, currency, initialEquityUsdCadRate);

  // Currency-aware positions equity value (accounts for short P&L direction)
  const positionsValue = positions.reduce((sum, pos) => {
    const price = pos.lastPrice ?? pos.entryPrice;
    const posCurrency = pos.currency ?? 'USD';
    if (pos.type === 'short') {
      return sum + convert((2 * pos.entryPrice - price) * pos.shares, posCurrency, currency, usdCadRate);
    }
    return sum + convert(price * pos.shares, posCurrency, currency, usdCadRate);
  }, 0);

  const totalEquity = positionsValue + cash;

  // Market value only (for display card and pie)
  const positionsMarketValue = positions.reduce((sum, pos) => {
    const price = pos.lastPrice ?? pos.entryPrice;
    const posCurrency = pos.currency ?? 'USD';
    return sum + convert(price * pos.shares, posCurrency, currency, usdCadRate);
  }, 0);

  const gainLoss = totalEquity - initialEquityConverted;
  const gainLossPercent = initialEquityConverted > 0 ? (gainLoss / initialEquityConverted) * 100 : 0;

  const totalRiskDollar = positions.reduce((sum, pos) => {
    const riskPerShare = pos.type === 'short'
      ? pos.stopPrice - pos.entryPrice
      : pos.entryPrice - pos.stopPrice;
    const posCurrency = pos.currency ?? 'USD';
    return sum + convert(riskPerShare * pos.shares, posCurrency, currency, usdCadRate);
  }, 0);
  const totalRiskPercent = totalEquity > 0 ? (totalRiskDollar / totalEquity) * 100 : 0;

  // Build pie segments: cash + one per position (by market value)
  const pieSegments: PieSegment[] = [
    { label: 'Cash', value: Math.max(0, cash), color: '#4b5563' },
    ...positions.map((pos, i) => {
      const price = pos.lastPrice ?? pos.entryPrice;
      const posCurrency = pos.currency ?? 'USD';
      const mktValue = convert(price * pos.shares, posCurrency, currency, usdCadRate);
      return {
        label: pos.ticker,
        value: Math.max(0, mktValue),
        color: POSITION_COLORS[i % POSITION_COLORS.length],
        positionId: pos.id,
      };
    }),
  ];

  return (
    <div className="bg-gray-800 rounded-lg shadow-md p-6 mb-6 border border-gray-700">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-900 text-blue-300 uppercase tracking-wide">
          {currency}
        </span>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Stats grid */}
        <div className="flex-1 min-w-0">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-gray-400 text-sm font-semibold mb-1">Initial Equity</p>
              <p className="text-2xl font-bold text-white">{fmt(initialEquityConverted, currency)}</p>
              <button onClick={onEditEquity} className="text-blue-400 text-xs hover:text-blue-300 mt-1">Edit</button>
            </div>
            <div>
              <p className="text-gray-400 text-sm font-semibold mb-1">Current Equity</p>
              <p className="text-2xl font-bold text-white">{fmt(totalEquity, currency)}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm font-semibold mb-1">Cash</p>
              <p className="text-2xl font-bold text-white">{fmt(cash, currency)}</p>
              {totalEquity > 0 && (
                <p className="text-gray-500 text-xs mt-0.5">{((cash / totalEquity) * 100).toFixed(1)}% of equity</p>
              )}
            </div>
            <div>
              <p className="text-gray-400 text-sm font-semibold mb-1">Positions Value</p>
              <p className="text-2xl font-bold text-white">{fmt(positionsMarketValue, currency)}</p>
              {totalEquity > 0 && (
                <p className="text-gray-500 text-xs mt-0.5">{((positionsMarketValue / totalEquity) * 100).toFixed(1)}% of equity</p>
              )}
            </div>
            <div>
              <p className="text-gray-400 text-sm font-semibold mb-1">Gain/Loss</p>
              <p className={`text-2xl font-bold ${gainLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {fmt(gainLoss, currency)}
              </p>
            </div>
            <div>
              <p className="text-gray-400 text-sm font-semibold mb-1">Gain/Loss %</p>
              <p className={`text-2xl font-bold ${gainLossPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {gainLossPercent.toFixed(2)}%
              </p>
            </div>
            <div className="col-span-2 md:col-span-4 border-t border-gray-700 pt-4 mt-2">
              <p className="text-gray-400 text-xs font-semibold uppercase tracking-wide mb-3">Total Open Risk</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-400 text-sm font-semibold mb-1">Combined Risk {currency}</p>
                  <p className="text-2xl font-bold text-orange-400">{fmt(totalRiskDollar, currency)}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm font-semibold mb-1">Combined Risk % of Equity</p>
                  <p className={`text-2xl font-bold ${totalRiskPercent > 6 ? 'text-red-400' : 'text-orange-400'}`}>
                    {totalRiskPercent.toFixed(2)}%
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Pie chart — only shown when there's something to display */}
        {(cash > 0 || positions.length > 0) && (
          <div className="flex flex-col items-center justify-start lg:pt-1">
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-wide mb-3">Allocation</p>
            <PieChart
              segments={pieSegments}
              size={160}
              onEdit={onEditPosition}
              onClose={onClosePosition}
              onDelete={onDeletePosition}
              onAddTranche={onAddTranche}
            />
          </div>
        )}
      </div>
    </div>
  );
}
