import React, { useState, useRef } from 'react';
import { parsePositionsCsv, parseOrdersCsv, isOrdersCsv, CsvImportResult, OrderImportResult } from '../utils/csvImport';
import { Position, Tranche } from '../types';

type EditableTranche = Tranche & { stopInput: string };

type EditablePosition = Omit<Position, 'id'> & {
  stopInput: string;
  editableTranches?: EditableTranche[];
};

function isEntry(action: Tranche['action']) {
  return action === 'Buy' || action === 'Short';
}

function blendedStop(tranches: EditableTranche[]): number {
  const entries = tranches.filter(t => isEntry(t.action));
  const totalShares = entries.reduce((s, t) => s + t.shares, 0);
  if (totalShares === 0) return 0;
  const weighted = entries.reduce((s, t) => s + (t.stopPrice ?? 0) * t.shares, 0);
  return weighted / totalShares;
}

type Props = {
  isOpen: boolean;
  defaultCurrency?: 'USD' | 'CAD';
  onImport: (positions: Omit<Position, 'id'>[]) => void;
  onClose: () => void;
};

export function CsvImportModal({ isOpen, defaultCurrency = 'USD', onImport, onClose }: Props) {
  const [warnings, setWarnings] = useState<string[]>([]);
  const [positions, setPositions] = useState<EditablePosition[] | null>(null);
  const [dragging, setDragging] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  const toggleRow = (i: number) =>
    setExpandedRows(prev => ({ ...prev, [i]: !prev[i] }));

  const processResults = (results: (CsvImportResult | OrderImportResult)[]) => {
    const allPositions = results.flatMap(r => r.positions);
    const allWarnings = results.flatMap(r => r.warnings);
    setWarnings(allWarnings);
    const mapped = allPositions.map(p => {
      const base = { ...p, currency: p.currency ?? defaultCurrency };
      if (p.tranches && p.tranches.length > 0) {
        const editableTranches: EditableTranche[] = p.tranches.map(t => ({
          ...t,
          stopInput: '',
          stopPrice: undefined,
        }));
        return { ...base, stopPrice: 0, stopInput: '', editableTranches };
      }
      return { ...base, stopPrice: 0, stopInput: '' };
    });
    setPositions(mapped);
    // default all multi-tranche positions to expanded
    const expanded: Record<number, boolean> = {};
    mapped.forEach((p, i) => { if ('editableTranches' in p && p.editableTranches) expanded[i] = true; });
    setExpandedRows(expanded);
  };

  const handleFiles = (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const readers = fileArray.map(file =>
      new Promise<CsvImportResult | OrderImportResult>(resolve => {
        const reader = new FileReader();
        reader.onload = e => {
          const text = e.target?.result as string;
          resolve(isOrdersCsv(text) ? parseOrdersCsv(text) : parsePositionsCsv(text));
        };
        reader.readAsText(file);
      })
    );
    Promise.all(readers).then(processResults);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
  };

  // For positions without tranches: single stop input
  const updateStop = (index: number, value: string) => {
    setPositions(prev =>
      prev!.map((p, i) =>
        i === index ? { ...p, stopInput: value, stopPrice: parseFloat(value) || 0 } : p
      )
    );
  };

  // For positions with tranches: per-tranche stop input
  const updateTrancheStop = (posIndex: number, trancheId: string, value: string) => {
    setPositions(prev =>
      prev!.map((p, i) => {
        if (i !== posIndex || !p.editableTranches) return p;
        const updated = p.editableTranches.map(t =>
          t.id === trancheId
            ? { ...t, stopInput: value, stopPrice: parseFloat(value) || 0 }
            : t
        );
        const stop = blendedStop(updated);
        return { ...p, editableTranches: updated, stopPrice: stop, stopInput: String(stop) };
      })
    );
  };

  const updateDate = (index: number, value: string) => {
    setPositions(prev =>
      prev!.map((p, i) => i === index ? { ...p, entryDate: value } : p)
    );
  };

  const removePosition = (index: number) => {
    setPositions(prev => prev!.filter((_, i) => i !== index));
  };

  const removeTranche = (posIndex: number, trancheId: string) => {
    setPositions(prev => {
      const updated = prev!.map((p, i) => {
        if (i !== posIndex || !p.editableTranches) return p;
        const remaining = p.editableTranches.filter(t => t.id !== trancheId);
        const entryRemaining = remaining.filter(t => isEntry(t.action));
        if (entryRemaining.length === 0) return null; // signal removal
        // Recalculate shares and blended avg from remaining entries
        const totalShares = entryRemaining.reduce((s, t) => s + t.shares, 0);
        const totalCost = entryRemaining.reduce((s, t) => s + t.shares * t.fillPrice, 0);
        const newStop = blendedStop(remaining);
        return {
          ...p,
          shares: Math.round(totalShares * 10000) / 10000,
          entryPrice: Math.round((totalCost / totalShares) * 10000) / 10000,
          editableTranches: remaining,
          stopPrice: newStop,
          stopInput: newStop > 0 ? String(newStop) : '',
        };
      });
      return updated.filter(Boolean) as EditablePosition[];
    });
  };

  const handleConfirm = () => {
    if (!positions) return;

    // Validate stops
    const missing: string[] = [];
    for (const p of positions) {
      if (p.editableTranches) {
        const entries = p.editableTranches.filter(t => isEntry(t.action));
        if (entries.some(t => !t.stopPrice || t.stopPrice <= 0)) {
          missing.push(p.ticker);
        }
      } else {
        if (!p.stopPrice || p.stopPrice <= 0) missing.push(p.ticker);
      }
    }

    if (missing.length > 0) {
      alert(`Please enter all stop prices for: ${missing.join(', ')}`);
      return;
    }

    const toImport = positions.map(({ stopInput: _s, editableTranches, ...p }) => ({
      ...p,
      tranches: editableTranches
        ? editableTranches.map(({ stopInput: _si, ...t }) => t)
        : p.tranches,
    }));

    onImport(toImport);
    setPositions(null);
    setWarnings([]);
    onClose();
  };

  const handleClose = () => {
    setPositions(null);
    setWarnings([]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-lg p-6 w-full max-w-5xl mx-4 max-h-[90vh] overflow-y-auto border border-gray-700">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-white">Import Positions from CSV</h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-white text-2xl leading-none" title="Close">✕</button>
        </div>

        {!positions ? (
          <>
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition ${
                dragging ? 'border-blue-400 bg-blue-900/20' : 'border-gray-600 hover:border-gray-400'
              }`}
            >
              <p className="text-gray-300 text-lg mb-1">Drop one or more CSV files here</p>
              <p className="text-gray-500 text-sm">or click to browse — you can select multiple files at once</p>
              <input
                ref={fileRef}
                type="file"
                accept=".csv"
                multiple
                className="hidden"
                onChange={e => { if (e.target.files?.length) handleFiles(e.target.files); }}
              />
            </div>
            <p className="text-gray-500 text-xs mt-3">
              Supports TD Direct Investing holdings exports and filled order history CSVs. Auto-detected.
            </p>
            <div className="mt-4 flex justify-end">
              <button onClick={handleClose} className="bg-gray-700 text-gray-200 px-4 py-2 rounded-lg hover:bg-gray-600 transition text-sm">
                Cancel
              </button>
            </div>
          </>
        ) : (
          <>
            {warnings.length > 0 && (
              <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-3 mb-4">
                {warnings.map((w, i) => (
                  <p key={i} className="text-yellow-300 text-xs">{w}</p>
                ))}
              </div>
            )}

            {positions.length === 0 ? (
              <p className="text-red-400 text-sm mb-4">No open positions found in the CSV files.</p>
            ) : (
              <>
                <p className="text-blue-300 text-sm mb-3 font-semibold">
                  Enter a stop price for each position (or each tranche) and confirm the entry date.
                </p>
                <div className="overflow-x-auto mb-4">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-700">
                      <tr>
                        <th className="px-3 py-2 text-left text-gray-200">Ticker</th>
                        <th className="px-3 py-2 text-left text-gray-200">Type</th>
                        <th className="px-3 py-2 text-right text-gray-200">Shares</th>
                        <th className="px-3 py-2 text-right text-gray-200">Fill / Avg Price</th>
                        <th className="px-3 py-2 text-right text-gray-200">Last Price</th>
                        <th className="px-3 py-2 text-right text-gray-200 bg-blue-900/30">Stop Price *</th>
                        <th className="px-3 py-2 text-left text-gray-200 bg-blue-900/30">Entry Date *</th>
                        <th className="px-3 py-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {positions.map((p, i) => {
                        const hasTranches = p.editableTranches && p.editableTranches.length > 0;
                        const isExpanded = !!expandedRows[i];
                        const entryTranches = hasTranches
                          ? p.editableTranches!.filter(t => isEntry(t.action))
                          : [];
                        const allTrancheStopsFilled = entryTranches.every(t => t.stopPrice && t.stopPrice > 0);

                        return hasTranches ? (
                          <React.Fragment key={`pos-group-${i}`}>
                            {/* Position summary row — click ticker to expand/collapse tranches */}
                            <tr className="border-t-2 border-gray-600 bg-gray-750">
                              <td
                                className="px-3 py-2 font-bold text-white cursor-pointer select-none hover:text-blue-300 transition-colors"
                                onClick={() => toggleRow(i)}
                              >
                                <span className="flex items-center gap-1">
                                  <span className="text-gray-500 text-xs">{isExpanded ? '▼' : '▶'}</span>
                                  {p.ticker}
                                </span>
                              </td>
                              <td className="px-3 py-2">
                                <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                  p.type === 'long' ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'
                                }`}>{p.type.toUpperCase()}</span>
                              </td>
                              <td className="px-3 py-2 text-right text-gray-300">{p.shares}</td>
                              <td className="px-3 py-2 text-right text-gray-400 text-xs">
                                Blended avg: ${p.entryPrice.toFixed(4)}
                              </td>
                              <td className="px-3 py-2 text-right text-gray-300">
                                {p.lastPrice ? `$${p.lastPrice.toFixed(2)}` : '—'}
                              </td>
                              <td className="px-3 py-2 text-right bg-blue-900/10">
                                {allTrancheStopsFilled ? (
                                  <span className="text-green-400 text-xs">
                                    Blended: ${blendedStop(p.editableTranches!).toFixed(2)}
                                  </span>
                                ) : (
                                  <span className="text-gray-500 text-xs italic">see tranches ↓</span>
                                )}
                              </td>
                              <td className="px-3 py-2 bg-blue-900/10">
                                <input
                                  type="date"
                                  value={p.entryDate}
                                  onChange={e => updateDate(i, e.target.value)}
                                  className="px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </td>
                              <td className="px-2 py-2 text-center">
                                <button onClick={() => removePosition(i)} title="Remove position" className="text-gray-500 hover:text-red-400 transition text-base font-bold">✕</button>
                              </td>
                            </tr>
                            {/* Per-entry-tranche stop rows — only when expanded */}
                            {isExpanded && p.editableTranches!.map(t => {
                              if (!isEntry(t.action)) return null;
                              const filled = t.stopPrice && t.stopPrice > 0;
                              return (
                                <tr key={t.id} className="border-t border-gray-700 bg-gray-900/60">
                                  <td className="px-3 py-1.5 pl-8 text-gray-400 text-xs">↳ {t.action}</td>
                                  <td className="px-3 py-1.5 text-gray-500 text-xs">{t.date}</td>
                                  <td className="px-3 py-1.5 text-right text-gray-400 text-xs">{t.shares}</td>
                                  <td className="px-3 py-1.5 text-right text-gray-400 text-xs">${t.fillPrice.toFixed(4)}</td>
                                  <td />
                                  <td className="px-3 py-1.5 text-right bg-blue-900/10">
                                    <input
                                      type="number"
                                      step="0.01"
                                      value={t.stopInput}
                                      onChange={e => updateTrancheStop(i, t.id, e.target.value)}
                                      placeholder="Required"
                                      className={`w-24 px-2 py-1 rounded text-white text-right text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                        filled
                                          ? 'bg-gray-600 border border-gray-500'
                                          : 'bg-red-900/30 border border-red-600'
                                      }`}
                                    />
                                  </td>
                                  <td className="bg-blue-900/10" />
                                  <td className="px-2 py-1.5 text-center">
                                    <button onClick={() => removeTranche(i, t.id)} title="Remove tranche" className="text-gray-500 hover:text-red-400 transition text-xs font-bold">✕</button>
                                  </td>
                                </tr>
                              );
                            })}
                          </React.Fragment>
                        ) : (
                          <tr key={`pos-${i}`} className="border-t border-gray-700">
                            <td className="px-3 py-2 font-semibold text-white">{p.ticker}</td>
                            <td className="px-3 py-2">
                              <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                                p.type === 'long' ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'
                              }`}>{p.type.toUpperCase()}</span>
                            </td>
                            <td className="px-3 py-2 text-right text-gray-300">{p.shares}</td>
                            <td className="px-3 py-2 text-right text-gray-300">${p.entryPrice.toFixed(4)}</td>
                            <td className="px-3 py-2 text-right text-gray-300">
                              {p.lastPrice ? `$${p.lastPrice.toFixed(2)}` : '—'}
                            </td>
                            <td className="px-3 py-2 text-right bg-blue-900/10">
                              <input
                                type="number"
                                step="0.01"
                                value={p.stopInput}
                                onChange={e => updateStop(i, e.target.value)}
                                placeholder="Required"
                                className={`w-24 px-2 py-1 rounded text-white text-right text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                  p.stopInput && p.stopPrice > 0
                                    ? 'bg-gray-600 border border-gray-500'
                                    : 'bg-red-900/30 border border-red-600'
                                }`}
                              />
                            </td>
                            <td className="px-3 py-2 bg-blue-900/10">
                              <input
                                type="date"
                                value={p.entryDate}
                                onChange={e => updateDate(i, e.target.value)}
                                className="px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </td>
                            <td className="px-2 py-2 text-center">
                              <button onClick={() => removePosition(i)} title="Remove position" className="text-gray-500 hover:text-red-400 transition text-base font-bold">✕</button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            <div className="flex gap-2">
              {positions.length > 0 && (
                <button
                  onClick={handleConfirm}
                  className="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition font-semibold"
                >
                  Import {positions.length} Position{positions.length !== 1 ? 's' : ''}
                </button>
              )}
              <button
                onClick={() => { setPositions(null); setWarnings([]); }}
                className="flex-1 bg-gray-700 text-gray-200 py-2 rounded-lg hover:bg-gray-600 transition"
              >
                Choose Different Files
              </button>
              <button
                onClick={handleClose}
                className="flex-1 bg-gray-700 text-gray-200 py-2 rounded-lg hover:bg-gray-600 transition"
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
