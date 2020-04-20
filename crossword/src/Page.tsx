/** @jsx jsx */
import { jsx } from '@emotion/core';

import * as React from 'react';
import { RouteComponentProps } from "@reach/router";
import {
  FaKeyboard, FaTabletAlt, FaAngleDoubleRight, FaAngleDoubleLeft,
} from 'react-icons/fa';
import { Helmet } from "react-helmet-async";

import { Keyboard } from './Keyboard';
import { Square } from './Square';
import { KeypressAction } from './reducer';
import { TopBar, TopBarLink } from './TopBar';
import {
  heightAdjustment,
  SMALL_AND_UP, LARGE_AND_UP, TINY_COL_MIN_HEIGHT,
} from './style';


interface TinyNavProps {
  children: React.ReactNode,
  dispatch: React.Dispatch<KeypressAction>,
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
      }} onClick={() => dispatch({ elapsed: 0, type: "KEYPRESS", key: "{prevEntry}", shift: false })}>
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
      }} onClick={() => dispatch({ elapsed: 0, type: "KEYPRESS", key: "{nextEntry}", shift: false })}>
        <FaAngleDoubleRight />
      </div>
    </div>
  );
}

interface SquareAndColsProps {
  muted: boolean,
  square: (size: number) => React.ReactNode,
  left: React.ReactNode,
  right: React.ReactNode,
  tinyColumn?: React.ReactNode,
  showKeyboard: boolean,
  keyboardHandler: (key: string) => void,
  showExtraKeyLayout: boolean,
  includeBlockKey: boolean,
  isTablet: boolean,
}
export const SquareAndCols = (props: SquareAndColsProps) => {
  const heightAdjust = heightAdjustment(props.showKeyboard);

  return (
    <React.Fragment>
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
    </React.Fragment>
  );
}

export const SquareTest = (_: RouteComponentProps) => {
  const [showKeyboard, setShowKeyboard] = React.useState(false);
  const [isTablet, setIsTablet] = React.useState(false);
  const toggleKeyboard = () => setShowKeyboard(!showKeyboard);
  const toggleTablet = () => setIsTablet(!isTablet);
  return (
    <Page title="Square Test" topBarElements={
      <React.Fragment>
        <TopBarLink icon={<FaKeyboard />} text="Toggle Keyboard" onClick={toggleKeyboard} />
        <TopBarLink icon={<FaTabletAlt />} text="Toggle Tablet" onClick={toggleTablet} />
      </React.Fragment>
    }>
      <SquareAndCols
        keyboardHandler={(s) => {console.log(s)}}
        muted={false}
        showKeyboard={showKeyboard}
        showExtraKeyLayout={false}
        isTablet={isTablet}
        includeBlockKey={false}
        tinyColumn={<div css={{ border: '1px solid black', backgroundColor: 'red', height: '100%' }}>TINY</div>}
        square={(size: number) => <div css={{ border: '1px solid black', backgroundColor: 'blue', height: '100%' }}>{size}</div>}
        left={<div css={{ border: '1px solid black', backgroundColor: 'green', height: '100%' }}>b</div>}
        right={<div css={{ border: '1px solid black', backgroundColor: 'yellow', height: '100%' }}>c</div>}
      />
    </Page>
  );
}

interface TwoColProps {
  muted: boolean,
  left: React.ReactNode,
  right: React.ReactNode,
  showKeyboard: boolean,
  keyboardHandler: (key: string) => void,
  showExtraKeyLayout: boolean,
  includeBlockKey: boolean,
  isTablet: boolean,
}
export const TwoCol = (props: TwoColProps) => {
  const heightAdjust = heightAdjustment(props.showKeyboard);

  return (
    <React.Fragment>
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
    </React.Fragment>
  );
}

export const TwoColTest = (_: RouteComponentProps) => {
  const [showKeyboard, setShowKeyboard] = React.useState(false);
  const [isTablet, setIsTablet] = React.useState(false);
  const toggleKeyboard = () => setShowKeyboard(!showKeyboard);
  const toggleTablet = () => setIsTablet(!isTablet);
  return (
    <Page title="Two Col Test" topBarElements={
      <React.Fragment>
        <TopBarLink icon={<FaKeyboard />} text="Toggle Keyboard" onClick={toggleKeyboard} />
        <TopBarLink icon={<FaTabletAlt />} text="Toggle Tablet" onClick={toggleTablet} />
      </React.Fragment>
    }>
      <TwoCol
        keyboardHandler={(s) => {console.log(s)}}
        muted={false}
        showKeyboard={showKeyboard}
        showExtraKeyLayout={false}
        isTablet={isTablet}
        includeBlockKey={false}
        left={<div css={{ border: '1px solid black', backgroundColor: 'green', height: '100%' }}>b</div>}
        right={<div css={{ border: '1px solid black', backgroundColor: 'yellow', height: '100%' }}>c</div>}
      />
    </Page>
  );
}

interface PageProps extends RouteComponentProps {
  children: React.ReactNode,
  title: string | null,
  topBarElements?: React.ReactNode,
}

export const Page = (props: PageProps) => {
  return (
    <React.Fragment>
      {props.title !== null ?
        <Helmet>
          <title>{props.title}</title>
        </Helmet>
        :
        ""
      }
      <TopBar>{props.topBarElements}</TopBar>
      {props.children}
    </React.Fragment>
  );
}
