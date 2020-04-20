import * as React from 'react';


export function usePersistedBoolean(key:string, defaultValue: boolean): [boolean, (b: boolean) => void] {
  const [state, setState] = React.useState<boolean>(defaultValue);

  React.useEffect(() => {
    const initialValue = localStorage.getItem(key);
    setState(initialValue !== null ? initialValue === "true" : defaultValue);
  }, [defaultValue, key]);

  const setStateAndPersist = React.useCallback((newValue: boolean) => {
    localStorage.setItem(key, newValue ? "true" : "false");
    setState(newValue);
  }, [key, setState]);
  return [state, setStateAndPersist];
}
