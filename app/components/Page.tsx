import { Dispatch, ReactNode, useRef, forwardRef } from 'react';
import { FaAngleDoubleRight, FaAngleDoubleLeft } from 'react-icons/fa';

import { Square } from './Square';
import { KeypressAction } from '../reducers/reducer';
import { SMALL_AND_UP, LARGE_AND_UP, TINY_COL_MIN_HEIGHT } from '../lib/style';

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
          key: isLeft ? '{prevEntry}' : '{nextEntry}',
          shift: false,
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

interface SquareAndColsProps {
  square: (width: number, height: number) => ReactNode;
  aspectRatio?: number;
  left: ReactNode;
  right: ReactNode;
  leftIsActive: boolean;
  dispatch: Dispatch<KeypressAction>;
  waitToResize?: boolean;
}
export const SquareAndCols = forwardRef<HTMLDivElement, SquareAndColsProps>(
  (props: SquareAndColsProps, fwdedRef) => {
    const parentRef = useRef<HTMLDivElement | null>(null);

    return (
      <>
        <div
          // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
          tabIndex={0}
          ref={(instance) => {
            parentRef.current = instance;
            if (fwdedRef) {
              if (typeof fwdedRef === 'function') {
                fwdedRef(instance);
              } else {
                fwdedRef.current = instance;
              }
            }
          }}
          css={{
            outline: 'none',
            display: 'flex',
            flex: '1 1 auto',
            flexDirection: 'column',
            alignItems: 'center',
            height: '100%',
            width: '100%',
            position: 'absolute',
            [SMALL_AND_UP]: {
              flexDirection: 'row',
              alignItems: 'start',
            },
            flexWrap: 'nowrap',
          }}
        >
          <Square
            waitToResize={props.waitToResize}
            parentRef={parentRef}
            aspectRatio={props.aspectRatio || 1}
            contents={props.square}
          />
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
                  },
                  [LARGE_AND_UP]: {
                    paddingRight: 2,
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
                  },
                  [LARGE_AND_UP]: {
                    paddingLeft: 2,
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
  }
);

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
