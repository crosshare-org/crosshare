import { ReactNode } from 'react';

export const Emoji = (props: { title?: string, symbol: ReactNode }) => (
  <span title={props.title} role='img' aria-label={props.title || 'emoji'}>{props.symbol}</span>
);
