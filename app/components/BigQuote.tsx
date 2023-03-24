import { SMALL_AND_UP } from '../lib/style';
import { ReactNode } from 'react';

export function BigQuote(props: { quote: string; attribution: ReactNode }) {
  return (
    <div
      css={{
        padding: '2em',
        backgroundColor: 'var(--secondary)',
        textAlign: 'center',
        color: 'var(--text)',
      }}
    >
      <div
        css={{
          maxWidth: 900,
          margin: 'auto',
          '&:before': {
            fontFamily: 'Georgia, serif',
            content: 'open-quote',
            fontSize: '6em',
            lineHeight: '0.1em',
            marginRight: '0.25em',
            verticalAlign: '-0.4em',
          },
        }}
      >
        <span
          css={{
            fontFamily: 'Georgia, serif',
            fontSize: 20,
            [SMALL_AND_UP]: {
              fontSize: 30,
            },
            fontStyle: 'italic',
          }}
        >
          {props.quote}
        </span>
        <br />
        <span
          css={{
            [SMALL_AND_UP]: {
              fontSize: 20,
            },
          }}
        >
          &mdash; {props.attribution}
        </span>
      </div>
    </div>
  );
}
