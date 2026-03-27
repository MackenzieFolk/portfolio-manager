import { calculateClosedTradeMetrics } from '../utils/calculations';
import { ClosedTrade } from '../types';

type ClosedTradesTableProps = {
  trades: ClosedTrade[];
  initialEquity: number;
  portfolioCurrency?: string;
  usdCadRate?: number;
};

export function ClosedTradesTable({ trades, initialEquity }: ClosedTradesTableProps) {
  if (trades.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg shadow-md p-6 border border-gray-700">
        <p className="text-gray-400 text-center">No closed trades</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg shadow-md overflow-x-auto border border-gray-700">
      <table className="w-full text-sm">
        <thead className="bg-gray-700 border-b border-gray-600">
          <tr>
            <th className="px-4 py-3 text-left font-semibold text-gray-200">Ticker</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-200">Type</th>
            <th className="px-4 py-3 text-right font-semibold text-gray-200">Shares</th>
            <th className="px-4 py-3 text-right font-semibold text-gray-200">Entry Price</th>
            <th className="px-4 py-3 text-right font-semibold text-gray-200">Exit Price</th>
            <th className="px-4 py-3 text-right font-semibold text-gray-200">P&L $</th>
            <th className="px-4 py-3 text-right font-semibold text-gray-200">P&L %</th>
            <th className="px-4 py-3 text-right font-semibold text-gray-200">RR Multiple</th>
            <th className="px-4 py-3 text-right font-semibold text-gray-200">Days Held</th>
            <th className="px-4 py-3 text-right font-semibold text-gray-200">Return on Equity %</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-200">Exit Reason</th>
          </tr>
        </thead>
        <tbody>
          {trades.map(trade => {
            const metrics = calculateClosedTradeMetrics(trade, initialEquity);
            return (
              <tr key={trade.id} className="border-b border-gray-700 hover:bg-gray-700">
                <td className="px-4 py-3 font-semibold text-white">{trade.ticker}</td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-1 rounded text-xs font-semibold ${
                      trade.type === 'long'
                        ? 'bg-green-900 text-green-300'
                        : 'bg-red-900 text-red-300'
                    }`}
                  >
                    {trade.type.toUpperCase()}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-gray-300">{trade.shares}</td>
                <td className="px-4 py-3 text-right text-gray-300">${trade.entryPrice.toFixed(2)}</td>
                <td className="px-4 py-3 text-right text-gray-300">${trade.exitPrice.toFixed(2)}</td>
                <td
                  className={`px-4 py-3 text-right font-semibold ${
                    metrics.pnlDollar >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}
                >
                  ${metrics.pnlDollar.toFixed(2)}
                </td>
                <td
                  className={`px-4 py-3 text-right font-semibold ${
                    metrics.pnlPercent >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}
                >
                  {metrics.pnlPercent.toFixed(2)}%
                </td>
                <td
                  className={`px-4 py-3 text-right font-semibold ${
                    metrics.rrMultiple >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}
                >
                  {metrics.rrMultiple.toFixed(2)}R
                </td>
                <td className="px-4 py-3 text-right text-gray-300">{metrics.daysHeld} days</td>
                <td
                  className={`px-4 py-3 text-right font-semibold ${
                    metrics.returnOnEquityPercent >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}
                >
                  {metrics.returnOnEquityPercent.toFixed(2)}%
                </td>
                <td className="px-4 py-3 text-left text-xs text-gray-400">{trade.exitReason}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
