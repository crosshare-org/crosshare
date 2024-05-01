import { ReactNode } from 'react';
import styles from './Hero.module.css';
import { Logo } from './Icons';
import { Link } from './Link';

export function Hero(props: { text: string; children?: ReactNode }) {
  return (
    <header className={styles.header}>
      <Link href="/" className={styles.link} title="Crosshare Home">
        <Logo notificationCount={0} width={50} height={50} />
      </Link>
      <h2 className={styles.text}>{props.text}</h2>
      {props.children}
    </header>
  );
}
