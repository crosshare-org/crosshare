import { createContext } from 'react';
import { PRIMARY } from '../lib/style.js';

export enum EmbedColorMode {
  Default,
  Light,
  Dark,
}

export interface EmbedContextValue {
  primaryColor: string;
  preservePrimary: boolean;
  isEmbed: boolean;
  colorMode: EmbedColorMode;
  isSlate: boolean;
}

export const EmbedContext = createContext<EmbedContextValue>({
  primaryColor: PRIMARY,
  preservePrimary: false,
  isEmbed: false,
  colorMode: EmbedColorMode.Default,
  isSlate: false,
});
