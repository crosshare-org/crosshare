/** @jsx jsx */
import { jsx } from '@emotion/core';

import * as React from 'react';
import axios from 'axios';
import { RouteComponentProps } from "@reach/router";
import Keyboard from 'react-simple-keyboard';
import 'react-simple-keyboard/build/css/index.css';
import { FaKeyboard } from 'react-icons/fa';
import { FaTabletAlt } from 'react-icons/fa';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { Helmet } from "react-helmet-async";

import { Square } from './Square';
import { CrosshareAudioContext } from "./App";
import { KeypressAction } from './reducer';
import { TopBar, TopBarLink } from './TopBar';
import {
  heightAdjustment,
  SMALL_AND_UP, LARGE_AND_UP, TINY_COL_MIN_HEIGHT,
} from './style';

interface KeyboardProps {
  muted: boolean,
  showKeyboard: boolean,
  keyboardHandler?: (key: string) => void,
  showExtraKeyLayout: boolean,
  includeBlockKey: boolean,
  isTablet: boolean,
}

export const OurKeyboard = ({ muted, showKeyboard, ...props }: KeyboardProps) => {
  const [audioContext, initAudioContext] = React.useContext(CrosshareAudioContext);
  const mutedRef = React.useRef(muted);
  const playKeystrokeSound = React.useRef<(() => void) | null>(null);

  React.useEffect(() => {
    mutedRef.current = muted;

    if (!audioContext) {
      return initAudioContext();
    }

    if (!playKeystrokeSound.current && !muted && showKeyboard && audioContext) {
      axios.get(`${process.env.PUBLIC_URL}/keypress.mp3`, {
        responseType: 'arraybuffer',
      }).then((response) => {
        var gainNode = audioContext.createGain()
        gainNode.gain.value = 0.7;
        gainNode.connect(audioContext.destination)
        audioContext.decodeAudioData(response.data, (audioBuffer) => {
          playKeystrokeSound.current = () => {
            const source = audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(gainNode);
            source.start();
          }
        });
      });
    }
  }, [muted, showKeyboard, audioContext, initAudioContext]);
  function layoutName(numeric: boolean, tablet: boolean) {
    if (numeric) {
      return "extra";
    }
    if (tablet) {
      return props.includeBlockKey ? "defaultTabletBlock" : "defaultTablet";
    }
    return props.includeBlockKey ? 'defaultBlock' : 'default';
  }
  const keypress = (key: string) => {
    if (!mutedRef.current && playKeystrokeSound.current) {
      playKeystrokeSound.current();
    }
    if (props.keyboardHandler) {
      props.keyboardHandler(key);
    }
  }
  return (
    <Keyboard
      layout={{
        'default': [
          'Q W E R T Y U I O P',
          'A S D F G H J K L',
          '{num} Z X C V B N M {bksp}',
        ],
        'defaultBlock': [
          'Q W E R T Y U I O P',
          'A S D F G H J K L {block}',
          '{num} Z X C V B N M {bksp}',
        ],
        'extra': [
          '1 2 3 4 5',
          '6 7 8 9 0',
          '{abc} {rebus} {bksp}',
        ],
        'defaultTablet': [
          'Q W E R T Y U I O P {bksp}',
          '{prev} A S D F G H J K L {dir} {next}',
          '{prevEntry} Z X C V B N M {num} {rebus} {nextEntry}',
        ],
        'defaultTabletBlock': [
          'Q W E R T Y U I O P {bksp}',
          '{prev} A S D F G H J K L {block} {dir} {next}',
          '{prevEntry} Z X C V B N M {num} {rebus} {nextEntry}',
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
        '{block}': ' ',
      }}
      onKeyPress={keypress}
    />
  );
}

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
        <FaChevronLeft />
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
        <FaChevronRight />
      </div>
    </div>
  );
}

interface SquareAndColsProps {
  muted: boolean,
  square: (size:number) => React.ReactNode,
  left: React.ReactNode,
  right: React.ReactNode,
  tinyColumn?: React.ReactNode,
  showKeyboard: boolean,
  keyboardHandler?: (key: string) => void,
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
        minHeight: 'calc(100vh - ' + heightAdjust + 'px)',
        height: 'calc(100vh - ' + heightAdjust + 'px)',
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
        <OurKeyboard {...props} />
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
        muted={false}
        showKeyboard={showKeyboard}
        showExtraKeyLayout={false}
        isTablet={isTablet}
        includeBlockKey={false}
        tinyColumn={<div css={{ border: '1px solid black', backgroundColor: 'red', height: '100%' }}>TINY</div>}
        square={(size:number)=><div css={{ border: '1px solid black', backgroundColor: 'blue', height: '100%' }}>{size}</div>}
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
