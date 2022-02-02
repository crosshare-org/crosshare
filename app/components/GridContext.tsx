import { createContext } from 'react';
import { CluedGrid } from '../lib/viewableGrid';

export const GridContext = createContext<CluedGrid | null>(null);
