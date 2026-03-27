import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Position, ClosedTrade, PortfolioState, Tranche } from '../types';

function makeClosed(position: Position, exitedShares: number, exitPrice: number, exitDate: string, exitReason: string): ClosedTrade {
  return {
    ...position,
    id: uuidv4(),
    shares: exitedShares,
    exitDate,
    exitPrice,
    exitReason,
  };
}

const STORAGE_KEY = 'portfolio-manager-state';

const defaultState: PortfolioState = {
  initialEquity: 0,
  cash: 0,
  positions: [],
  closedTrades: [],
  currency: 'USD',
};

export function usePortfolio() {
  const [state, setState] = useState<PortfolioState>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return defaultState;
    const parsed = JSON.parse(stored) as PortfolioState;
    // Migrate legacy state that may not have currency field
    return { ...defaultState, ...parsed, currency: parsed.currency ?? 'USD' };
  });

  // Save to localStorage whenever state changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const setInitialEquity = useCallback((equity: number, date?: string, equityCurrency?: 'USD' | 'CAD') => {
    setState(prev => {
      const noActivity = prev.positions.length === 0 && prev.closedTrades.length === 0;
      return {
        ...prev,
        initialEquity: equity,
        initialEquityDate: date ?? prev.initialEquityDate ?? new Date().toISOString().split('T')[0],
        initialEquityCurrency: equityCurrency ?? prev.initialEquityCurrency ?? prev.currency,
        cash: noActivity ? equity : prev.cash,
      };
    });
  }, []);

  const addPosition = useCallback((position: Omit<Position, 'id'>) => {
    const newPosition: Position = {
      ...position,
      id: uuidv4(),
    };

    setState(prev => ({
      ...prev,
      positions: [...prev.positions, newPosition],
      cash: prev.cash - (position.entryPrice * position.shares + 9.99),
    }));

    return newPosition;
  }, []);

  const closePosition = useCallback(
    (positionId: string, exitPrice: number, exitDate: string, exitReason?: string, sharesToClose?: number) => {
      const position = state.positions.find(p => p.id === positionId);
      if (!position) return;

      const exited = sharesToClose && sharesToClose < position.shares
        ? sharesToClose
        : position.shares;

      const closedTrade: ClosedTrade = {
        ...position,
        id: uuidv4(),
        shares: exited,
        exitPrice,
        exitDate,
        exitReason,
      };

      // Cash: receive proceeds minus commission
      const cashDelta = exitPrice * exited - 9.99;

      const isFullClose = exited >= position.shares;

      setState(prev => ({
        ...prev,
        positions: isFullClose
          ? prev.positions.filter(p => p.id !== positionId)
          : prev.positions.map(p =>
              p.id === positionId
                ? { ...p, shares: Math.round((p.shares - exited) * 10000) / 10000 }
                : p
            ),
        closedTrades: [...prev.closedTrades, closedTrade],
        cash: prev.cash + cashDelta,
      }));
    },
    [state.positions]
  );

  const editPosition = useCallback((positionId: string, updates: Omit<Position, 'id'>) => {
    setState(prev => {
      const position = prev.positions.find(p => p.id === positionId);
      if (!position) return prev;
      const oldBookCost = position.entryPrice * position.shares;
      const newBookCost = updates.entryPrice * updates.shares;
      return {
        ...prev,
        positions: prev.positions.map(p =>
          p.id === positionId ? { ...updates, id: positionId } : p
        ),
        cash: prev.cash + oldBookCost - newBookCost,
      };
    });
  }, []);

  const updateLastPrice = useCallback((positionId: string, lastPrice: number | undefined) => {
    setState(prev => ({
      ...prev,
      positions: prev.positions.map(p =>
        p.id === positionId ? { ...p, lastPrice } : p
      ),
    }));
  }, []);

  const updateCash = useCallback((amount: number) => {
    setState(prev => ({
      ...prev,
      cash: prev.cash + amount,
    }));
  }, []);

  const deletePosition = useCallback((positionId: string) => {
    const position = state.positions.find(p => p.id === positionId);
    if (!position) return;

    setState(prev => ({
      ...prev,
      positions: prev.positions.filter(p => p.id !== positionId),
      cash: prev.cash + position.entryPrice * position.shares + 9.99,
    }));
  }, [state.positions]);

  const addTranche = useCallback((positionId: string, tranche: Tranche, newStopPrice?: number) => {
    setState(prev => {
      const position = prev.positions.find(p => p.id === positionId);
      if (!position) return prev;

      const isEntry = tranche.action === 'Buy' || tranche.action === 'Short';
      const existingTranches = position.tranches ?? [];
      const allTranches = [...existingTranches, tranche];

      if (isEntry) {
        const totalCost = position.entryPrice * position.shares + tranche.shares * tranche.fillPrice;
        const newShares = position.shares + tranche.shares;
        const updatedPosition: Position = {
          ...position,
          shares: Math.round(newShares * 10000) / 10000,
          entryPrice: Math.round((totalCost / newShares) * 10000) / 10000,
          stopPrice: newStopPrice && newStopPrice > 0 ? newStopPrice : position.stopPrice,
          tranches: allTranches,
        };
        return {
          ...prev,
          positions: prev.positions.map(p => p.id === positionId ? updatedPosition : p),
          cash: prev.cash - (tranche.shares * tranche.fillPrice + 9.99),
        };
      } else {
        // Exit tranche — create a closed trade record for the exited shares
        const exitedShares = Math.min(tranche.shares, position.shares);
        const remainingShares = Math.round((position.shares - exitedShares) * 10000) / 10000;
        const cashDelta = exitedShares * tranche.fillPrice - 9.99;

        const closedRecord = makeClosed(
          position,
          exitedShares,
          tranche.fillPrice,
          tranche.date,
          `Partial ${tranche.action}`,
        );

        if (remainingShares <= 0) {
          // Position fully closed via tranche
          return {
            ...prev,
            positions: prev.positions.filter(p => p.id !== positionId),
            closedTrades: [...prev.closedTrades, closedRecord],
            cash: prev.cash + cashDelta,
          };
        }

        const updatedPosition: Position = {
          ...position,
          shares: remainingShares,
          tranches: allTranches,
        };
        return {
          ...prev,
          positions: prev.positions.map(p => p.id === positionId ? updatedPosition : p),
          closedTrades: [...prev.closedTrades, closedRecord],
          cash: prev.cash + cashDelta,
        };
      }
    });
  }, []);

  const setCurrency = useCallback((currency: 'USD' | 'CAD') => {
    setState(prev => ({ ...prev, currency }));
  }, []);

  const resetState = useCallback(() => {
    setState(defaultState);
  }, []);

  return {
    state,
    setInitialEquity,
    setCurrency,
    addPosition,
    addTranche,
    editPosition,
    closePosition,
    updateLastPrice,
    updateCash,
    deletePosition,
    resetState,
  };
}
