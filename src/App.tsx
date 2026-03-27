import { useState, useRef, useEffect, useCallback } from 'react';
import { usePortfolio } from './hooks/usePortfolio';
import { SettingsModal } from './components/SettingsModal';
import { PortfolioSummary } from './components/PortfolioSummary';
import { PositionsList } from './components/PositionsList';
import { AddPositionForm } from './components/AddPositionForm';
import { AddTrancheForm } from './components/AddTrancheForm';
import { ClosePositionForm } from './components/ClosePositionForm';
import { EditPositionForm } from './components/EditPositionForm';
import { ClosedTradesTable } from './components/ClosedTradesTable';
import { PerformanceStats } from './components/PerformanceStats';
import { CsvImportModal } from './components/CsvImportModal';
import { Position, Tranche } from './types';
import { fetchExchangeRate, fetchHistoricalRate } from './utils/fetchQuote';
import './App.css';

function App() {
  const portfolio = usePortfolio();
  const [showSettingsModal, setShowSettingsModal] = useState(portfolio.state.initialEquity === 0);
  const [showAddPositionForm, setShowAddPositionForm] = useState(false);
  const [showCsvImport, setShowCsvImport] = useState(false);
  const [showClosePositionForm, setShowClosePositionForm] = useState(false);
  const [positionToClose, setPositionToClose] = useState<Position | null>(null);
  const [showEditPositionForm, setShowEditPositionForm] = useState(false);
  const [positionToEdit, setPositionToEdit] = useState<Position | null>(null);
  const [showAddTrancheForm, setShowAddTrancheForm] = useState(false);
  const [positionForTranche, setPositionForTranche] = useState<Position | null>(null);
  const [showNewPositionMenu, setShowNewPositionMenu] = useState(false);
  const newPositionMenuRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<'positions' | 'closed'>('positions');
  const [usdCadRate, setUsdCadRate] = useState(1.38); // sensible default until fetched
  const [initialEquityUsdCadRate, setInitialEquityUsdCadRate] = useState(0);

  const refreshRate = useCallback(async () => {
    try {
      const rate = await fetchExchangeRate();
      if (rate > 0) setUsdCadRate(rate);
    } catch { /* silently ignore */ }
  }, []);

  // Fetch exchange rate on mount and every 60 seconds
  useEffect(() => {
    refreshRate();
    const id = setInterval(refreshRate, 60_000);
    return () => clearInterval(id);
  }, [refreshRate]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (newPositionMenuRef.current && !newPositionMenuRef.current.contains(e.target as Node)) {
        setShowNewPositionMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleAddPosition = (position: Omit<Position, 'id'>) => {
    portfolio.addPosition(position);
    setShowAddPositionForm(false);
  };

  const handleClosePosition = (positionId: string) => {
    const position = portfolio.state.positions.find(p => p.id === positionId);
    if (position) {
      setPositionToClose(position);
      setShowClosePositionForm(true);
    }
  };

  const handleConfirmClose = (exitPrice: number, exitDate: string, exitReason?: string, shares?: number) => {
    if (positionToClose) {
      portfolio.closePosition(positionToClose.id, exitPrice, exitDate, exitReason, shares);
      setShowClosePositionForm(false);
      setPositionToClose(null);
    }
  };

  const handleEditPosition = (positionId: string) => {
    const position = portfolio.state.positions.find(p => p.id === positionId);
    if (position) {
      setPositionToEdit(position);
      setShowEditPositionForm(true);
    }
  };

  const handleSetInitialEquity = (equity: number, currency: 'USD' | 'CAD', date: string) => {
    portfolio.setInitialEquity(equity, date, currency);
    portfolio.setCurrency(currency);
    setShowSettingsModal(false);
  };

  // Fetch historical rate whenever initialEquityDate changes
  useEffect(() => {
    const date = portfolio.state.initialEquityDate;
    if (!date) return;
    fetchHistoricalRate(date).then(rate => {
      if (rate > 0) setInitialEquityUsdCadRate(rate);
    });
  }, [portfolio.state.initialEquityDate]);

  const handleAddTranche = (positionId: string) => {
    const position = portfolio.state.positions.find(p => p.id === positionId);
    if (position) {
      setPositionForTranche(position);
      setShowAddTrancheForm(true);
    }
  };

  const handleConfirmAddTranche = (positionId: string, tranche: Tranche, newStop?: number) => {
    portfolio.addTranche(positionId, tranche, newStop);
    setShowAddTrancheForm(false);
    setPositionForTranche(null);
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <header className="bg-gray-800 shadow-md border-b border-gray-700">
        <div className="px-4 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-xl sm:text-3xl font-bold text-white">Portfolio Manager</h1>
            <button
              onClick={() => setShowSettingsModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              Settings
            </button>
          </div>
        </div>
      </header>

      <main className="px-4 py-6">
        <PortfolioSummary
          initialEquity={portfolio.state.initialEquity}
          initialEquityCurrency={portfolio.state.initialEquityCurrency ?? portfolio.state.currency}
          initialEquityUsdCadRate={initialEquityUsdCadRate > 0 ? initialEquityUsdCadRate : usdCadRate}
          cash={portfolio.state.cash}
          positions={portfolio.state.positions}
          currency={portfolio.state.currency}
          usdCadRate={usdCadRate}
          onEditEquity={() => setShowSettingsModal(true)}
          onEditPosition={handleEditPosition}
          onClosePosition={handleClosePosition}
          onDeletePosition={portfolio.deletePosition}
          onAddTranche={handleAddTranche}
        />

        <div className="bg-gray-800 rounded-lg shadow-md mb-6">
          <div className="flex border-b border-gray-700">
            <button
              onClick={() => setActiveTab('positions')}
              className={`flex-1 px-2 sm:px-4 py-3 text-sm sm:text-base font-semibold text-center transition ${
                activeTab === 'positions'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-700'
              }`}
            >
              Active Positions ({portfolio.state.positions.length})
            </button>
            <button
              onClick={() => setActiveTab('closed')}
              className={`flex-1 px-2 sm:px-4 py-3 text-sm sm:text-base font-semibold text-center transition ${
                activeTab === 'closed'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-700'
              }`}
            >
              Closed Trades ({portfolio.state.closedTrades.length})
            </button>
          </div>
          <div className="p-6">
            {activeTab === 'positions' && (
              <div className="space-y-4">
                <PositionsList
                  positions={portfolio.state.positions}
                  cash={portfolio.state.cash}
                  portfolioCurrency={portfolio.state.currency}
                  usdCadRate={usdCadRate}
                  onClose={handleClosePosition}
                  onEdit={handleEditPosition}
                  onDelete={portfolio.deletePosition}
                  onUpdateLastPrice={portfolio.updateLastPrice}
                  onAddTranche={handleAddTranche}
                />
                <div ref={newPositionMenuRef} className="relative">
                  <button
                    onClick={() => setShowNewPositionMenu(prev => !prev)}
                    className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition font-semibold"
                  >
                    + New Position ▾
                  </button>
                  {showNewPositionMenu && (
                    <div className="absolute bottom-full mb-1 left-0 right-0 bg-gray-700 border border-gray-600 rounded-lg overflow-hidden shadow-xl z-10">
                      <button
                        onClick={() => { setShowNewPositionMenu(false); setShowAddPositionForm(true); }}
                        className="w-full text-left px-4 py-3 text-white hover:bg-gray-600 transition text-sm font-semibold"
                      >
                        ✏️ Manual Entry
                      </button>
                      <button
                        onClick={() => { setShowNewPositionMenu(false); setShowCsvImport(true); }}
                        className="w-full text-left px-4 py-3 text-white hover:bg-gray-600 transition text-sm font-semibold border-t border-gray-600"
                      >
                        📂 Import CSV
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
            {activeTab === 'closed' && (
              <>
                <PerformanceStats
                  trades={portfolio.state.closedTrades}
                  initialEquity={portfolio.state.initialEquity}
                />
                <ClosedTradesTable
                  trades={portfolio.state.closedTrades}
                  initialEquity={portfolio.state.initialEquity}
                  portfolioCurrency={portfolio.state.currency}
                  usdCadRate={usdCadRate}
                />
              </>
            )}
          </div>
        </div>
      </main>

      <SettingsModal
        initialEquity={portfolio.state.initialEquity}
        initialEquityDate={portfolio.state.initialEquityDate}
        currency={portfolio.state.currency}
        usdCadRate={usdCadRate}
        isOpen={showSettingsModal}
        onSave={handleSetInitialEquity}
        onClose={() => setShowSettingsModal(false)}
        onClearAll={portfolio.resetState}
      />

      <AddPositionForm
        isOpen={showAddPositionForm}
        cash={portfolio.state.cash}
        positions={portfolio.state.positions}
        defaultCurrency={portfolio.state.initialEquityCurrency ?? portfolio.state.currency}
        onAdd={handleAddPosition}
        onClose={() => setShowAddPositionForm(false)}
      />

      <CsvImportModal
        isOpen={showCsvImport}
        defaultCurrency={portfolio.state.initialEquityCurrency ?? portfolio.state.currency}
        onImport={positions => positions.forEach(p => portfolio.addPosition(p))}
        onClose={() => setShowCsvImport(false)}
      />

      <EditPositionForm
        isOpen={showEditPositionForm}
        position={positionToEdit}
        cash={portfolio.state.cash}
        positions={portfolio.state.positions}
        onSave={(positionId, updates) => {
          portfolio.editPosition(positionId, updates);
          setShowEditPositionForm(false);
          setPositionToEdit(null);
        }}
        onClose={() => {
          setShowEditPositionForm(false);
          setPositionToEdit(null);
        }}
      />

      <AddTrancheForm
        isOpen={showAddTrancheForm}
        position={positionForTranche}
        onAdd={handleConfirmAddTranche}
        onClose={() => { setShowAddTrancheForm(false); setPositionForTranche(null); }}
      />

      <ClosePositionForm
        isOpen={showClosePositionForm}
        position={positionToClose}
        initialEquity={portfolio.state.initialEquity}
        onClose={handleConfirmClose}
        onCancel={() => {
          setShowClosePositionForm(false);
          setPositionToClose(null);
        }}
      />
    </div>
  );
}

export default App;
