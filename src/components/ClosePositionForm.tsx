import React, { useState, useRef } from 'react';
import { calculateClosedTradeMetrics } from '../utils/calculations';
import { parseExitFillsForTicker, ExitFillSummary } from '../utils/csvImport';
import { Position, ClosedTrade } from '../types';

type ClosePositionFormProps = {
  isOpen: boolean;
  position: Position | null;
  initialEquity: number;
  onClose: (exitPrice: number, exitDate: string, exitReason?: string, shares?: number) => void;
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
  const [shares, setShares] = useState('');
  const [csvFills, setCsvFills] = useState<ExitFillSummary | null>(null);
  const [csvError, setCsvError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setExitPrice('');
    setExitDate(new Date().toISOString().split('T')[0]);
    setExitReason('');
    setShares('');
    setCsvFills(null);
    setCsvError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!exitPrice) { alert('Please enter exit price'); return; }
    const sharesNum = parseFloat(shares);
    onClose(parseFloat(exitPrice), exitDate, exitReason, sharesNum > 0 ? sharesNum : undefined);
    reset();
  };

  const handleCsvFile = (file: File) => {
    if (!position) return;
    setCsvError('');
    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target?.result as string;
      const result = parseExitFillsForTicker(text, position.ticker, position.type);
      if (!result) {
        setCsvError(`No ${position.type === 'long' ? 'Sell' : 'Cover/Buy'} fills found for ${position.ticker} in this CSV.`);
        setCsvFills(null);
      } else {
        setCsvFills(result);
        setExitPrice(result.exitPrice.toString());
        setExitDate(result.exitDate);
        setShares(result.totalShares.toString());
      }
    };
    reader.readAsText(file);
  };

  if (!isOpen || !position) return null;

  const sharesNum = parseFloat(shares);
  const exitedShares = sharesNum > 0 && sharesNum < position.shares ? sharesNum : position.shares;
  const isPartial = exitedShares < position.shares;

  const closedTrade: ClosedTrade = {
    ...position,
    shares: exitedShares,
    exitPrice: parseFloat(exitPrice) || 0,
    exitDate,
    exitReason,
  };

  const metrics = parseFloat(exitPrice) > 0 ? calculateClosedTradeMetrics(closedTrade, initialEquity) : null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-2xl max-h-screen overflow-y-auto border border-gray-700">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-white">Close Position: {position.ticker}</h2>
          <button onClick={() => { reset(); onCancel(); }} className="text-gray-400 hover:text-white text-2xl leading-none">✕</button>
        </div>

        {/* CSV upload */}
        <div className="mb-4">
          <div
            className="border border-dashed border-gray-600 hover:border-gray-400 rounded-lg px-4 py-3 flex items-center justify-between cursor-pointer transition"
            onClick={() => fileRef.current?.click()}
          >
            <span className="text-gray-400 text-sm">
              {csvFills ? `✓ CSV loaded — ${csvFills.fills.length} fill(s) found for ${position.ticker}` : 'Upload order CSV to auto-fill exit price & date'}
            </span>
            <span className="text-gray-500 text-xs">click to browse</span>
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={e => { if (e.target.files?.[0]) handleCsvFile(e.target.files[0]); }}
            />
          </div>
          {csvError && <p className="text-red-400 text-xs mt-1">{csvError}</p>}

          {csvFills && (
            <div className="mt-2 bg-gray-900/50 border border-gray-700 rounded-lg p-3 text-xs">
              <table className="w-full">
                <thead>
                  <tr className="text-gray-500">
                    <th className="text-left py-0.5">Date</th>
                    <th className="text-left py-0.5">Action</th>
                    <th className="text-right py-0.5">Shares</th>
                    <th className="text-right py-0.5">Fill Price</th>
                  </tr>
                </thead>
                <tbody>
                  {csvFills.fills.map((f, i) => (
                    <tr key={i} className="text-gray-300">
                      <td className="py-0.5">{f.date}</td>
                      <td className="py-0.5">{f.action}</td>
                      <td className="text-right py-0.5">{f.shares}</td>
                      <td className="text-right py-0.5">${f.fillPrice.toFixed(4)}</td>
                    </tr>
                  ))}
                  {csvFills.fills.length > 1 && (
                    <tr className="text-blue-400 border-t border-gray-700 font-semibold">
                      <td colSpan={2} className="pt-1">Blended avg</td>
                      <td className="text-right pt-1">{csvFills.totalShares}</td>
                      <td className="text-right pt-1">${csvFills.exitPrice.toFixed(4)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1 text-gray-300">
                Shares <span className="text-gray-500 font-normal">(blank = all {position.shares})</span>
              </label>
              <input
                type="number"
                value={shares}
                onChange={e => setShares(e.target.value)}
                placeholder={String(position.shares)}
                step="1"
                min="0"
                max={position.shares}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1 text-gray-300">Exit Price</label>
              <input
                type="number"
                value={exitPrice}
                onChange={e => setExitPrice(e.target.value)}
                placeholder="0.00"
                step="0.0001"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          {isPartial && (
            <p className="text-yellow-400 text-xs">
              Partial exit: closing {exitedShares} of {position.shares} shares. {Math.round((position.shares - exitedShares) * 10000) / 10000} shares will remain open.
            </p>
          )}

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

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              className="flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition font-semibold"
            >
              Close Position
            </button>
            <button
              type="button"
              onClick={() => { reset(); onCancel(); }}
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
