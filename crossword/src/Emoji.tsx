import * as React from 'react';

export const Emoji = (props: { title?: string, symbol: React.ReactNode }) => (
  <span title={props.title} role='img' aria-label={props.title || 'emoji'}>{props.symbol}</span>
);
