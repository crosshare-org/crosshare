import { createContext } from 'react';

export enum EmbedColorMode {
  Default,
  Light,
  Dark,
}

export interface EmbedContextValue {
  isEmbed: boolean;
  colorMode: EmbedColorMode;
  isSlate: boolean;
}

export const EmbedContext = createContext<EmbedContextValue>({
  isEmbed: false,
  colorMode: EmbedColorMode.Default,
  isSlate: false,
});
