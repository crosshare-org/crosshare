import {
  Dispatch,
  ReactNode,
  useEffect,
  useState,
} from 'react';
import { FaAngleDoubleRight, FaAngleDoubleLeft } from 'react-icons/fa';

import { KeypressAction, PasteAction } from '../reducers/reducer';
import {
  SMALL_AND_UP,
  LARGE_AND_UP,
  TINY_COL_MIN_HEIGHT,
  SQUARE_HEADER_HEIGHT,
  HEADER_HEIGHT,
} from '../lib/style';
import { KeyK } from '../lib/types';

interface TinyNavButtonProps {
  isLeft?: boolean;
  dispatch: Dispatch<KeypressAction>;
}
const TinyNavButton = ({ isLeft, dispatch }: TinyNavButtonProps) => {
  return (
    <button
      css={{
        background: 'none',
        border: 'none',
        padding: 'none',
        width: '2em',
        textAlign: 'center',
        flexShrink: 0,
        color: 'var(--text)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        [SMALL_AND_UP]: {
          display: 'none',
        },
      }}
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
        <FaAngleDoubleLeft css={{ position: 'absolute' }} />
      ) : (
        <FaAngleDoubleRight css={{ position: 'absolute' }} />
      )}
    </button>
  );
};

const getViewportHeight = () => {
  if (typeof window !== 'undefined') {
    if ('virtualKeyboard' in navigator) {
      // If the virtualKeyboard API is supported then we calculate display height in CSS
      return 0;
    }
    return window.visualViewport?.height || 0;
  }
  return 0;
};

const useViewportHeight = () => {
  const [state, setState] = useState(getViewportHeight);
  useEffect(() => {
    const handleResize = () => setState(getViewportHeight);
    window.visualViewport?.addEventListener('resize', handleResize);
    return () =>
      window.visualViewport?.removeEventListener('resize', handleResize);
  }, []);
  return state;
};

const useScrollLock = () => {
  useEffect(() => {
    const handleScroll = (e) => {
      e.preventDefault();
      window.scrollTo(0, 0);
      return false;
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
};

interface SquareAndColsProps {
  square: ReactNode;
  aspectRatio?: number;
  left: ReactNode;
  right: ReactNode;
  header?: ReactNode;
  leftIsActive: boolean;
  dispatch: Dispatch<KeypressAction|PasteAction>;
}
export const SquareAndCols = (props: SquareAndColsProps) => {
  const height = useViewportHeight();
  useScrollLock();

  return (
    <>
      <div
        css={{
          outline: 'none',
          display: 'flex',
          flex: '1 1 auto',
          flexDirection: 'column',
          height:
            height !== 0
              ? height - HEADER_HEIGHT
              : `calc(100dvh - env(keyboard-inset-height, 0px) - ${HEADER_HEIGHT}px)`,
          width: '100%',
          position: 'absolute',
          [SMALL_AND_UP]: {
            flexDirection: 'row',
          },
          flexWrap: 'nowrap',
          containerType: 'size',
        }}
      >
        <div
          css={{
            flex: '0',
            width: '100vw',
            [SMALL_AND_UP]: {
              width: '66vw',
            },
            [LARGE_AND_UP]: {
              width: '50vw',
            },
          }}
        >
          <div
            css={{
              height: SQUARE_HEADER_HEIGHT,
              display: 'none',
              overflow: 'hidden',
              [SMALL_AND_UP]: {
                display: props.header !== undefined ? 'block' : 'none',
              },
            }}
          >
            {props.header}
          </div>
          <div
            aria-label="grid"
            css={{
              margin: 'auto',
              width: `min(100cqw, 100cqh * ${props.aspectRatio} - ${TINY_COL_MIN_HEIGHT}px * ${props.aspectRatio})`,
              height: `min(100cqh - ${TINY_COL_MIN_HEIGHT}px, 100cqw / ${props.aspectRatio})`,
              [SMALL_AND_UP]: {
                width: `min(66cqw, 100cqh * ${props.aspectRatio} - ${SQUARE_HEADER_HEIGHT}px * ${props.aspectRatio})`,
                height: `min(100cqh - ${SQUARE_HEADER_HEIGHT}px, 66cqw / ${props.aspectRatio})`,
              },
              [LARGE_AND_UP]: {
                width: `min(50cqw, 100cqh * ${props.aspectRatio} - ${SQUARE_HEADER_HEIGHT}px * ${props.aspectRatio})`,
                height: `min(100cqh - ${SQUARE_HEADER_HEIGHT}px, 50cqw / ${props.aspectRatio})`,
              },
            }}
          >
            {props.square}
          </div>
        </div>
        <div
          css={{
            display: 'flex',
            flex: '1 0 auto',
            width: '100vw',
            height: TINY_COL_MIN_HEIGHT,
            flexWrap: 'nowrap',
            alignItems: 'stretch',
            flexDirection: 'row',
            backgroundColor: 'var(--lighter)',
            [SMALL_AND_UP]: {
              backgroundColor: 'transparent',
              height: '100%',
              width: '34vw',
            },
            [LARGE_AND_UP]: {
              width: '50vw',
            },
          }}
        >
          <TinyNavButton isLeft dispatch={props.dispatch} />
          <div
            css={{
              display: 'flex',
              flex: '1 1 auto',
              flexDirection: 'column',
              [LARGE_AND_UP]: {
                flexDirection: 'row',
              },
              height: '100%',
              overflowY: 'scroll',
              scrollbarWidth: 'none',
            }}
          >
            <div
              css={{
                width: '100%',
                height: '100%',
                display: props.leftIsActive ? 'block' : 'none',
                [SMALL_AND_UP]: {
                  display: 'block',
                  height: '50%',
                  overflowY: 'scroll',
                  scrollbarWidth: 'none',
                },
                [LARGE_AND_UP]: {
                  width: '50%',
                  height: '100%',
                },
              }}
            >
              {props.left}
            </div>
            <div
              css={{
                width: '100%',
                height: '100%',
                display: props.leftIsActive ? 'none' : 'block',
                [SMALL_AND_UP]: {
                  display: 'block',
                  height: '50%',
                  overflowY: 'scroll',
                  scrollbarWidth: 'none',
                },
                [LARGE_AND_UP]: {
                  width: '50%',
                  height: '100%',
                },
              }}
            >
              {props.right}
            </div>
          </div>
          <TinyNavButton dispatch={props.dispatch} />
        </div>
      </div>
    </>
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
      <div
        css={{
          position: 'absolute',
          height: '100%',
          flex: '1 1 auto',
          display: 'block',
          overflow: 'scroll',
          scrollbarWidth: 'none',
          [SMALL_AND_UP]: {
            display: 'flex',
          },
          width: '100%',
        }}
      >
        <div
          css={{
            [SMALL_AND_UP]: {
              paddingRight: 2,
              width: '50%',
              overflow: 'scroll',
              scrollbarWidth: 'none',
              flex: '1 1 auto',
            },
          }}
        >
          {props.left}
        </div>
        <div
          css={{
            [SMALL_AND_UP]: {
              paddingLeft: 2,
              width: '50%',
              overflow: 'scroll',
              scrollbarWidth: 'none',
              flex: '1 1 auto',
            },
          }}
        >
          {props.right}
        </div>
      </div>
    </>
  );
};
