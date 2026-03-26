import React from 'react';
import { calculatePositionMetrics, calculateTotalEquity } from '../utils/calculations';
import { Position } from '../types';

type PositionsListProps = {
  positions: Position[];
  cash: number;
  initialEquity: number;
  onClose: (positionId: string) => void;
};

export function PositionsList({
  positions,
  cash,
  initialEquity,
  onClose,
}: PositionsListProps) {
  const totalEquity = calculateTotalEquity(positions, cash);

  if (positions.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg shadow-md p-6 border border-gray-700">
        <p className="text-gray-400 text-center">No open positions</p>
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
            <th className="px-4 py-3 text-right font-semibold text-gray-200">Stop</th>
            <th className="px-4 py-3 text-right font-semibold text-gray-200">Book Cost</th>
            <th className="px-4 py-3 text-right font-semibold text-gray-200">Risk $</th>
            <th className="px-4 py-3 text-right font-semibold text-gray-200">Risk %</th>
            <th className="px-4 py-3 text-right font-semibold text-gray-200">Risk % of Eq</th>
            <th className="px-4 py-3 text-right font-semibold text-gray-200">2R</th>
            <th className="px-4 py-3 text-right font-semibold text-gray-200">3R</th>
            <th className="px-4 py-3 text-right font-semibold text-gray-200">4R</th>
            <th className="px-4 py-3 text-right font-semibold text-gray-200">5R</th>
            <th className="px-4 py-3 text-center font-semibold text-gray-200">Action</th>
          </tr>
        </thead>
        <tbody>
          {positions.map(position => {
            const metrics = calculatePositionMetrics(position, totalEquity);
            return (
              <tr key={position.id} className="border-b border-gray-700 hover:bg-gray-700">
                <td className="px-4 py-3 font-semibold text-white">{position.ticker}</td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-1 rounded text-xs font-semibold ${
                      position.type === 'long'
                        ? 'bg-green-900 text-green-300'
                        : 'bg-red-900 text-red-300'
                    }`}
                  >
                    {position.type.toUpperCase()}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-gray-300">{position.shares}</td>
                <td className="px-4 py-3 text-right text-gray-300">${position.entryPrice.toFixed(2)}</td>
                <td className="px-4 py-3 text-right text-gray-300">${position.stopPrice.toFixed(2)}</td>
                <td className="px-4 py-3 text-right font-semibold text-white">
                  ${metrics.bookCost.toFixed(2)}
                </td>
                <td className="px-4 py-3 text-right text-red-400 font-semibold">
                  ${metrics.initialRiskDollar.toFixed(2)}
                </td>
                <td className="px-4 py-3 text-right text-gray-300">{metrics.initialRiskPercent.toFixed(2)}%</td>
                <td className="px-4 py-3 text-right text-gray-300">{metrics.riskPercentOfEquity.toFixed(2)}%</td>
                <td className="px-4 py-3 text-right text-gray-300">${metrics.targets.r2.toFixed(2)}</td>
                <td className="px-4 py-3 text-right text-gray-300">${metrics.targets.r3.toFixed(2)}</td>
                <td className="px-4 py-3 text-right text-gray-300">${metrics.targets.r4.toFixed(2)}</td>
                <td className="px-4 py-3 text-right text-gray-300">${metrics.targets.r5.toFixed(2)}</td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => onClose(position.id)}
                    className="bg-red-600 text-white px-3 py-1 rounded text-xs hover:bg-red-700 transition"
                  >
                    Close
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
