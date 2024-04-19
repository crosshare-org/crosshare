import { ReactNode } from 'react';
import styles from './BigQuote.module.css';

export function BigQuote(props: { quote: string; attribution: ReactNode }) {
  return (
    <div className={styles.outer}>
      <div className={styles.wrapper}>
        <span className={styles.quote}>{props.quote}</span>
        <br />
        <span className={styles.attrib}>&mdash; {props.attribution}</span>
      </div>
    </div>
  );
}
