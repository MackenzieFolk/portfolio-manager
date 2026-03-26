import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Position, ClosedTrade, PortfolioState } from '../types';

const STORAGE_KEY = 'portfolio-manager-state';

const defaultState: PortfolioState = {
  initialEquity: 0,
  cash: 0,
  positions: [],
  closedTrades: [],
};

export function usePortfolio() {
  const [state, setState] = useState<PortfolioState>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : defaultState;
  });

  // Save to localStorage whenever state changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const setInitialEquity = useCallback((equity: number) => {
    setState(prev => ({
      ...prev,
      initialEquity: equity,
      cash: prev.cash === prev.initialEquity ? equity : prev.cash,
    }));
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
    (positionId: string, exitPrice: number, exitDate: string, exitReason?: string) => {
      const position = state.positions.find(p => p.id === positionId);
      if (!position) return;

      const closedTrade: ClosedTrade = {
        ...position,
        exitPrice,
        exitDate,
        exitReason,
      };

      const pnl =
        (exitPrice - position.entryPrice) * position.shares - 9.99 * 2;

      setState(prev => ({
        ...prev,
        positions: prev.positions.filter(p => p.id !== positionId),
        closedTrades: [...prev.closedTrades, closedTrade],
        cash: prev.cash + exitPrice * position.shares - 9.99 + pnl,
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

  const resetState = useCallback(() => {
    setState(defaultState);
  }, []);

  return {
    state,
    setInitialEquity,
    addPosition,
    editPosition,
    closePosition,
    updateLastPrice,
    updateCash,
    deletePosition,
    resetState,
  };
}
