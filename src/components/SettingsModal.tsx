import { useState } from 'react';

type SettingsModalProps = {
  initialEquity: number;
  isOpen: boolean;
  onSave: (equity: number) => void;
};

export function SettingsModal({ initialEquity, isOpen, onSave }: SettingsModalProps) {
  const [equity, setEquity] = useState(initialEquity.toString());

  const handleSave = () => {
    const value = parseFloat(equity);
    if (value > 0) {
      onSave(value);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-lg p-6 w-96 border border-gray-700">
        <h2 className="text-2xl font-bold mb-4 text-white">Initial Equity Setup</h2>
        <input
          type="number"
          value={equity}
          onChange={e => setEquity(e.target.value)}
          placeholder="Enter initial equity"
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition font-semibold"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
