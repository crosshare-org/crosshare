import { Dispatch, ReactNode, useRef, forwardRef } from 'react';
import {
  FaAngleDoubleRight, FaAngleDoubleLeft,
} from 'react-icons/fa';

import { Keyboard } from './Keyboard';
import { Square } from './Square';
import { KeypressAction } from '../reducers/reducer';
import {
  SMALL_AND_UP, LARGE_AND_UP, TINY_COL_MIN_HEIGHT, HAS_PHYSICAL_KEYBOARD
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
  }} aria-label={isLeft ? 'Previous Entry' : 'Next Entry'} onClick={() => dispatch({ type: 'KEYPRESS', key: isLeft ? '{prevEntry}' : '{nextEntry}', shift: false })}>
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
  keyboardHandler?: (key: string) => void,
  toggleKeyboard: boolean,
  showExtraKeyLayout?: boolean,
  includeBlockKey?: boolean,
  noHeightAdjust?: boolean,  // TODO we can get rid of this everywhere by doing what we do for puzzle stats page and flex'ing the layout
}
export const SquareAndCols = forwardRef<HTMLDivElement, SquareAndColsProps>((props: SquareAndColsProps, fwdedRef) => {
  const parentRef = useRef<HTMLDivElement | null>(null);
  let heightVirtual = '100%';
  let heightPhysical = '100%';
  if (!props.noHeightAdjust) {
    if (props.keyboardHandler) {
      heightVirtual = 'calc(100% - 199px)';
      heightPhysical = 'calc(100% - 35px)';
    } else {
      heightVirtual = 'calc(100% - 35px)';
      heightPhysical = 'calc(100% - 35px)';
    }
  }

  if (props.toggleKeyboard) {
    const swap = heightVirtual;
    heightVirtual = heightPhysical;
    heightPhysical = swap;
  }

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
    minHeight: heightVirtual,
    height: heightVirtual,
    [HAS_PHYSICAL_KEYBOARD]: {
      minHeight: heightPhysical,
      height: heightPhysical,
    }
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
  {props.keyboardHandler ?
    <Keyboard
      toggleKeyboard={props.toggleKeyboard}
      keyboardHandler={props.keyboardHandler}
      muted={props.muted}
      showExtraKeyLayout={props.showExtraKeyLayout || false}
      includeBlockKey={props.includeBlockKey || false}
    />
    : ''}
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
  toggleKeyboard: boolean,
}
export const TwoCol = (props: TwoColProps) => {
  let heightVirtual = 'calc(100% - 199px)';
  let heightPhysical = 'calc(100% - 35px)';
  if (props.toggleKeyboard) {
    const swap = heightVirtual;
    heightVirtual = heightPhysical;
    heightPhysical = swap;
  }

  return (
    <>
      <div css={{
        display: 'block',
        [SMALL_AND_UP]: {
          display: 'flex',
        },
        minHeight: heightVirtual,
        height: heightVirtual,
        [HAS_PHYSICAL_KEYBOARD]: {
          minHeight: heightPhysical,
          height: heightPhysical,
        },
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
        toggleKeyboard={props.toggleKeyboard}
        keyboardHandler={props.keyboardHandler}
        muted={props.muted}
        showExtraKeyLayout={props.showExtraKeyLayout}
        includeBlockKey={props.includeBlockKey}
      />
    </>
  );
};
