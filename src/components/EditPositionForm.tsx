import { useState, useEffect } from 'react';
import { calculatePositionMetrics, calculateTotalEquity } from '../utils/calculations';
import { Position, Tranche } from '../types';

type EditableTranche = Tranche & {
  sharesInput: string;
  fillPriceInput: string;
  stopPriceInput: string;
};

type EditPositionFormProps = {
  isOpen: boolean;
  position: Position | null;
  cash: number;
  positions: Position[];
  onSave: (positionId: string, updates: Omit<Position, 'id'>) => void;
  onClose: () => void;
};

function isEntry(action: Tranche['action']) {
  return action === 'Buy' || action === 'Short';
}

function recalcFromTranches(tranches: EditableTranche[]): { shares: number; entryPrice: number } {
  const entries = tranches.filter(t => isEntry(t.action));
  const exits   = tranches.filter(t => !isEntry(t.action));
  const entryShares = entries.reduce((s, t) => s + (parseFloat(t.sharesInput) || 0), 0);
  const exitShares  = exits.reduce((s, t) => s + (parseFloat(t.sharesInput) || 0), 0);
  const openShares  = Math.max(0, entryShares - exitShares);
  const totalCost   = entries.reduce((s, t) => s + (parseFloat(t.sharesInput) || 0) * (parseFloat(t.fillPriceInput) || 0), 0);
  const entryPrice  = entryShares > 0 ? totalCost / entryShares : 0;
  return { shares: Math.round(openShares * 10000) / 10000, entryPrice: Math.round(entryPrice * 10000) / 10000 };
}

