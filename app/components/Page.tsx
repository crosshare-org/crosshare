import { Dispatch, ReactNode, useRef, forwardRef } from 'react';
import {
  FaAngleDoubleRight, FaAngleDoubleLeft,
} from 'react-icons/fa';

import { Keyboard } from './Keyboard';
import { Square } from './Square';
import { KeypressAction } from '../reducers/reducer';
import {
  SMALL_AND_UP, LARGE_AND_UP, TINY_COL_MIN_HEIGHT,
} from '../lib/style';

interface TinyNavButtonProps {
  isLeft?: boolean,
  dispatch: Dispatch<KeypressAction>,
}
const TinyNavButton = ({ isLeft, dispatch }: TinyNavButtonProps) => {
  return <button css={{
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
    borderRight: isLeft ? '1px solid var(--clue-bg)' : '',
    borderLeft: isLeft ? '' : '1px solid var(--clue-bg)',
  }} onClick={() => dispatch({ type: 'KEYPRESS', key: isLeft ? '{prevEntry}' : '{nextEntry}', shift: false })}>
    {isLeft ?
      <FaAngleDoubleLeft css={{ position: 'absolute' }} />
      :
      <FaAngleDoubleRight css={{ position: 'absolute' }} />
    }
  </button>;
};

interface TinyNavProps {
  children: ReactNode,
  dispatch: Dispatch<KeypressAction>,
}
export const TinyNav = ({ children, dispatch }: TinyNavProps) => {
  return (
    <div css={{
      display: 'flex',
      flexWrap: 'nowrap',
      alignItems: 'stretch',
      flexDirection: 'row',
      width: '100%',
      height: '100%',
    }}>
      <TinyNavButton isLeft dispatch={dispatch} />
      <div css={{
        flex: '1 1 auto',
      }}>{children}</div>
      <TinyNavButton dispatch={dispatch} />
    </div>
  );
};

interface SquareAndColsProps {
  muted: boolean,
  square: (width: number, height: number) => ReactNode,
  aspectRatio?: number,
  left: ReactNode,
  right: ReactNode,
  tinyColumn?: ReactNode,
  keyboardHandler: (key: string) => void,
  showExtraKeyLayout: boolean,
  includeBlockKey: boolean,
}
export const SquareAndCols = forwardRef<HTMLDivElement, SquareAndColsProps>((props, fwdedRef) => {
  const parentRef = useRef<HTMLDivElement | null>(null);
  // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
  return (<><div tabIndex={0} ref={(instance) => {
    parentRef.current = instance;
    if (fwdedRef) {
      if (typeof fwdedRef === 'function') {
        fwdedRef(instance);
      } else {
        fwdedRef.current = instance;
      }
    }
  }} css={{
    outline: 'none',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    [SMALL_AND_UP]: {
      flexDirection: 'row',
      alignItems: 'start',
    },
    flexWrap: 'nowrap',
    minHeight: 'calc(100% - var(--height-adjustment))',
    height: 'calc(100% - var(--height-adjustment))',
  }}>
    <Square parentRef={parentRef} aspectRatio={props.aspectRatio || 1} contents={props.square} />
    <div css={{
      display: 'none',
      flex: 'auto',
      flexWrap: 'wrap',
      alignItems: 'end',
      height: '100%',
      [SMALL_AND_UP]: {
        display: 'flex',
        width: '34vw',
      },
      [LARGE_AND_UP]: {
        width: '50vw',
      },
    }}>
      <div css={{
        flex: 'auto',
        width: '100%',
        height: '50%',
        [LARGE_AND_UP]: {
          paddingRight: 2,
          width: '50%',
          height: '100%',
        },
      }}>{props.left}</div>
      <div css={{
        flex: 'auto',
        width: '100%',
        height: '50%',
        [LARGE_AND_UP]: {
          paddingLeft: 2,
          width: '50%',
          height: '100%',
        },
      }}>{props.right}</div>
    </div>
    <div css={{
      flex: '1 0 auto',
      width: '100vw',
      height: TINY_COL_MIN_HEIGHT,
      [SMALL_AND_UP]: {
        display: 'none',
      }
    }}>
      {props.tinyColumn}
    </div>
  </div>
  <Keyboard
    keyboardHandler={props.keyboardHandler}
    muted={props.muted}
    showExtraKeyLayout={props.showExtraKeyLayout}
    includeBlockKey={props.includeBlockKey}
  />
  </>
  );
});

interface TwoColProps {
  muted: boolean,
  left: ReactNode,
  right: ReactNode,
  keyboardHandler: (key: string) => void,
  showExtraKeyLayout: boolean,
  includeBlockKey: boolean,
}
export const TwoCol = (props: TwoColProps) => {
  return (
    <>
      <div css={{
        display: 'block',
        [SMALL_AND_UP]: {
          display: 'flex',
        },
        minHeight: 'calc(100% - var(--height-adjustment))',
        height: 'calc(100% - var(--height-adjustment))',
        overflow: 'scroll',
      }}>
        <div css={{
          [SMALL_AND_UP]: {
            paddingRight: 2,
            width: '50%',
          },
        }}>{props.left}</div>
        <div css={{
          [SMALL_AND_UP]: {
            paddingLeft: 2,
            width: '50%',
          },
        }}>{props.right}</div>
      </div>
      <Keyboard
        keyboardHandler={props.keyboardHandler}
        muted={props.muted}
        showExtraKeyLayout={props.showExtraKeyLayout}
        includeBlockKey={props.includeBlockKey}
      />
    </>
  );
};
