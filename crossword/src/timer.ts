import { useCallback, useState, useEffect } from 'react';
import useEventListener from '@use-it/event-listener';

export function useTimer(initialSeconds: number):[number, boolean, ()=>void, ()=>void, ()=>number] {
  // TODO should probably change this to always 0 so we can style the init page
  const init = process.env.NODE_ENV === 'development' ? (new Date()).getTime() : 0;
  const [currentWindowStart, setCurrentWindowStart] = useState<number>(init);
  const [bankedSeconds, setBankedSeconds] = useState(initialSeconds);
  const [totalSeconds, setTotalSeconds] = useState(initialSeconds);
  useEventListener('blur', prodPause);

  function prodPause() {
    if (process.env.NODE_ENV !== 'development') {
      pause();
    }
  }

  useEffect(() => {
    function tick() {
      if (currentWindowStart) {
        setTotalSeconds(bankedSeconds + ((new Date()).getTime() - currentWindowStart) / 1000);
      }
    }
    let id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [bankedSeconds, currentWindowStart]);

  const resume = useCallback(() => {
    setCurrentWindowStart((new Date()).getTime());
  }, [setCurrentWindowStart]);

  const getCurrentSeconds = useCallback(() => {
    if (currentWindowStart) {
      return bankedSeconds + ((new Date()).getTime() - currentWindowStart) / 1000;
    }
    return bankedSeconds;
  }, [currentWindowStart, bankedSeconds]);

  const pause = useCallback(() => {
    if (currentWindowStart) {
      setBankedSeconds(bankedSeconds + ((new Date()).getTime() - currentWindowStart) / 1000);
      setCurrentWindowStart(0);
    }
  }, [currentWindowStart, bankedSeconds, setCurrentWindowStart, setBankedSeconds]);

  return [totalSeconds, currentWindowStart === 0, pause, resume, getCurrentSeconds];
}
