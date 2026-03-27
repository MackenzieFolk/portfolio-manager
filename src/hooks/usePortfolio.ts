import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Position, ClosedTrade, PortfolioState, Tranche } from '../types';
import { convert } from '../utils/currency';

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

// Converts an amount in a position's native currency to the portfolio currency.
function toPortfolio(amount: number, posCurrency: 'USD' | 'CAD', portfolioCurrency: 'USD' | 'CAD', rate: number) {
  return convert(amount, posCurrency, portfolioCurrency, rate);
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
    return { ...defaultState, ...parsed, currency: parsed.currency ?? 'USD' };
  });

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

  // rate: live USD/CAD rate, used to convert cash when switching portfolio currency
  const setCurrency = useCallback((currency: 'USD' | 'CAD', rate = 1) => {
    setState(prev => {
      if (prev.currency === currency) return prev;
      const convertedCash = toPortfolio(prev.cash, prev.currency as 'USD' | 'CAD', currency, rate);
      return { ...prev, currency, cash: Math.round(convertedCash * 100) / 100 };
    });
  }, []);

  // rate: live USD/CAD rate, used to convert position cost into portfolio currency for cash deduction
  const addPosition = useCallback((position: Omit<Position, 'id'>, rate = 1) => {
    const newPosition: Position = { ...position, id: uuidv4() };
    setState(prev => {
      const posCurrency = (position.currency ?? 'USD') as 'USD' | 'CAD';
      const costNative = position.entryPrice * position.shares + 9.99;
      const costInPortfolio = toPortfolio(costNative, posCurrency, prev.currency as 'USD' | 'CAD', rate);
      return {
        ...prev,
        positions: [...prev.positions, newPosition],
        cash: prev.cash - costInPortfolio,
      };
    });
    return newPosition;
  }, []);

  const closePosition = useCallback(
    (positionId: string, exitPrice: number, exitDate: string, exitReason?: string, sharesToClose?: number, rate = 1) => {
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

      const posCurrency = (position.currency ?? 'USD') as 'USD' | 'CAD';
      const proceedsNative = exitPrice * exited - 9.99;

      const isFullClose = exited >= position.shares;

      setState(prev => {
        const proceedsInPortfolio = toPortfolio(proceedsNative, posCurrency, prev.currency as 'USD' | 'CAD', rate);
        return {
          ...prev,
          positions: isFullClose
            ? prev.positions.filter(p => p.id !== positionId)
            : prev.positions.map(p =>
                p.id === positionId
                  ? { ...p, shares: Math.round((p.shares - exited) * 10000) / 10000 }
                  : p
              ),
          closedTrades: [...prev.closedTrades, closedTrade],
          cash: prev.cash + proceedsInPortfolio,
        };
      });
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
    setState(prev => ({ ...prev, cash: prev.cash + amount }));
  }, []);

  const deletePosition = useCallback((positionId: string, rate = 1) => {
    setState(prev => {
      const position = prev.positions.find(p => p.id === positionId);
      if (!position) return prev;
      const posCurrency = (position.currency ?? 'USD') as 'USD' | 'CAD';
      const refundNative = position.entryPrice * position.shares + 9.99;
      const refundInPortfolio = toPortfolio(refundNative, posCurrency, prev.currency as 'USD' | 'CAD', rate);
      return {
        ...prev,
        positions: prev.positions.filter(p => p.id !== positionId),
        cash: prev.cash + refundInPortfolio,
      };
    });
  }, []);

  const addTranche = useCallback((positionId: string, tranche: Tranche, newStopPrice?: number, rate = 1) => {
    setState(prev => {
      const position = prev.positions.find(p => p.id === positionId);
      if (!position) return prev;

      const posCurrency = (position.currency ?? 'USD') as 'USD' | 'CAD';
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
        const costNative = tranche.shares * tranche.fillPrice + 9.99;
        const costInPortfolio = toPortfolio(costNative, posCurrency, prev.currency as 'USD' | 'CAD', rate);
        return {
          ...prev,
          positions: prev.positions.map(p => p.id === positionId ? updatedPosition : p),
          cash: prev.cash - costInPortfolio,
        };
      } else {
        const exitedShares = Math.min(tranche.shares, position.shares);
        const remainingShares = Math.round((position.shares - exitedShares) * 10000) / 10000;
        const proceedsNative = exitedShares * tranche.fillPrice - 9.99;
        const proceedsInPortfolio = toPortfolio(proceedsNative, posCurrency, prev.currency as 'USD' | 'CAD', rate);

        const closedRecord = makeClosed(
          position,
          exitedShares,
          tranche.fillPrice,
          tranche.date,
          `Partial ${tranche.action}`,
        );

        if (remainingShares <= 0) {
          return {
            ...prev,
            positions: prev.positions.filter(p => p.id !== positionId),
            closedTrades: [...prev.closedTrades, closedRecord],
            cash: prev.cash + proceedsInPortfolio,
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
          cash: prev.cash + proceedsInPortfolio,
        };
      }
    });
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