export function EditPositionForm({
  isOpen,
  position,
  cash,
  positions,
  onSave,
  onClose,
}: EditPositionFormProps) {
  const [ticker, setTicker] = useState('');
  const [entryDate, setEntryDate] = useState('');
  const [type, setType] = useState<'long' | 'short'>('long');
  const [shares, setShares] = useState('');
  const [entryPrice, setEntryPrice] = useState('');
  const [stopPrice, setStopPrice] = useState('');
  const [entryReason, setEntryReason] = useState('');
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState('');
  const [editableTranches, setEditableTranches] = useState<EditableTranche[]>([]);

  useEffect(() => {
    if (position) {
      setTicker(position.ticker);
      setEntryDate(position.entryDate);
      setType(position.type);
      setShares(String(position.shares));
      setEntryPrice(String(position.entryPrice));
      setStopPrice(String(position.stopPrice));
      setEntryReason(position.entryReason ?? '');
      setNotes(position.notes ?? '');
      setTags((position.tags ?? []).join(', '));
      setEditableTranches(
        (position.tranches ?? []).map(t => ({
          ...t,
          sharesInput: String(t.shares),
          fillPriceInput: String(t.fillPrice),
          stopPriceInput: String(t.stopPrice ?? ''),
        }))
      );
    }
  }, [position]);

  const hasTranches = editableTranches.length > 0;

  // When tranches exist, derive shares + entryPrice from them
  const derived = hasTranches ? recalcFromTranches(editableTranches) : null;
  const displayShares     = derived ? String(derived.shares)     : shares;
  const displayEntryPrice = derived ? String(derived.entryPrice) : entryPrice;

  const updateTranche = (id: string, field: Partial<EditableTranche>) => {
    setEditableTranches(prev => prev.map(t => t.id === id ? { ...t, ...field } : t));
  };

  const removeTranche = (id: string) => {
    setEditableTranches(prev => prev.filter(t => t.id !== id));
  };

  const otherPositions = positions.filter(p => p.id !== position?.id);
  const totalEquity = calculateTotalEquity(otherPositions, cash);

  const sharesNum     = parseFloat(displayShares);
  const entryPriceNum = parseFloat(displayEntryPrice);
  const stopNum       = parseFloat(stopPrice);

  const preview = sharesNum > 0 && entryPriceNum > 0 && stopNum > 0
    ? calculatePositionMetrics(
        { id: 'temp', ticker, entryDate, type, shares: sharesNum, entryPrice: entryPriceNum, stopPrice: stopNum },
        totalEquity
      )
    : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!position) return;

    const finalShares     = parseFloat(displayShares);
    const finalEntryPrice = parseFloat(displayEntryPrice);
    const finalStop       = parseFloat(stopPrice);

    if (!ticker || !finalShares || !finalEntryPrice || !finalStop) {
      alert('Please fill in all required fields');
      return;
    }

    const finalTranches: Tranche[] | undefined = hasTranches
      ? editableTranches.map(({ sharesInput, fillPriceInput, stopPriceInput, ...t }) => ({
          ...t,
          shares: parseFloat(sharesInput) || t.shares,
          fillPrice: parseFloat(fillPriceInput) || t.fillPrice,
          stopPrice: parseFloat(stopPriceInput) || undefined,
        }))
      : position.tranches;

    onSave(position.id, {
      ticker: ticker.toUpperCase(),
      entryDate,
      type,
      shares: finalShares,
      entryPrice: finalEntryPrice,
      stopPrice: finalStop,
      entryReason,
      notes,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      lastPrice: position.lastPrice,
      tranches: finalTranches,
    });
    onClose();
  };

  if (!isOpen || !position) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-3xl max-h-screen overflow-y-auto border border-gray-700">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-white">Edit Position — {position.ticker}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Tranche editor */}
          {hasTranches && (
            <div>
              <h3 className="text-sm font-semibold text-gray-300 mb-2">Tranches</h3>
              <div className="overflow-x-auto rounded-lg border border-gray-700">
                <table className="w-full text-sm">
                  <thead className="bg-gray-700">
                    <tr>
                      <th className="px-3 py-2 text-left text-gray-300">Action</th>
                      <th className="px-3 py-2 text-left text-gray-300">Date</th>
                      <th className="px-3 py-2 text-right text-gray-300">Shares</th>
                      <th className="px-3 py-2 text-right text-gray-300">Fill Price</th>
                      <th className="px-3 py-2 text-right text-gray-300">Stop Price</th>
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {editableTranches.map(t => (
                      <tr key={t.id} className="border-t border-gray-700">
                        <td className="px-3 py-2">
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                            isEntry(t.action) ? 'bg-green-900 text-green-300' : 'bg-orange-900 text-orange-300'
                          }`}>
                            {t.action}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="date"
                            value={t.date}
                            onChange={e => updateTranche(t.id, { date: e.target.value })}
                            className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            step="0.0001"
                            value={t.sharesInput}
                            onChange={e => updateTranche(t.id, { sharesInput: e.target.value })}
                            className="w-24 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-right text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            step="0.0001"
                            value={t.fillPriceInput}
                            onChange={e => updateTranche(t.id, { fillPriceInput: e.target.value })}
                            className="w-28 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-right text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-3 py-2">
                          {isEntry(t.action) ? (
                            <input
                              type="number"
                              step="0.01"
                              value={t.stopPriceInput}
                              onChange={e => updateTranche(t.id, { stopPriceInput: e.target.value })}
                              placeholder="—"
                              className="w-24 px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-right text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          ) : (
                            <span className="text-gray-600 text-xs px-3">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => removeTranche(t.id)}
                            className="text-gray-500 hover:text-red-400 transition font-bold"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-gray-500 text-xs mt-1">
                Shares and entry price are recalculated from tranches automatically.
              </p>
            </div>
          )}

          {/* Position-level fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1 text-gray-300">Ticker</label>
              <input
                type="text"
                value={ticker}
                onChange={e => setTicker(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              <label className="block text-sm font-semibold mb-1 text-gray-300">Stop Price</label>
              <input
                type="number"
                value={stopPrice}
                onChange={e => setStopPrice(e.target.value)}
                step="0.01"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1 text-gray-300">
                Shares {hasTranches && <span className="text-gray-500 font-normal">(from tranches)</span>}
              </label>
              <input
                type="number"
                value={displayShares}
                onChange={e => !hasTranches && setShares(e.target.value)}
                readOnly={hasTranches}
                step="0.0001"
                className={`w-full px-3 py-2 border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  hasTranches ? 'bg-gray-900 border-gray-700 text-gray-400 cursor-not-allowed' : 'bg-gray-700 border-gray-600'
                }`}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1 text-gray-300">
                Entry Price {hasTranches && <span className="text-gray-500 font-normal">(blended from tranches)</span>}
              </label>
              <input
                type="number"
                value={displayEntryPrice}
                onChange={e => !hasTranches && setEntryPrice(e.target.value)}
                readOnly={hasTranches}
                step="0.0001"
                className={`w-full px-3 py-2 border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  hasTranches ? 'bg-gray-900 border-gray-700 text-gray-400 cursor-not-allowed' : 'bg-gray-700 border-gray-600'
                }`}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1 text-gray-300">Entry Reason</label>
            <textarea
              value={entryReason}
              onChange={e => setEntryReason(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 h-20"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1 text-gray-300">Tags</label>
            <input
              type="text"
              value={tags}
              onChange={e => setTags(e.target.value)}
              placeholder="e.g. breakout, momentum, earnings"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1 text-gray-300">Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 h-16"
            />
          </div>

          {preview && (
            <div className="bg-gray-700 p-4 rounded-lg border border-blue-600">
              <h3 className="font-semibold mb-2 text-white">Preview</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                <div><p className="text-gray-400">Book Cost</p><p className="font-semibold text-white">${preview.bookCost.toFixed(2)}</p></div>
                <div><p className="text-gray-400">Risk $</p><p className="font-semibold text-red-400">${preview.initialRiskDollar.toFixed(2)}</p></div>
                <div><p className="text-gray-400">Risk %</p><p className="font-semibold text-gray-300">{preview.initialRiskPercent.toFixed(2)}%</p></div>
                <div><p className="text-gray-400">Risk % of Eq</p><p className="font-semibold text-gray-300">{preview.riskPercentOfEquity.toFixed(2)}%</p></div>
                <div><p className="text-gray-400">2R</p><p className="font-semibold text-white">${preview.targets.r2.toFixed(2)}</p></div>
                <div><p className="text-gray-400">3R</p><p className="font-semibold text-white">${preview.targets.r3.toFixed(2)}</p></div>
                <div><p className="text-gray-400">4R</p><p className="font-semibold text-white">${preview.targets.r4.toFixed(2)}</p></div>
                <div><p className="text-gray-400">5R</p><p className="font-semibold text-white">${preview.targets.r5.toFixed(2)}</p></div>
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition font-semibold"
            >
              Save Changes
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
