import { createContext } from 'react';

type CrosshareAudioContextValue = [AudioContext | null, () => void];
export const CrosshareAudioContext = createContext<CrosshareAudioContextValue>([
  null,
  () => {
    /* noop */
  },
]);
