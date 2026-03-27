import { useState } from 'react';
import { Position, Tranche } from '../types';
import { v4 as uuidv4 } from 'uuid';

type Props = {
  isOpen: boolean;
  position: Position | null;
  onAdd: (positionId: string, tranche: Tranche, stopPrice?: number) => void;
  onClose: () => void;
};

export function AddTrancheForm({ isOpen, position, onAdd, onClose }: Props) {
  const action: Tranche['action'] = position?.type === 'short' ? 'Short' : 'Buy';
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [shares, setShares] = useState('');
  const [fillPrice, setFillPrice] = useState('');
  const [stopPrice, setStopPrice] = useState('');

  if (!isOpen || !position) return null;

  const isEntry = true; // tranche form is entry-only; exits are handled via Close Position

  // Only entry actions
  const entryAction = position.type === 'long' ? 'Buy' : 'Short';

  const sharesNum = parseFloat(shares);
  const fillNum   = parseFloat(fillPrice);
  const stopNum   = parseFloat(stopPrice);

  // Preview blended avg after adding this tranche
  const preview = (() => {
    if (!sharesNum || !fillNum || isNaN(sharesNum) || isNaN(fillNum)) return null;
    const totalCost = position.entryPrice * position.shares + sharesNum * fillNum;
    const totalShares = position.shares + sharesNum;
    return { newAvg: totalCost / totalShares, newShares: totalShares };
  })();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sharesNum || !fillNum || isNaN(sharesNum) || isNaN(fillNum)) {
      alert('Please enter shares and fill price.');
      return;
    }

    const tranche: Tranche = {
      id: uuidv4(),
      account: '',
      referenceNumber: '',
      action,
      date,
      shares: sharesNum,
      fillPrice: fillNum,
      stopPrice: isEntry && stopNum > 0 ? stopNum : undefined,
    };

    onAdd(position.id, tranche, isEntry && stopNum > 0 ? stopNum : undefined);

    // Reset
    setShares('');
    setFillPrice('');
    setStopPrice('');
    setDate(new Date().toISOString().split('T')[0]);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-md border border-gray-700">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">
            Add Tranche — <span className="text-blue-400">{position.ticker}</span>
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none">✕</button>
        </div>

        <div className="bg-gray-700 rounded-lg p-3 mb-4 text-sm">
          <p className="text-gray-400">Current position</p>
          <p className="text-white font-semibold">
            {position.shares} shares @ ${position.entryPrice.toFixed(4)} avg · Stop ${position.stopPrice.toFixed(2)}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-1 text-gray-300">Action</label>
            <div className="px-3 py-2 bg-green-900/40 border border-green-700 rounded-lg text-green-300 text-sm font-semibold">
              {entryAction} — scale into position
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1 text-gray-300">Date</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1 text-gray-300">Shares</label>
              <input
                type="number"
                value={shares}
                onChange={e => setShares(e.target.value)}
                placeholder="0"
                step="1"
                min="0"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1 text-gray-300">Fill Price</label>
              <input
                type="number"
                value={fillPrice}
                onChange={e => setFillPrice(e.target.value)}
                placeholder="0.00"
                step="0.0001"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {isEntry && (
              <div>
                <label className="block text-sm font-semibold mb-1 text-gray-300">
                  New Stop Price <span className="text-gray-500 font-normal">(optional)</span>
                </label>
                <input
                  type="number"
                  value={stopPrice}
                  onChange={e => setStopPrice(e.target.value)}
                  placeholder={position.stopPrice.toFixed(2)}
                  step="0.01"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
          </div>

          {preview && (
            <div className="bg-gray-700/50 border border-gray-600 rounded-lg p-3 text-sm">
              <p className="text-gray-400 mb-1">After this tranche</p>
              <p className="text-white">
                <span className="text-gray-400">Shares: </span>
                <span className="font-semibold">{preview.newShares.toFixed(4)}</span>
                <span className="text-gray-400 ml-4">Blended avg: </span>
                <span className="font-semibold">${preview.newAvg.toFixed(4)}</span>
              </p>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition font-semibold"
            >
              Add Tranche
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-700 text-gray-200 py-2 rounded-lg hover:bg-gray-600 transition"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
