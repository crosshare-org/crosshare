import { css } from '@emotion/react';
import {
  Dispatch,
  ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { FaAngleDoubleLeft, FaAngleDoubleRight } from 'react-icons/fa';
import { usePolyfilledResizeObserver } from '../lib/hooks';
import {
  LARGE_AND_UP,
  SMALL_AND_UP,
  SQUARE_HEADER_HEIGHT,
  TINY_COL_MIN_HEIGHT,
} from '../lib/style';
import { KeyK } from '../lib/types';
import { KeypressAction, PasteAction } from '../reducers/gridReducer';
import { EmbedContext } from './EmbedContext';

const clueAreaCss = css({
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
});

export const SLATE_PADDING_SMALL = 15;
export const SLATE_PADDING_MED = 50;
export const SLATE_PADDING_LARGE = 50;

const slateClueAreaCss = css({
  [SMALL_AND_UP]: {
    width: `calc(34vw - ${2 * SLATE_PADDING_MED}px)`,
  },
  [LARGE_AND_UP]: {
    width: `calc(50vw - ${2 * SLATE_PADDING_LARGE}px)`,
  },
});

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
        <FaAngleDoubleLeft className="positionAbsolute" />
      ) : (
        <FaAngleDoubleRight className="positionAbsolute" />
      )}
    </button>
  );
};

interface SquareAndColsProps {
  square: ReactNode;
  aspectRatio?: number;
  left: ReactNode;
  right: ReactNode;
  header?: ReactNode;
  leftIsActive: boolean;
  dispatch: Dispatch<KeypressAction | PasteAction>;
}
export const SquareAndCols = (props: SquareAndColsProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { width: cqw, height: cqh } = usePolyfilledResizeObserver(containerRef);
  const [useCQ, setUseCQ] = useState(true);
  const { isSlate } = useContext(EmbedContext);
  useEffect(() => {
    if (!('container' in document.documentElement.style)) {
      setUseCQ(false);
    }
  }, []);

  return (
    <>
      <div
        css={{
          outline: 'none',
          display: 'flex',
          flex: '1 1 auto',
          flexDirection: 'column',
          height: ['100svh', '100%'],
          width: '100%',
          position: 'absolute',
          [SMALL_AND_UP]: {
            flexDirection: 'row',
          },
          flexWrap: 'nowrap',
          containerType: 'size',
        }}
        ref={containerRef}
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
              width: useCQ
                ? `min(100cqw, 100cqh * ${props.aspectRatio} - ${TINY_COL_MIN_HEIGHT}px * ${props.aspectRatio})`
                : `min(${cqw}px, ${cqh}px * ${props.aspectRatio} - ${TINY_COL_MIN_HEIGHT}px * ${props.aspectRatio})`,
              height: useCQ
                ? `min(100cqh - ${TINY_COL_MIN_HEIGHT}px, 100cqw / ${props.aspectRatio})`
                : `min(${cqh}px - ${TINY_COL_MIN_HEIGHT}px, ${cqw}px / ${props.aspectRatio})`,
              [SMALL_AND_UP]: {
                width: useCQ
                  ? `min(66cqw, 100cqh * ${props.aspectRatio} - ${SQUARE_HEADER_HEIGHT}px * ${props.aspectRatio})`
                  : `min(0.66 * ${cqw}px, ${cqh}px * ${props.aspectRatio} - ${SQUARE_HEADER_HEIGHT}px * ${props.aspectRatio})`,
                height: useCQ
                  ? `min(100cqh - ${SQUARE_HEADER_HEIGHT}px, 66cqw / ${props.aspectRatio})`
                  : `min(${cqh}px - ${SQUARE_HEADER_HEIGHT}px, 0.66 * ${cqw}px / ${props.aspectRatio})`,
              },
              [LARGE_AND_UP]: {
                width: useCQ
                  ? `min(50cqw, 100cqh * ${props.aspectRatio} - ${SQUARE_HEADER_HEIGHT}px * ${props.aspectRatio})`
                  : `min(0.5 * ${cqw}px, ${cqh}px * ${props.aspectRatio} - ${SQUARE_HEADER_HEIGHT}px * ${props.aspectRatio})`,
                height: useCQ
                  ? `min(100cqh - ${SQUARE_HEADER_HEIGHT}px, 50cqw / ${props.aspectRatio})`
                  : `min(${cqh}px - ${SQUARE_HEADER_HEIGHT}px, 0.5 * ${cqw}px / ${props.aspectRatio})`,
              },
            }}
          >
            {props.square}
          </div>
        </div>
        <div css={[clueAreaCss, ...(isSlate ? [slateClueAreaCss] : [])]}>
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
