import { SMALL_AND_UP, LARGE_AND_UP } from '../lib/style';
import { Link } from './Link';
import { Logo } from './Icons';
import { ReactNode } from 'react';

export function Hero(props: { text: string, children?: ReactNode }) {
  return <header css={{
    padding: '0 0.5em',
    backgroundColor: 'var(--primary)',
    textAlign: 'center',
    color: 'var(--text)',
    paddingTop: '1em',
    minHeight: 350,
    [SMALL_AND_UP]: {
      minHeight: 300,
    },
    [LARGE_AND_UP]: {
      minHeight: 250,
    }
  }}>
    <Link href="/" passHref css={{
      textDecoration: 'none !important',
      cursor: 'pointer',
    }} title="Crosshare Home">
      <Logo notificationCount={0} width={50} height={50} />
    </Link>
    <h2 css={{
      fontSize: 30,
      lineHeight: '1.1em',
      [SMALL_AND_UP]: {
        fontSize: 40,
      }
    }}>{props.text}</h2>
    {props.children}
  </header>;
}
