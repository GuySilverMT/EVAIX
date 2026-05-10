import { useState, useEffect } from 'react';

interface ColumnFocusState {
  [columnIndex: number]: string | null; // cardId or null
}

export const useColumnFocus = (columns: number) => {
  const [focusState, setFocusState] = useState<ColumnFocusState>(() => {
    const saved = localStorage.getItem('columnFocusState');
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => {
    localStorage.setItem('columnFocusState', JSON.stringify(focusState));
  }, [focusState]);

  const setColumnFocus = (columnIndex: number, cardId: string | null) => {
    setFocusState(prev => ({
      ...prev,
      [columnIndex]: cardId,
    }));
  };

  const getColumnFocus = (columnIndex: number): string | null => {
    return focusState[columnIndex] || null;
  };

  const clearAllFocus = () => {
    setFocusState({});
  };

  return {
    setColumnFocus,
    getColumnFocus,
    clearAllFocus,
    focusState,
  };
};