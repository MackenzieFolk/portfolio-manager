import { useState, useEffect } from 'react';

type SettingsModalProps = {
  initialEquity: number;
  initialEquityDate?: string;
  currency: 'USD' | 'CAD';
  usdCadRate: number;
  isOpen: boolean;
  onSave: (equity: number, currency: 'USD' | 'CAD', date: string) => void;
  onClose: () => void;
  onClearAll: () => void;
};

export function SettingsModal({ initialEquity, initialEquityDate, currency, usdCadRate, isOpen, onSave, onClose, onClearAll }: SettingsModalProps) {
  const [equity, setEquity] = useState(initialEquity.toString());
  const [selectedCurrency, setSelectedCurrency] = useState<'USD' | 'CAD'>(currency);
  const [equityDate, setEquityDate] = useState(initialEquityDate ?? new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (isOpen) {
      setEquity(initialEquity > 0 ? initialEquity.toString() : '');
      setSelectedCurrency(currency);
      setEquityDate(initialEquityDate ?? new Date().toISOString().split('T')[0]);
    }
  }, [isOpen, initialEquity, initialEquityDate, currency]);

  const handleSave = () => {
    const value = parseFloat(equity);
    if (value > 0) {
      onSave(value, selectedCurrency, equityDate);
    }
  };

  const handleClearAll = () => {
    if (window.confirm('Clear ALL data? This will permanently delete all positions, trades, and settings.')) {
      onClearAll();
      setEquity('');
      // Stay open so user is immediately prompted to enter new initial equity
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-lg p-6 w-96 border border-gray-700">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-white">Settings</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none">✕</button>
        </div>

        <label className="block text-sm font-semibold mb-1 text-gray-300">Portfolio Currency</label>
        <div className="flex gap-2 mb-4">
          {(['USD', 'CAD'] as const).map(c => (
            <button
              key={c}
              type="button"
              onClick={() => {
                if (c === selectedCurrency) return;
                // Auto-convert the equity field to the new currency using live rate
                const val = parseFloat(equity);
                if (!isNaN(val) && val > 0 && usdCadRate > 0) {
                  if (selectedCurrency === 'USD' && c === 'CAD') {
                    setEquity((val * usdCadRate).toFixed(2));
                  } else if (selectedCurrency === 'CAD' && c === 'USD') {
                    setEquity((val / usdCadRate).toFixed(2));
                  }
                }
                setSelectedCurrency(c);
              }}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${
                selectedCurrency === c
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        {selectedCurrency === 'CAD' && usdCadRate > 0 && (
          <p className="text-gray-500 text-xs mb-3">
            Live rate: 1 USD = {usdCadRate.toFixed(4)} CAD
          </p>
        )}

        <label className="block text-sm font-semibold mb-1 text-gray-300">Initial Equity Date</label>
        <input
          type="date"
          value={equityDate}
          onChange={e => setEquityDate(e.target.value)}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <label className="block text-sm font-semibold mb-1 text-gray-300">Initial Equity ({selectedCurrency})</label>
        <input
          type="number"
          value={equity}
          onChange={e => setEquity(e.target.value)}
          placeholder={`Enter initial equity in ${selectedCurrency}`}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="flex gap-2 mb-6">
          <button
            onClick={handleSave}
            className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition font-semibold"
          >
            Save
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-gray-700 text-gray-200 py-2 rounded-lg hover:bg-gray-600 transition"
          >
            Cancel
          </button>
        </div>

        <div className="border-t border-gray-700 pt-4">
          <p className="text-xs text-gray-500 mb-2">Danger zone</p>
          <button
            onClick={handleClearAll}
            className="w-full bg-red-900/40 border border-red-700 text-red-400 py-2 rounded-lg hover:bg-red-900/70 transition text-sm font-semibold"
          >
            Clear All Data
          </button>
        </div>
      </div>
    </div>
  );
}
