import {
  KeyboardEvent,
  MouseEvent,
  ReactNode,
  useCallback,
  useState,
} from 'react';
import styles from './SpoilerText.module.css';

export const SpoilerText = ({ children }: { children: ReactNode }) => {
  const [revealed, setRevealed] = useState(false);

  const doReveal = useCallback(
    (e: MouseEvent | KeyboardEvent) => {
      if (!revealed) {
        e.stopPropagation();
        setRevealed(true);
      }
    },
    [revealed]
  );

  return (
    <span
      onClick={doReveal}
      onKeyPress={doReveal}
      role="button"
      tabIndex={0}
      data-hidden={!revealed}
      className={styles.spoiler}
    >
      {children}
    </span>
  );
};
