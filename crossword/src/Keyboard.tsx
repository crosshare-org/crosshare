/** @jsx jsx */
import { jsx } from '@emotion/core';

import * as React from 'react';
import axios from 'axios';
import {
  FaBackspace, FaSync, FaAngleRight, FaAngleLeft, FaAngleDoubleRight, FaAngleDoubleLeft,
} from 'react-icons/fa';

import { CrosshareAudioContext } from "./App";

export const KeyRows = (props: KeyRowProps) => {
  return (
    <div css={{
      fontFamily: '"HelveticaNeue-Light", "Helvetica Neue Light", "Helvetica Neue", Helvetica, Arial, "Lucida Grande", sans-serif',
      width: '100%',
      overflow: 'hidden',
      padding: '4px',
      borderRadius: '5px',
      userSelect: 'none',
      background: 'var(--kb-bg)',
    }}>{props.children}</div>
  );
}

interface KeyRowProps {
  addMarginLeft?: boolean,
  children: React.ReactNode
}
export const KeyRow = (props: KeyRowProps) => {
  return (
    <div css={{
      marginLeft: props.addMarginLeft ? '5%' : 0,
      display: 'flex',
      paddingTop: 12,
    }}>{props.children}</div>
  );
}

interface KeyProps {
  keyStroke: string,
  display?: React.ReactNode,
  onKeypress: (key: string) => void,
  smallSize?: boolean,
  largeSize?: boolean,
  smallFont?: boolean,
  backgroundColor?: string,
}
export const Key = (props: KeyProps) => {
  return (
    <div css={{
      fontSize: props.smallFont ? '90%' : '100%',
      background: props.backgroundColor ? props.backgroundColor : 'var(--key-bg)',
      flex: props.smallSize ? '0.5 0 0 ' : (props.largeSize ? '1.6 0 0 ' : '1 0 0'),
      cursor: 'pointer',
      boxShadow: '0 0 3px -1px rgba(0,0,0,.3)',
      height: '40px',
      borderRadius: '5px',
      borderBottom: '1px solid var(--key-ul)',
      justifyContent: 'center',
      alignItems: 'center',
      display: 'flex',
      '&:not(:last-child)': {
        marginRight: '5px'
      },
      WebkitTapHighlightColor: 'rgba(0, 0, 0, 0)',
      '&:active': {
        background: 'var(--key-bg-click)',
      },
    }} onClick={() => { props.onKeypress(props.keyStroke) }}>{props.display || props.keyStroke}</div>
  );
}

