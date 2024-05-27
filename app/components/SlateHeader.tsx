import { type Root } from 'hast';
import Image from 'next/image';
import { clsx } from '../lib/utils.js';
import slateLogoDark from '../public/slate/Logo-Dark.png';
import slateLogo from '../public/slate/Logo.png';
import { Markdown } from './Markdown.js';
import styles from './SlateHeader.module.css';

interface SlateHeaderProps {
  title: string;
  author: string;
  note?: Root | null;
}

export const SlateLogo = (props: { className?: string }) => {
  return (
    <div className={clsx(props.className, styles.logoWrap)}>
      <Image
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        src={slateLogoDark}
        alt="Slate Crosswords"
        className={styles.logoDark}
      />
      <Image
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        src={slateLogo}
        alt="Slate Crosswords"
        className={styles.logoLight}
      />
    </div>
  );
};

export const SlateHeader = (props: SlateHeaderProps) => {
  return (
    <div className={styles.headerWrap}>
      <SlateLogo className={styles.logo} />
      <h1 className={styles.title}>{props.title}</h1>
      {props.note ? <Markdown className={styles.note} hast={props.note} /> : ''}
      <h2 className={styles.byline}>By {props.author}</h2>
    </div>
  );
};
