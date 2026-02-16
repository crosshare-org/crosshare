import {
  type CSSProperties,
  Dispatch,
  ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { FaAngleDoubleLeft, FaAngleDoubleRight } from 'react-icons/fa';
import { useSize } from '../lib/hooks.js';
import { KeyK } from '../lib/types.js';
import { clsx } from '../lib/utils.js';
import { KeypressAction } from '../reducers/commonActions.js';
import { PasteAction } from '../reducers/gridReducer.js';
import { EmbedContext } from './EmbedContext.js';
import styles from './Page.module.scss';

interface TinyNavButtonProps {
  isLeft?: boolean;
  dispatch: Dispatch<KeypressAction>;
}
const TinyNavButton = ({ isLeft, dispatch }: TinyNavButtonProps) => {
  return (
    <button
      className={styles.tinyNav}
      aria-label={isLeft ? 'Previous Entry' : 'Next Entry'}
      onClick={(e) => {
        e.preventDefault();
        dispatch({
          type: 'KEYPRESS',
          key: { k: isLeft ? KeyK.PrevEntry : KeyK.NextEntry },
        });
      }}
    >
      {isLeft ? (
        <FaAngleDoubleLeft className="positionAbsolute" />
      ) : (
        <FaAngleDoubleRight className="positionAbsolute" />
      )}
    </button>
  );
};

interface SquareAndColsProps {
  square: ReactNode;
  aspectRatio: number;
  left: ReactNode;
  right: ReactNode;
  header?: ReactNode;
  leftIsActive: boolean;
  dispatch: Dispatch<KeypressAction | PasteAction>;
}
export const SquareAndCols = (props: SquareAndColsProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { width: cqw, height: cqh } = useSize(containerRef);
  const [useCQ, setUseCQ] = useState(true);
  const { isSlate } = useContext(EmbedContext);
  useEffect(() => {
    if (!('container' in document.documentElement.style)) {
      setUseCQ(false);
    }
  }, []);

  return (
    <div className={styles.container} ref={containerRef}>
      <div className={styles.gridArea}>
        <div
          className={styles.gridHeader}
          data-show-header={props.header !== undefined}
        >
          {props.header}
        </div>
        <div
          aria-label="grid"
          data-no-cq={!useCQ}
          style={
            {
              '--aspect-ratio': props.aspectRatio,
              '--cqw': `${cqw}px`,
              '--cqh': `${cqh}px`,
            } as CSSProperties
          }
          className={styles.grid}
        >
          {props.square}
        </div>
      </div>
      <div data-slate={isSlate} className={styles.clueArea}>
        <TinyNavButton isLeft dispatch={props.dispatch} />
        <div className={styles.clueWrapper}>
          <div data-active={props.leftIsActive} className={styles.clueCol}>
            {props.left}
          </div>
          <div data-active={!props.leftIsActive} className={styles.clueCol}>
            {props.right}
          </div>
        </div>
        <TinyNavButton dispatch={props.dispatch} />
      </div>
    </div>
  );
};

SquareAndCols.displayName = 'SquareAndCols';

interface TwoColProps {
  left: ReactNode;
  right: ReactNode;
}
export const TwoCol = (props: TwoColProps) => {
  return (
    <>
      <div className={styles.twoCol}>
        <div className={clsx(styles.twoColCol, styles.twoColColL)}>
          {props.left}
        </div>
        <div className={clsx(styles.twoColCol, styles.twoColColR)}>
          {props.right}
        </div>
      </div>
    </>
  );
};