interface KeyboardProps {
  muted: boolean,
  showKeyboard: boolean,
  keyboardHandler: (key: string) => void,
  showExtraKeyLayout: boolean,
  includeBlockKey: boolean,
  isTablet: boolean,
}
export const Keyboard = React.memo(({ muted, showKeyboard, keyboardHandler, ...props }: KeyboardProps) => {
  const [audioContext, initAudioContext] = React.useContext(CrosshareAudioContext);
  const playKeystrokeSound = React.useRef<(() => void) | null>(null);

  React.useEffect(() => {
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

  const keypress = React.useCallback((key: string) => {
    if (!muted && playKeystrokeSound.current) {
      playKeystrokeSound.current();
    }
    if (keyboardHandler) {
      keyboardHandler(key);
    }
  }, [muted, keyboardHandler]);

  if (props.showExtraKeyLayout) {
    return (
      <KeyRows>
        <KeyRow>
          <Key keyStroke='1' onKeypress={keypress} />
          <Key keyStroke='2' onKeypress={keypress} />
          <Key keyStroke='3' onKeypress={keypress} />
          <Key keyStroke='4' onKeypress={keypress} />
          <Key keyStroke='5' onKeypress={keypress} />
        </KeyRow>
        <KeyRow>
          <Key keyStroke='6' onKeypress={keypress} />
          <Key keyStroke='7' onKeypress={keypress} />
          <Key keyStroke='8' onKeypress={keypress} />
          <Key keyStroke='9' onKeypress={keypress} />
          <Key keyStroke='0' onKeypress={keypress} />
        </KeyRow>
        <KeyRow>
          <Key keyStroke='{abc}' display="ABC" onKeypress={keypress} />
          <Key keyStroke='{rebus}' display="Rebus" onKeypress={keypress} />
          <Key keyStroke='{bksp}' display={<FaBackspace />} onKeypress={keypress} />
        </KeyRow>
      </KeyRows>
    );
  }
  return (
    <KeyRows>
      <KeyRow>
        <Key keyStroke='Q' onKeypress={keypress} />
        <Key keyStroke='W' onKeypress={keypress} />
        <Key keyStroke='E' onKeypress={keypress} />
        <Key keyStroke='R' onKeypress={keypress} />
        <Key keyStroke='T' onKeypress={keypress} />
        <Key keyStroke='Y' onKeypress={keypress} />
        <Key keyStroke='U' onKeypress={keypress} />
        <Key keyStroke='I' onKeypress={keypress} />
        <Key keyStroke='O' onKeypress={keypress} />
        <Key keyStroke='P' onKeypress={keypress} />
        {props.isTablet ?
          <Key keyStroke='{bksp}' display={<FaBackspace />} onKeypress={keypress} />
          : ""
        }
      </KeyRow>
      <KeyRow addMarginLeft={props.includeBlockKey && !props.isTablet}>
        {props.isTablet || !props.includeBlockKey ?
          <Key keyStroke='{prev}' smallSize={true} display={<FaAngleLeft />} onKeypress={keypress} />
          : ""
        }
        <Key keyStroke='A' onKeypress={keypress} />
        <Key keyStroke='S' onKeypress={keypress} />
        <Key keyStroke='D' onKeypress={keypress} />
        <Key keyStroke='F' onKeypress={keypress} />
        <Key keyStroke='G' onKeypress={keypress} />
        <Key keyStroke='H' onKeypress={keypress} />
        <Key keyStroke='J' onKeypress={keypress} />
        <Key keyStroke='K' onKeypress={keypress} />
        <Key keyStroke='L' onKeypress={keypress} />
        {props.includeBlockKey ?
          <Key keyStroke='{block}' backgroundColor="var(--cell-wall)" smallSize={true} display=" " onKeypress={keypress} />
          : ""
        }
        {props.isTablet ?
          <Key keyStroke='{dir}' smallSize={props.includeBlockKey} display={<FaSync />} onKeypress={keypress} />
          : ""
        }
        {props.isTablet || !props.includeBlockKey ?
          <Key keyStroke='{next}' smallSize={true} display={<FaAngleRight />} onKeypress={keypress} />
          : ""
        }
      </KeyRow>
      <KeyRow>
        {props.isTablet ?
          <Key keyStroke='{prevEntry}' display={<FaAngleDoubleLeft />} onKeypress={keypress} />
          :
          <Key keyStroke='{num}' smallFont={true} largeSize={true} display="More" onKeypress={keypress} />
        }
        <Key keyStroke='Z' onKeypress={keypress} />
        <Key keyStroke='X' onKeypress={keypress} />
        <Key keyStroke='C' onKeypress={keypress} />
        <Key keyStroke='V' onKeypress={keypress} />
        <Key keyStroke='B' onKeypress={keypress} />
        <Key keyStroke='N' onKeypress={keypress} />
        <Key keyStroke='M' onKeypress={keypress} />
        {props.isTablet ?
          <React.Fragment>
            <Key keyStroke='{num}' display="More" onKeypress={keypress} />
            <Key keyStroke='{rebus}' display="Rebus" onKeypress={keypress} />
            <Key keyStroke='{nextEntry}' display={<FaAngleDoubleRight />} onKeypress={keypress} />
          </React.Fragment>
          :
          <Key keyStroke='{bksp}' largeSize={true} display={<FaBackspace />} onKeypress={keypress} />
        }
      </KeyRow>
    </KeyRows>
  );
});
