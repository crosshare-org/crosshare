/** @jsx jsx */
import { jsx } from '@emotion/core';

import * as React from 'react';
import { RouteComponentProps } from "@reach/router";
//import { MobileView } from "react-device-detect";
import Keyboard from 'react-simple-keyboard';
import 'react-simple-keyboard/build/css/index.css';

import { TopBar } from './TopBar';
import {HEADER_FOOTER_HEIGHT} from './style';

interface SquareAndColsProps {
  square: React.ReactNode,
  left: React.ReactNode,
  right: React.ReactNode
}
export const SquareAndCols = (props: SquareAndColsProps) => {
  const showKeyboard = true;
  const keyboardHeight = showKeyboard ? 140 : 0;
  const heightAdjust = keyboardHeight + HEADER_FOOTER_HEIGHT;

  return (
    <div css={{
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'end',
      justifyContent: 'space-around',
    }}>
      <div css={{
        padding: '5px',
        height: 'calc(min(75vh - ' + heightAdjust + 'px, 100vw))',
        width: 'calc(min(75vh - ' + heightAdjust + 'px, 100vw))',
        '@media (min-width: 576px)': {
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
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'end',
        flex: 'auto',
        width: '100vw',
        height: '25vh',
        '@media (min-width: 576px)': {
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
      { showKeyboard ?
       <Keyboard
       layout={{
         'default': [
           'Q W E R T Y U I O P {bksp}',
           '{prev} A S D F G H J K L {dir} {next}',
           '{prevEntry} Z X C V B N M {num} {rebus} {nextEntry}',
         ]}}
         display={{
           '{bksp}': '⌫',
           '{prev}': '←',
           '{dir}': '↴',
           '{next}': '→',
           '{prevEntry}': '⇤',
           '{num}': '123',
           '{rebus}': 'Rebus',
           '{nextEntry}': '⇥',
         }}
        onKeyPress={button =>
          console.log(button)}
        /> : " " }
    </div>
  );
}

export const SquareTest = (_: RouteComponentProps) => {
  return (
    <Page>
      <SquareAndCols
        square={<div css={{ border: '1px solid black', backgroundColor: 'blue', height: '100%' }}>a</div>}
        left={<div css={{ border: '1px solid black', backgroundColor: 'green', height: '100%' }}>b</div>}
        right={<div css={{ border: '1px solid black', backgroundColor: 'yellow', height: '100%' }}>c</div>}
      />
    </Page>
  );
}

interface PageProps extends RouteComponentProps {
  children: React.ReactNode
}

export const Page = (props: PageProps) => {
  return (
    <React.Fragment>
      <TopBar />
      {props.children}
    </React.Fragment>
  );
}
