import React, { useState, useEffect, useRef, useCallback } from 'react';
import { calculatePositionMetrics, calculateOpenGain, calculateDaysHeld, calculateOpenRMultiple } from '../utils/calculations';
import { fetchQuote } from '../utils/fetchQuote';
import { convert, fmt, Currency } from '../utils/currency';
import { Position } from '../types';

type PositionsListProps = {
  positions: Position[];
  cash: number;
  portfolioCurrency: Currency;
  usdCadRate: number;
  onClose: (positionId: string) => void;
  onEdit: (positionId: string) => void;
  onDelete: (positionId: string) => void;
  onUpdateLastPrice: (positionId: string, lastPrice: number | undefined) => void;
  onAddTranche: (positionId: string) => void;
};

export function PositionsList({
  positions,
  cash,
  portfolioCurrency,
  usdCadRate,
  onClose,
  onEdit,
  onDelete,
  onUpdateLastPrice,
  onAddTranche,
}: PositionsListProps) {
  const [editingPrice, setEditingPrice] = useState<Record<string, string>>({});
  const [loadingQuote, setLoadingQuote] = useState<Record<string, boolean>>({});
  const [quoteError, setQuoteError] = useState<Record<string, string>>({});
  const [expandedTranches, setExpandedTranches] = useState<Record<string, boolean>>({});

  // Currency-aware total equity in portfolio currency
  const totalEquity = positions.reduce((sum, pos) => {
    const price = pos.lastPrice ?? pos.entryPrice;
    const posCurrency = pos.currency ?? 'USD';
    const equityContrib = pos.type === 'short'
      ? (2 * pos.entryPrice - price) * pos.shares
      : price * pos.shares;
    return sum + convert(equityContrib, posCurrency, portfolioCurrency, usdCadRate);
  }, cash);

  const toggleTranches = (positionId: string) => {
    setExpandedTranches(prev => ({ ...prev, [positionId]: !prev[positionId] }));
  };

  const refreshQuote = async (positionId: string, ticker: string) => {
    setLoadingQuote(prev => ({ ...prev, [positionId]: true }));
    setQuoteError(prev => ({ ...prev, [positionId]: '' }));
    try {
      const price = await fetchQuote(ticker);
      onUpdateLastPrice(positionId, price);
    } catch (err: any) {
      setQuoteError(prev => ({ ...prev, [positionId]: err.message ?? 'Error' }));
    } finally {
      setLoadingQuote(prev => ({ ...prev, [positionId]: false }));
    }
  };

  const positionsRef = useRef(positions);
  positionsRef.current = positions;

  const refreshAll = useCallback(async () => {
    await Promise.all(positionsRef.current.map(p => refreshQuote(p.id, p.ticker)));
  }, []);

  // Auto-refresh: 15s during US market hours (9:30–16:00 ET Mon–Fri), 6h otherwise
  useEffect(() => {
    if (positions.length === 0) return;

    const isMarketOpen = () => {
      const et = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }));
      const day = et.getDay();
      if (day === 0 || day === 6) return false;
      const mins = et.getHours() * 60 + et.getMinutes();
      return mins >= 9 * 60 + 30 && mins < 16 * 60;
    };

    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timer = setTimeout(async () => {
        await refreshAll();
        schedule();
      }, isMarketOpen() ? 15_000 : 6 * 60 * 60 * 1000);
    };

    schedule();
    return () => clearTimeout(timer);
  }, [positions.length, refreshAll]);

  const handleDelete = (positionId: string, ticker: string) => {
    if (window.confirm(`Delete ${ticker}? This cannot be undone.`)) {
      onDelete(positionId);
    }
  };

  const handleLastPriceChange = (positionId: string, value: string) => {
    setEditingPrice(prev => ({ ...prev, [positionId]: value }));
  };

  const handleLastPriceBlur = (positionId: string, value: string) => {
    const num = parseFloat(value);
    onUpdateLastPrice(positionId, isNaN(num) ? undefined : num);
    setEditingPrice(prev => {
      const next = { ...prev };
      delete next[positionId];
      return next;
    });
  };

  if (positions.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg shadow-md p-6 border border-gray-700">
        <p className="text-gray-400 text-center">No open positions</p>
      </div>
    );
  }

  // Mobile card view
  const mobileCards = (
    <div className="sm:hidden space-y-3 p-3">
      {positions.map(position => {
        const mPosCurrency = position.currency ?? 'USD';
        const metrics = calculatePositionMetrics(position, totalEquity);
        const mBookCostConverted = convert(metrics.bookCost, mPosCurrency, portfolioCurrency, usdCadRate);
        const mRiskConverted = convert(metrics.initialRiskDollar, mPosCurrency, portfolioCurrency, usdCadRate);
        const openGain = calculateOpenGain(position);
        const mOpenGainConverted = openGain !== null
          ? { ...openGain, dollar: convert(openGain.dollar, mPosCurrency, portfolioCurrency, usdCadRate) }
          : null;
        const currentR = calculateOpenRMultiple(position);
        const daysHeld = calculateDaysHeld(position.entryDate);
        return (
          <div key={position.id} className="bg-gray-700 rounded-lg p-4 border border-gray-600">
            <div className="flex justify-between items-start mb-2">
              <div>
                <span className="text-white font-bold text-lg">{position.ticker}</span>
                <span className={`ml-2 px-2 py-0.5 rounded text-xs font-semibold ${
                  position.type === 'long' ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'
                }`}>{position.type.toUpperCase()}</span>
                <span className="ml-1 text-gray-500 text-xs">{mPosCurrency}</span>
              </div>
              <span className="text-gray-400 text-xs">{daysHeld}d held</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm mb-3">
              <div><p className="text-gray-400 text-xs">Entry</p><p className="text-white">{fmt(position.entryPrice, mPosCurrency)}</p></div>
              <div><p className="text-gray-400 text-xs">Stop</p><p className="text-white">{fmt(position.stopPrice, mPosCurrency)}</p></div>
              <div><p className="text-gray-400 text-xs">Last Price</p>
                <input type="number" step="0.01" placeholder="—"
                  value={editingPrice[position.id] !== undefined ? editingPrice[position.id] : position.lastPrice !== undefined ? String(position.lastPrice) : ''}
                  onChange={e => handleLastPriceChange(position.id, e.target.value)}
                  onBlur={e => handleLastPriceBlur(position.id, e.target.value)}
                  className="w-full px-1 py-0.5 bg-gray-600 border border-gray-500 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div><p className="text-gray-400 text-xs">Current R</p>
                <p className={`font-semibold ${currentR === null ? 'text-gray-500' : currentR >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {currentR === null ? '—' : `${currentR >= 0 ? '+' : ''}${currentR.toFixed(2)}R`}
                </p>
              </div>
              <div><p className="text-gray-400 text-xs">Open Gain $</p>
                <p className={`font-semibold ${mOpenGainConverted === null ? 'text-gray-500' : mOpenGainConverted.dollar >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {mOpenGainConverted === null ? '—' : `${mOpenGainConverted.dollar >= 0 ? '+' : ''}${fmt(mOpenGainConverted.dollar, portfolioCurrency)}`}
                </p>
              </div>
              <div><p className="text-gray-400 text-xs">Risk ({portfolioCurrency})</p><p className="text-red-400 font-semibold">{fmt(mRiskConverted, portfolioCurrency)}</p></div>
              <div><p className="text-gray-400 text-xs">Book Cost ({portfolioCurrency})</p><p className="text-white font-semibold">{fmt(mBookCostConverted, portfolioCurrency)}</p></div>
            </div>
            {position.tags && position.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {position.tags.map(tag => <span key={tag} className="bg-gray-600 text-gray-300 px-1.5 py-0.5 rounded text-xs">{tag}</span>)}
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={() => onEdit(position.id)} className="flex-1 bg-blue-600 text-white py-1.5 rounded text-xs hover:bg-blue-700 transition">Edit</button>
              <button onClick={() => onClose(position.id)} className="flex-1 bg-red-600 text-white py-1.5 rounded text-xs hover:bg-red-700 transition">Close</button>
              <button onClick={() => handleDelete(position.id, position.ticker)} className="flex-1 bg-gray-600 text-white py-1.5 rounded text-xs hover:bg-gray-500 transition">Delete</button>
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="bg-gray-800 rounded-lg shadow-md border border-gray-700">
      {mobileCards}
      <div className="hidden sm:block overflow-x-auto">
      <div className="flex justify-end px-4 pt-3 hidden sm:flex">
        <button
          onClick={refreshAll}
          disabled={Object.values(loadingQuote).some(Boolean)}
          className="bg-gray-700 text-gray-200 px-3 py-1 rounded text-xs hover:bg-gray-600 transition disabled:opacity-50"
        >
          {Object.values(loadingQuote).some(Boolean) ? 'Refreshing...' : '↻ Refresh All Prices'}
        </button>
      </div>
      <table className="w-full text-sm">
        <thead className="bg-gray-700 border-b border-gray-600">
          <tr>
            <th className="px-4 py-3 text-left font-semibold text-gray-200">Ticker</th>
            <th className="px-4 py-3 text-left font-semibold text-gray-200">Type</th>
            <th className="px-4 py-3 text-right font-semibold text-gray-200">Shares</th>
            <th className="px-4 py-3 text-right font-semibold text-gray-200">Entry Price</th>
            <th className="px-4 py-3 text-right font-semibold text-gray-200">Last Price</th>
            <th className="px-4 py-3 text-right font-semibold text-gray-200">Open Gain $</th>
            <th className="px-4 py-3 text-right font-semibold text-gray-200">Open Gain %</th>
            <th className="px-4 py-3 text-right font-semibold text-gray-200">Stop</th>
            <th className="px-4 py-3 text-right font-semibold text-gray-200">Book Cost</th>
            <th className="px-4 py-3 text-right font-semibold text-gray-200">Size % of Eq</th>
            <th className="px-4 py-3 text-right font-semibold text-gray-200">Risk $</th>
            <th className="px-4 py-3 text-right font-semibold text-gray-200">Risk %</th>
            <th className="px-4 py-3 text-right font-semibold text-gray-200">Risk % of Eq</th>
            <th className="px-4 py-3 text-right font-semibold text-gray-200">2R</th>
            <th className="px-4 py-3 text-right font-semibold text-gray-200">3R</th>
            <th className="px-4 py-3 text-right font-semibold text-gray-200">4R</th>
            <th className="px-4 py-3 text-right font-semibold text-gray-200">5R</th>
            <th className="px-4 py-3 text-right font-semibold text-gray-200">Days Held</th>
            <th className="px-4 py-3 text-right font-semibold text-gray-200">Current R</th>
            <th className="px-4 py-3 text-center font-semibold text-gray-200">Action</th>
          </tr>
        </thead>
        <tbody>
          {positions.map(position => {
            const posCurrency = position.currency ?? 'USD';
            // metrics in native position currency (bookCost, riskDollar, targets are all native)
            const metrics = calculatePositionMetrics(position, totalEquity);
            // Portfolio-currency conversions for aggregate columns
            const bookCostConverted = convert(metrics.bookCost, posCurrency, portfolioCurrency, usdCadRate);
            const riskDollarConverted = convert(metrics.initialRiskDollar, posCurrency, portfolioCurrency, usdCadRate);
            const openGain = calculateOpenGain(position);
            const openGainConverted = openGain !== null
              ? { ...openGain, dollar: convert(openGain.dollar, posCurrency, portfolioCurrency, usdCadRate) }
              : null;
            const daysHeld = calculateDaysHeld(position.entryDate);
            const currentR = calculateOpenRMultiple(position);
            const lastPriceValue =
              editingPrice[position.id] !== undefined
                ? editingPrice[position.id]
                : position.lastPrice !== undefined
                ? String(position.lastPrice)
                : '';

            const hasTranches = !!(position.tranches && position.tranches.length > 0);
            const isExpanded = expandedTranches[position.id];

            return (
              <React.Fragment key={position.id}>
              <tr
                className={`border-b border-gray-700 hover:bg-gray-700 ${hasTranches ? 'cursor-pointer' : ''}`}
                onClick={hasTranches ? () => toggleTranches(position.id) : undefined}
              >
                <td className="px-4 py-3 font-semibold text-white">
                  <span className="flex items-center gap-1">
                    {hasTranches && (
                      <span className="text-gray-500 text-xs">{isExpanded ? '▼' : '▶'}</span>
                    )}
                    {position.ticker}
                    <span className="text-xs font-normal text-gray-500">{posCurrency}</span>
                  </span>
                </td>
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
                <td className="px-4 py-3 text-right text-gray-300">{fmt(position.entryPrice, posCurrency)}</td>
                <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-1">
                    <div className="flex flex-col items-end">
                      <input
                        type="number"
                        value={lastPriceValue}
                        onChange={e => handleLastPriceChange(position.id, e.target.value)}
                        onBlur={e => handleLastPriceBlur(position.id, e.target.value)}
                        placeholder="—"
                        step="0.01"
                        className="w-24 px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-right placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      {quoteError[position.id] && (
                        <span className="text-red-400 text-xs mt-0.5">{quoteError[position.id]}</span>
                      )}
                    </div>
                    <button
                      onClick={() => refreshQuote(position.id, position.ticker)}
                      disabled={loadingQuote[position.id]}
                      title="Fetch live price"
                      className="text-gray-400 hover:text-blue-400 transition disabled:opacity-40 text-base"
                    >
                      {loadingQuote[position.id] ? '…' : '↻'}
                    </button>
                  </div>
                </td>
                <td className={`px-4 py-3 text-right font-semibold ${
                  openGainConverted === null ? 'text-gray-500' :
                  openGainConverted.dollar >= 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {openGainConverted === null ? '—' : `${openGainConverted.dollar >= 0 ? '+' : ''}${fmt(openGainConverted.dollar, portfolioCurrency)}`}
                </td>
                <td className={`px-4 py-3 text-right font-semibold ${
                  openGain === null ? 'text-gray-500' :
                  openGain.percent >= 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {openGain === null ? '—' : `${openGain.percent >= 0 ? '+' : ''}${openGain.percent.toFixed(2)}%`}
                </td>
                <td className="px-4 py-3 text-right text-gray-300">{fmt(position.stopPrice, posCurrency)}</td>
                <td className="px-4 py-3 text-right font-semibold text-white">
                  {fmt(bookCostConverted, portfolioCurrency)}
                </td>
                <td className="px-4 py-3 text-right text-gray-300">
                  {totalEquity > 0 ? (bookCostConverted / totalEquity * 100).toFixed(2) : '—'}%
                </td>
                <td className="px-4 py-3 text-right text-red-400 font-semibold">
                  {fmt(riskDollarConverted, portfolioCurrency)}
                </td>
                <td className="px-4 py-3 text-right text-gray-300">{metrics.initialRiskPercent.toFixed(2)}%</td>
                <td className="px-4 py-3 text-right text-gray-300">
                  {totalEquity > 0 ? (riskDollarConverted / totalEquity * 100).toFixed(2) : '—'}%
                </td>
                <td className="px-4 py-3 text-right text-gray-300">{fmt(metrics.targets.r2, posCurrency)}</td>
                <td className="px-4 py-3 text-right text-gray-300">{fmt(metrics.targets.r3, posCurrency)}</td>
                <td className="px-4 py-3 text-right text-gray-300">{fmt(metrics.targets.r4, posCurrency)}</td>
                <td className="px-4 py-3 text-right text-gray-300">{fmt(metrics.targets.r5, posCurrency)}</td>
                <td className="px-4 py-3 text-right text-gray-300">{daysHeld}d</td>
                <td className={`px-4 py-3 text-right font-semibold ${
                  currentR === null ? 'text-gray-500' :
                  currentR >= 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {currentR === null ? '—' : `${currentR >= 0 ? '+' : ''}${currentR.toFixed(2)}R`}
                </td>
                <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                  <div className="flex gap-1 justify-center">
                    <button
                      onClick={() => onEdit(position.id)}
                      className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700 transition"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onClose(position.id)}
                      className="bg-red-600 text-white px-3 py-1 rounded text-xs hover:bg-red-700 transition"
                    >
                      Close
                    </button>
                    <button
                      onClick={() => handleDelete(position.id, position.ticker)}
                      className="bg-gray-600 text-white px-3 py-1 rounded text-xs hover:bg-gray-500 transition"
                    >
                      Delete
                    </button>
                    <button
                      onClick={() => onAddTranche(position.id)}
                      className="bg-indigo-700 text-white px-3 py-1 rounded text-xs hover:bg-indigo-600 transition"
                    >
                      + Tranche
                    </button>
                  </div>
                </td>
              </tr>
              {position.tranches && expandedTranches[position.id] && (
                <tr className="bg-gray-900 border-b border-gray-700">
                  <td colSpan={20} className="px-6 py-3">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-gray-400 border-b border-gray-700">
                          <th className="px-2 py-1 text-left">Date</th>
                          <th className="px-2 py-1 text-left">Action</th>
                          <th className="px-2 py-1 text-right">Shares</th>
                          <th className="px-2 py-1 text-right">Fill Price</th>
                          <th className="px-2 py-1 text-right">Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {position.tranches.map(t => {
                          const isEntry = t.action === 'Buy' || t.action === 'Short';
                          return (
                            <tr key={t.id} className="border-b border-gray-800">
                              <td className="px-2 py-1 text-gray-400">{t.date}</td>
                              <td className="px-2 py-1">
                                <span className={`px-1.5 py-0.5 rounded font-semibold ${
                                  isEntry ? 'bg-green-900 text-green-300' : 'bg-orange-900 text-orange-300'
                                }`}>
                                  {t.action}
                                </span>
                              </td>
                              <td className="px-2 py-1 text-right text-gray-300">{t.shares}</td>
                              <td className="px-2 py-1 text-right text-gray-300">{fmt(t.fillPrice, posCurrency)}</td>
                              <td className="px-2 py-1 text-right text-gray-300">{fmt(t.shares * t.fillPrice, posCurrency)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </td>
                </tr>
              )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
      </div>
    </div>
  );
}
