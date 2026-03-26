import { useState } from 'react';
import { usePortfolio } from './hooks/usePortfolio';
import { SettingsModal } from './components/SettingsModal';
import { PortfolioSummary } from './components/PortfolioSummary';
import { PositionsList } from './components/PositionsList';
import { AddPositionForm } from './components/AddPositionForm';
import { ClosePositionForm } from './components/ClosePositionForm';
import { ClosedTradesTable } from './components/ClosedTradesTable';
import { Position } from './types';
import './App.css';

function App() {
  const portfolio = usePortfolio();
  const [showSettingsModal, setShowSettingsModal] = useState(portfolio.state.initialEquity === 0);
  const [showAddPositionForm, setShowAddPositionForm] = useState(false);
  const [showClosePositionForm, setShowClosePositionForm] = useState(false);
  const [positionToClose, setPositionToClose] = useState<Position | null>(null);
  const [activeTab, setActiveTab] = useState<'positions' | 'closed'>('positions');

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

  const handleConfirmClose = (exitPrice: number, exitDate: string, exitReason?: string) => {
    if (positionToClose) {
      portfolio.closePosition(positionToClose.id, exitPrice, exitDate, exitReason);
      setShowClosePositionForm(false);
      setPositionToClose(null);
    }
  };

  const handleSetInitialEquity = (equity: number) => {
    portfolio.setInitialEquity(equity);
    setShowSettingsModal(false);
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <header className="bg-gray-800 shadow-md border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-white">Portfolio Manager</h1>
            <button
              onClick={() => setShowSettingsModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              Settings
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <PortfolioSummary
          initialEquity={portfolio.state.initialEquity}
          cash={portfolio.state.cash}
          positions={portfolio.state.positions}
          onEditEquity={() => setShowSettingsModal(true)}
        />

        <div className="bg-gray-800 rounded-lg shadow-md mb-6">
          <div className="flex border-b border-gray-700">
            <button
              onClick={() => setActiveTab('positions')}
              className={`flex-1 px-4 py-3 font-semibold text-center transition ${
                activeTab === 'positions'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-700'
              }`}
            >
              Active Positions ({portfolio.state.positions.length})
            </button>
            <button
              onClick={() => setActiveTab('closed')}
              className={`flex-1 px-4 py-3 font-semibold text-center transition ${
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
                  onClose={handleClosePosition}
                />
                <button
                  onClick={() => setShowAddPositionForm(true)}
                  className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 transition font-semibold"
                >
                  + Add New Position
                </button>
              </div>
            )}
            {activeTab === 'closed' && (
              <ClosedTradesTable
                trades={portfolio.state.closedTrades}
                initialEquity={portfolio.state.initialEquity}
              />
            )}
          </div>
        </div>
      </main>

      <SettingsModal
        initialEquity={portfolio.state.initialEquity}
        isOpen={showSettingsModal}
        onSave={handleSetInitialEquity}
      />

      <AddPositionForm
        isOpen={showAddPositionForm}
        cash={portfolio.state.cash}
        positions={portfolio.state.positions}
        onAdd={handleAddPosition}
        onClose={() => setShowAddPositionForm(false)}
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
