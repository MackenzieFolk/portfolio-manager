import { useState } from 'react';
import { calculatePositionMetrics, calculateTotalEquity } from '../utils/calculations';
import { Position } from '../types';

type AddPositionFormProps = {
  isOpen: boolean;
  cash: number;
  positions: Position[];
  onAdd: (position: Omit<Position, 'id'>) => void;
  onClose: () => void;
};

export function AddPositionForm({
  isOpen,
  cash,
  positions,
  onAdd,
  onClose,
}: AddPositionFormProps) {
  const [ticker, setTicker] = useState('');
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [type, setType] = useState<'long' | 'short'>('long');
  const [shares, setShares] = useState('');
  const [entryPrice, setEntryPrice] = useState('');
  const [stopPrice, setStopPrice] = useState('');
  const [entryReason, setEntryReason] = useState('');

  const totalEquity = calculateTotalEquity(positions, cash);

  const preview = ticker && shares && entryPrice && stopPrice
    ? (() => {
        const sharesNum = parseFloat(shares);
        const entryNum = parseFloat(entryPrice);
        const stopNum = parseFloat(stopPrice);
        const tempPosition: Position = {
          id: 'temp',
          ticker,
          entryDate,
          type,
          shares: sharesNum,
          entryPrice: entryNum,
          stopPrice: stopNum,
        };
        return calculatePositionMetrics(tempPosition, totalEquity);
      })()
    : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticker || !shares || !entryPrice || !stopPrice) {
      alert('Please fill in all fields');
      return;
    }

    onAdd({
      ticker: ticker.toUpperCase(),
      entryDate,
      type,
      shares: parseFloat(shares),
      entryPrice: parseFloat(entryPrice),
      stopPrice: parseFloat(stopPrice),
      entryReason,
    });

    // Reset form
    setTicker('');
    setEntryDate(new Date().toISOString().split('T')[0]);
    setType('long');
    setShares('');
    setEntryPrice('');
    setStopPrice('');
    setEntryReason('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-2xl max-h-screen overflow-y-auto border border-gray-700">
        <h2 className="text-2xl font-bold mb-4 text-white">Add New Position</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1 text-gray-300">Ticker</label>
              <input
                type="text"
                value={ticker}
                onChange={e => setTicker(e.target.value)}
                placeholder="e.g., AAPL"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1 text-gray-300">Entry Date</label>
              <input
                type="date"
                value={entryDate}
                onChange={e => setEntryDate(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1 text-gray-300">Type</label>
              <select
                value={type}
                onChange={e => setType(e.target.value as 'long' | 'short')}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="long">Long</option>
                <option value="short">Short</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1 text-gray-300">Shares</label>
              <input
                type="number"
                value={shares}
                onChange={e => setShares(e.target.value)}
                placeholder="0"
                step="1"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1 text-gray-300">Entry Price</label>
              <input
                type="number"
                value={entryPrice}
                onChange={e => setEntryPrice(e.target.value)}
                placeholder="0.00"
                step="0.01"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1 text-gray-300">Stop Price</label>
              <input
                type="number"
                value={stopPrice}
                onChange={e => setStopPrice(e.target.value)}
                placeholder="0.00"
                step="0.01"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1 text-gray-300">Entry Reason</label>
            <textarea
              value={entryReason}
              onChange={e => setEntryReason(e.target.value)}
              placeholder="Why did you enter this position?"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 h-20"
            />
          </div>

          {preview && (
            <div className="bg-gray-700 p-4 rounded-lg border border-blue-600">
              <h3 className="font-semibold mb-2 text-white">Preview</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                <div>
                  <p className="text-gray-400">Book Cost</p>
                  <p className="font-semibold text-white">${preview.bookCost.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-gray-400">Initial Risk $</p>
                  <p className="font-semibold text-red-400">${preview.initialRiskDollar.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-gray-400">Initial Risk %</p>
                  <p className="font-semibold text-gray-300">{preview.initialRiskPercent.toFixed(2)}%</p>
                </div>
                <div>
                  <p className="text-gray-400">Risk % of Equity</p>
                  <p className="font-semibold text-gray-300">{preview.riskPercentOfEquity.toFixed(2)}%</p>
                </div>
                <div>
                  <p className="text-gray-400">2R Target</p>
                  <p className="font-semibold text-white">${preview.targets.r2.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-gray-400">3R Target</p>
                  <p className="font-semibold text-white">${preview.targets.r3.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-gray-400">4R Target</p>
                  <p className="font-semibold text-white">${preview.targets.r4.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-gray-400">5R Target</p>
                  <p className="font-semibold text-white">${preview.targets.r5.toFixed(2)}</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <button
              type="submit"
              className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition font-semibold"
            >
              Add Position
            </button>
            <button
              type="button"
              onClick={onClose}
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
