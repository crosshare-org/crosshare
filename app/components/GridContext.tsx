import { createContext } from 'react';
import { CluedGrid } from '../lib/viewableGrid.js';

export const GridContext = createContext<CluedGrid | null>(null);
