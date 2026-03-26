import React, { useState } from 'react';
import { calculateClosedTradeMetrics } from '../utils/calculations';
import { Position, ClosedTrade } from '../types';

type ClosePositionFormProps = {
  isOpen: boolean;
  position: Position | null;
  initialEquity: number;
  onClose: (exitPrice: number, exitDate: string, exitReason?: string) => void;
  onCancel: () => void;
};

export function ClosePositionForm({
  isOpen,
  position,
  initialEquity,
  onClose,
  onCancel,
}: ClosePositionFormProps) {
  const [exitPrice, setExitPrice] = useState('');
  const [exitDate, setExitDate] = useState(new Date().toISOString().split('T')[0]);
  const [exitReason, setExitReason] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!exitPrice) {
      alert('Please enter exit price');
      return;
    }

    onClose(parseFloat(exitPrice), exitDate, exitReason);

    // Reset form
    setExitPrice('');
    setExitDate(new Date().toISOString().split('T')[0]);
    setExitReason('');
  };

  if (!isOpen || !position) return null;

  const closedTrade: ClosedTrade = {
    ...position,
    exitPrice: parseFloat(exitPrice) || 0,
    exitDate,
    exitReason,
  };

  const metrics = parseFloat(exitPrice) > 0 ? calculateClosedTradeMetrics(closedTrade, initialEquity) : null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-2xl max-h-screen overflow-y-auto border border-gray-700">
        <h2 className="text-2xl font-bold mb-4 text-white">Close Position: {position.ticker}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1 text-gray-300">Exit Price</label>
              <input
                type="number"
                value={exitPrice}
                onChange={e => setExitPrice(e.target.value)}
                placeholder="0.00"
                step="0.01"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1 text-gray-300">Exit Date</label>
              <input
                type="date"
                value={exitDate}
                onChange={e => setExitDate(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1 text-gray-300">Exit Reason</label>
            <textarea
              value={exitReason}
              onChange={e => setExitReason(e.target.value)}
              placeholder="Why did you exit this position?"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 h-20"
            />
          </div>

          {metrics && (
            <div className="bg-gray-700 p-4 rounded-lg border border-blue-600">
              <h3 className="font-semibold mb-2 text-white">Trade Summary</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                <div>
                  <p className="text-gray-400">P&L $</p>
                  <p className={`font-semibold ${metrics.pnlDollar >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    ${metrics.pnlDollar.toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400">P&L %</p>
                  <p className={`font-semibold ${metrics.pnlPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {metrics.pnlPercent.toFixed(2)}%
                  </p>
                </div>
                <div>
                  <p className="text-gray-400">RR Multiple</p>
                  <p className={`font-semibold ${metrics.rrMultiple >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {metrics.rrMultiple.toFixed(2)}R
                  </p>
                </div>
                <div>
                  <p className="text-gray-400">Days Held</p>
                  <p className="font-semibold text-white">{metrics.daysHeld} days</p>
                </div>
                <div>
                  <p className="text-gray-400">Return on Equity %</p>
                  <p className={`font-semibold ${metrics.returnOnEquityPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {metrics.returnOnEquityPercent.toFixed(2)}%
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <button
              type="submit"
              className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition font-semibold"
            >
              Close Position
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 bg-gray-700 text-gray-200 py-2 rounded-lg hover:bg-gray-600 transition font-semibold"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
