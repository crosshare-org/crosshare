import { useState, useEffect, useCallback } from 'react';

export function usePersistedBoolean(key: string, defaultValue: boolean): [boolean, (b: boolean) => void] {
  const [state, setState] = useState<boolean>(defaultValue);

  useEffect(() => {
    const initialValue = localStorage.getItem(key);
    setState(initialValue !== null ? initialValue === 'true' : defaultValue);
  }, [defaultValue, key]);

  const setStateAndPersist = useCallback((newValue: boolean) => {
    localStorage.setItem(key, newValue ? 'true' : 'false');
    setState(newValue);
  }, [key, setState]);
  return [state, setStateAndPersist];
}
