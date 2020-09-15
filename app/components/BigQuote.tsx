import { SECONDARY } from '../lib/style';
import { ReactNode } from 'react';

export function BigQuote(props: { quote: string, attribution: ReactNode }) {
  return <div css={{
    padding: '2em',
    backgroundColor: SECONDARY,
    textAlign: 'center',
    color: 'var(--text)',
  }}>
    <div css={{
      maxWidth: 900,
      margin: 'auto',
      '&:before': {
        fontFamily: 'Georgia, serif',
        content: 'open-quote',
        fontSize: '6em',
        lineHeight: '0.1em',
        marginRight: '0.25em',
        verticalAlign: '-0.4em',
      }
    }}>
      <span css={{ fontFamily: 'Georgia, serif', fontSize: 30, fontStyle: 'italic' }}>{props.quote}</span>
      <br />
      <span css={{ fontSize: 20 }}>&mdash; {props.attribution}</span>
    </div>
  </div>;
}
