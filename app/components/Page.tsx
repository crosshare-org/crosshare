import { Dispatch, ReactNode, useState } from 'react';
import {
  FaKeyboard, FaTabletAlt, FaAngleDoubleRight, FaAngleDoubleLeft,
} from 'react-icons/fa';

import { Keyboard } from './Keyboard';
import { Square } from './Square';
import { KeypressAction } from '../reducers/reducer';
import { TopBar, TopBarLink } from './TopBar';
import {
  heightAdjustment,
  SMALL_AND_UP, LARGE_AND_UP, TINY_COL_MIN_HEIGHT,
} from '../lib/style';


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
      <div css={{
        width: '2em',
        textAlign: 'center',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRight: '1px solid var(--clue-bg)',
      }} onClick={() => dispatch({ type: "KEYPRESS", key: "{prevEntry}", shift: false })}>
        <FaAngleDoubleLeft />
      </div>
      <div css={{
        flex: '1 1 auto',
      }}>{children}</div>
      <div css={{
        width: '2em',
        textAlign: 'center',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderLeft: '1px solid var(--clue-bg)',
      }} onClick={() => dispatch({ type: "KEYPRESS", key: "{nextEntry}", shift: false })}>
        <FaAngleDoubleRight />
      </div>
    </div>
  );
}

interface SquareAndColsProps {
  muted: boolean,
  square: (size: number) => ReactNode,
  left: ReactNode,
  right: ReactNode,
  tinyColumn?: ReactNode,
  showKeyboard: boolean,
  keyboardHandler: (key: string) => void,
  showExtraKeyLayout: boolean,
  includeBlockKey: boolean,
  isTablet: boolean,
}
export const SquareAndCols = (props: SquareAndColsProps) => {
  const heightAdjust = heightAdjustment(props.showKeyboard);

  return (
    <>
      <div css={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        [SMALL_AND_UP]: {
          flexDirection: 'row',
          alignItems: 'start',
        },
        flexWrap: 'nowrap',
        minHeight: 'calc(100% - ' + heightAdjust + 'px)',
        height: 'calc(100% - ' + heightAdjust + 'px)',
      }}>
        <Square heightAdjust={heightAdjust} contents={props.square} />
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
      {props.showKeyboard ?
        <Keyboard
          keyboardHandler={props.keyboardHandler}
          muted={props.muted}
          showKeyboard={props.showKeyboard}
          showExtraKeyLayout={props.showExtraKeyLayout}
          includeBlockKey={props.includeBlockKey}
          isTablet={props.isTablet}
        />
        : " "}
    </>
  );
}

interface TwoColProps {
  muted: boolean,
  left: ReactNode,
  right: ReactNode,
  showKeyboard: boolean,
  keyboardHandler: (key: string) => void,
  showExtraKeyLayout: boolean,
  includeBlockKey: boolean,
  isTablet: boolean,
}
export const TwoCol = (props: TwoColProps) => {
  const heightAdjust = heightAdjustment(props.showKeyboard);

  return (
    <>
      <div css={{
        display: 'block',
        [SMALL_AND_UP]: {
          display: 'flex',
        },
        minHeight: 'calc(100% - ' + heightAdjust + 'px)',
        height: 'calc(100% - ' + heightAdjust + 'px)',
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
      {props.showKeyboard ?
        <Keyboard
          keyboardHandler={props.keyboardHandler}
          muted={props.muted}
          showKeyboard={props.showKeyboard}
          showExtraKeyLayout={props.showExtraKeyLayout}
          includeBlockKey={props.includeBlockKey}
          isTablet={props.isTablet}
        />
        : " "}
    </>
  );
}
