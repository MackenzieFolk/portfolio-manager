import { calculateTotalEquity } from '../utils/calculations';
import { Position } from '../types';

type PortfolioSummaryProps = {
  initialEquity: number;
  cash: number;
  positions: Position[];
  onEditEquity: () => void;
};

export function PortfolioSummary({
  initialEquity,
  cash,
  positions,
  onEditEquity,
}: PortfolioSummaryProps) {
  const totalEquity = calculateTotalEquity(positions, cash);
  const positionsValue = positions.reduce((sum, pos) => {
    return sum + pos.entryPrice * pos.shares;
  }, 0);

  const gainLoss = totalEquity - initialEquity;
  const gainLossPercent = initialEquity > 0 ? (gainLoss / initialEquity) * 100 : 0;

  const totalRiskDollar = positions.reduce((sum, pos) => {
    const riskPerShare = pos.type === 'short'
      ? pos.stopPrice - pos.entryPrice
      : pos.entryPrice - pos.stopPrice;
    return sum + riskPerShare * pos.shares;
  }, 0);
  const totalRiskPercent = totalEquity > 0 ? (totalRiskDollar / totalEquity) * 100 : 0;

  return (
    <div className="bg-gray-800 rounded-lg shadow-md p-6 mb-6 border border-gray-700">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <p className="text-gray-400 text-sm font-semibold mb-1">Initial Equity</p>
          <p className="text-2xl font-bold text-white">${initialEquity.toFixed(2)}</p>
          <button
            onClick={onEditEquity}
            className="text-blue-400 text-xs hover:text-blue-300 mt-1"
          >
            Edit
          </button>
        </div>
        <div>
          <p className="text-gray-400 text-sm font-semibold mb-1">Current Equity</p>
          <p className="text-2xl font-bold text-white">${totalEquity.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-gray-400 text-sm font-semibold mb-1">Cash</p>
          <p className="text-2xl font-bold text-white">${cash.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-gray-400 text-sm font-semibold mb-1">Positions Value</p>
          <p className="text-2xl font-bold text-white">${positionsValue.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-gray-400 text-sm font-semibold mb-1">Gain/Loss</p>
          <p
            className={`text-2xl font-bold ${
              gainLoss >= 0 ? 'text-green-400' : 'text-red-400'
            }`}
          >
            ${gainLoss.toFixed(2)}
          </p>
        </div>
        <div>
          <p className="text-gray-400 text-sm font-semibold mb-1">Gain/Loss %</p>
          <p
            className={`text-2xl font-bold ${
              gainLossPercent >= 0 ? 'text-green-400' : 'text-red-400'
            }`}
          >
            {gainLossPercent.toFixed(2)}%
          </p>
        </div>
        <div className="md:col-span-4 border-t border-gray-700 pt-4 mt-2">
          <p className="text-gray-400 text-xs font-semibold uppercase tracking-wide mb-3">
            Total Open Risk
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-gray-400 text-sm font-semibold mb-1">Combined Risk $</p>
              <p className="text-2xl font-bold text-orange-400">
                ${totalRiskDollar.toFixed(2)}
              </p>
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
  );
}
