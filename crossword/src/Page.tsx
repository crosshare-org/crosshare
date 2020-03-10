/** @jsx jsx */
import { jsx } from '@emotion/core';

import * as React from 'react';
import { RouteComponentProps } from "@reach/router";
import Keyboard from 'react-simple-keyboard';
import 'react-simple-keyboard/build/css/index.css';
import { FaKeyboard } from 'react-icons/fa';
import { FaTabletAlt } from 'react-icons/fa';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';

import { KeypressAction } from './Puzzle';
import { TopBar, TopBarLink } from './TopBar';
import { KEYBOARD_HEIGHT, HEADER_FOOTER_HEIGHT, SMALL_AND_UP, LARGE_AND_UP } from './style';

interface TinyNavProps {
  children: React.ReactNode,
  dispatch: React.Dispatch<KeypressAction>,
}
export const TinyNav = ({children, dispatch}: TinyNavProps) => {
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
      }} onClick={() => dispatch({type: "KEYPRESS", key: "{prevEntry}", shift: false})}>
      <FaChevronLeft/>
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
      }} onClick={() => dispatch({type: "KEYPRESS", key: "{nextEntry}", shift: false})}>
      <FaChevronRight/>
      </div>
    </div>
  );
}

interface SquareAndColsProps {
  square: React.ReactNode,
  left: React.ReactNode,
  right: React.ReactNode,
  tinyColumn?: React.ReactNode,
  showKeyboard: boolean,
  keyboardHandler?: (key:string) => void,
  showExtraKeyLayout: boolean,
  isTablet: boolean,
}
export const SquareAndCols = (props: SquareAndColsProps) => {
  const keyboardHeight = props.showKeyboard ? KEYBOARD_HEIGHT : 0;
  const heightAdjust = keyboardHeight + HEADER_FOOTER_HEIGHT;

  function layoutName(numeric: boolean, tablet: boolean) {
    if (numeric) {
      return "extra";
    }
    if (tablet) {
      return "defaultTablet";
    }
    return 'default';
  }

  return (
    <React.Fragment>
      <div css={{
        display: 'flex',
        flexDirection: 'column',
        [SMALL_AND_UP]: {
          flexDirection: 'row',
          alignItems: 'start',
        },
        flexWrap: 'nowrap',
        alignItems: 'center',
        minHeight: 'calc(100% - ' + heightAdjust + 'px)',
        height: 'calc(100% - ' + heightAdjust + 'px)',
      }}>
        <div css={{
          flexShrink: 0,
          height: 'calc(min(87vh - ' + heightAdjust + 'px, 100vw))',
          width: 'calc(min(87vh - ' + heightAdjust + 'px, 100vw))',
          [SMALL_AND_UP]: {
            padding: '5px',
            height: 'calc(min(100vh - ' + heightAdjust + 'px, 66vw))',
            width: 'calc(min(100vh - ' + heightAdjust + 'px, 66vw))',
          },
          [LARGE_AND_UP]: {
            height: 'calc(min(100vh - ' + heightAdjust + 'px, 50vw))',
            width: 'calc(min(100vh - ' + heightAdjust + 'px, 50vw))',
          },
        }}>
          {props.square}
        </div>
        <div css={{
          flex: '1 1 auto',
          width: '100vw',
          height: '13vh',
          [SMALL_AND_UP]: {
            display: 'none',
          }
        }}>
          {props.tinyColumn}
        </div>
        <div css={{
          display: 'none',
          flex: 'auto',
          flexWrap: 'wrap',
          alignItems: 'end',
          [SMALL_AND_UP]: {
            display: 'flex',
            width: '34vw',
            height: 'calc(100vh - ' + heightAdjust + 'px)',
          },
          [LARGE_AND_UP]: {
            width: '50vw',
            height: 'calc(100vh - ' + heightAdjust + 'px)',

          },
        }}>
          <div css={{
            flex: 'auto',
            padding: '0',
            width: '100%',
            height: '50%',
            [SMALL_AND_UP]: {
              padding: '5px 5px 0 0',
            },
            [LARGE_AND_UP]: {
              paddingBottom: 5,
              width: '50%',
              height: '100%',
            },
          }}>{props.left}</div>
          <div css={{
            flex: 'auto',
            padding: '0',
            width: '100%',
            height: '50%',
            [SMALL_AND_UP]: {
              padding: '0 5px 5px 0',
            },
            [LARGE_AND_UP]: {
              paddingTop: 5,
              width: '50%',
              height: '100%',
            },
          }}>{props.right}</div>
        </div>
        </div>
      {props.showKeyboard ?
        <Keyboard
          layout={{
            'default': [
              'Q W E R T Y U I O P',
              'A S D F G H J K L',
              'Z X C V B N M {num} {bksp}',
            ],
            'extra': [
              '1 2 3 4 5',
              '6 7 8 9 0',
              '{rebus} {abc} {bksp}',
            ],
            'defaultTablet': [
              'Q W E R T Y U I O P {bksp}',
              '{prev} A S D F G H J K L {dir} {next}',
              '{prevEntry} Z X C V B N M {num} {nextEntry}',
            ],
          }}
          layoutName={layoutName(props.showExtraKeyLayout, props.isTablet)}
          display={{
            '{bksp}': '⌫',
            '{prev}': '←',
            '{dir}': '↴',
            '{next}': '→',
            '{prevEntry}': '⇤',
            '{num}': 'More',
            '{abc}': 'ABC',
            '{rebus}': 'Rebus',
            '{nextEntry}': '⇥',
          }}
          onKeyPress={props.keyboardHandler}
        />: " "}
    </React.Fragment>
  );
}

export const SquareTest = (_: RouteComponentProps) => {
  const [showKeyboard, setShowKeyboard] = React.useState(false);
  const [isTablet, setIsTablet] = React.useState(false);
  const toggleKeyboard = () => setShowKeyboard(!showKeyboard);
  const toggleTablet = () => setIsTablet(!isTablet);
  return (
    <Page topBarElements={
      <React.Fragment>
        <TopBarLink icon={<FaKeyboard />} text="Toggle Keyboard" onClick={toggleKeyboard} />
        <TopBarLink icon={<FaTabletAlt />} text="Toggle Tablet" onClick={toggleTablet} />
      </React.Fragment>
    }>
      <SquareAndCols
        showKeyboard={showKeyboard}
        showExtraKeyLayout={false}
        isTablet={isTablet}
        tinyColumn={<div css={{ border: '1px solid black', backgroundColor: 'red', height: '100%' }}>TINY</div>}
        square={<div css={{ border: '1px solid black', backgroundColor: 'blue', height: '100%' }}>a</div>}
        left={<div css={{ border: '1px solid black', backgroundColor: 'green', height: '100%' }}>b</div>}
        right={<div css={{ border: '1px solid black', backgroundColor: 'yellow', height: '100%' }}>c</div>}
      />
    </Page>
  );
}

interface PageProps extends RouteComponentProps {
  children: React.ReactNode,
  topBarElements?: React.ReactNode,
}

export const Page = (props: PageProps) => {
  return (
    <React.Fragment>
      <TopBar>{props.topBarElements}</TopBar>
      {props.children}
    </React.Fragment>
  );
}
