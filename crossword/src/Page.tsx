/** @jsx jsx */
import { jsx } from '@emotion/core';

import * as React from 'react';
import { RouteComponentProps } from "@reach/router";
import Keyboard from 'react-simple-keyboard';
import 'react-simple-keyboard/build/css/index.css';
import { FaKeyboard } from 'react-icons/fa';
import { FaTabletAlt } from 'react-icons/fa';

import { TopBar, TopBarLink } from './TopBar';
import { HEADER_FOOTER_HEIGHT } from './style';

interface SquareAndColsProps {
  square: React.ReactNode,
  left: React.ReactNode,
  right: React.ReactNode,
  tinyColumn?: React.ReactNode,
  showKeyboard: boolean,
  isTablet: boolean,
}
export const SquareAndCols = (props: SquareAndColsProps) => {
  const [showNumericKeyboard, setShowNumericKeyboard] = React.useState(false);

  const keyboardHeight = props.showKeyboard ? 140 : 0;
  const heightAdjust = keyboardHeight + HEADER_FOOTER_HEIGHT;

  function handleKeypress(key: string) {
    if (key === '{num}' || key === '{abc}') {
      setShowNumericKeyboard(!showNumericKeyboard);
    }
  }

  function layoutName(numeric: boolean, tablet: boolean) {
    let base = "default";
    if (numeric) {
      base = "extra";
    }
    if (tablet) {
      return base + "Tablet";
    }
    return base;
  }

  return (
    <React.Fragment>
      <div css={{
        display: 'flex',
        flexDirection: 'column',
        '@media (min-width: 576px)': {
          flexDirection: 'row',
          alignItems: 'start',
        },
        flexWrap: 'nowrap',
        alignItems: 'center',
        minHeight: 'calc(100vh - ' + heightAdjust + 'px)',
        height: 'calc(100vh - ' + heightAdjust + 'px)',
      }}>
        <div css={{
          flexShrink: 0,
          height: 'calc(min(87vh - ' + heightAdjust + 'px, 100vw))',
          width: 'calc(min(87vh - ' + heightAdjust + 'px, 100vw))',
          '@media (min-width: 576px)': {
            padding: '5px',
            height: 'calc(min(100vh - ' + heightAdjust + 'px, 66vw))',
            width: 'calc(min(100vh - ' + heightAdjust + 'px, 66vw))',
          },
          '@media (min-width: 992px)': {
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
          '@media (min-width: 576px)': {
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
          '@media (min-width: 576px)': {
            display: 'flex',
            width: '34vw',
            height: 'calc(100vh - ' + heightAdjust + 'px)',
          },
          '@media (min-width: 992px)': {
            width: '50vw',
            height: 'calc(100vh - ' + heightAdjust + 'px)',

          },
        }}>
          <div css={{
            flex: 'auto',
            padding: '0',
            width: '100%',
            height: '50%',
            '@media (min-width: 576px)': {
              padding: '5px 5px 0 0',
            },
            '@media (min-width: 992px)': {
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
            '@media (min-width: 576px)': {
              padding: '0 5px 5px 0',
            },
            '@media (min-width: 992px)': {
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
              '{num} Z X C V B N M {bksp}',
            ],
            'extra': [
              '1 2 3 4 5 6 7 8 9 0',
              '! @ # $ % & * - =',
              '{abc} + \' , . : / ? {rebus} {bksp}',
            ],
            'defaultTablet': [
              'Q W E R T Y U I O P {bksp}',
              '{prev} A S D F G H J K L {dir} {next}',
              '{prevEntry} Z X C V B N M {num} {rebus} {nextEntry}',
            ],
            'extraTablet': [
              '1 2 3 4 5 6 7 8 9 0 {bksp}',
              '{prev} ! @ # $ % & * - = {dir} {next}',
              '{prevEntry} + \' , . : / ? {abc} {rebus} {nextEntry}',
            ],
          }}
          layoutName={layoutName(showNumericKeyboard, props.isTablet)}
          display={{
            '{bksp}': '⌫',
            '{prev}': '←',
            '{dir}': '↴',
            '{next}': '→',
            '{prevEntry}': '⇤',
            '{num}': '123',
            '{abc}': 'ABC',
            '{rebus}': 'Rebus',
            '{nextEntry}': '⇥',
          }}
          onKeyPress={handleKeypress}
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
