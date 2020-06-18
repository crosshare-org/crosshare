import { ReactNode, memo, useRef, useEffect, useContext, useCallback } from 'react';
import {
  FaBackspace, FaAngleRight, FaAngleLeft, FaAngleDoubleRight, FaAngleDoubleLeft,
} from 'react-icons/fa';
import { AiOutlineEnter } from 'react-icons/ai';

import { CrosshareAudioContext } from './CrosshareAudioContext';
import { KEYBOARD_HEIGHT, SMALL_AND_UP, HAS_PHYSICAL_KEYBOARD, HAS_PHYSICAL_KEYBOARD_RULES } from '../lib/style';

export const KeyRows = (props: KeyRowProps) => {
  return (
    <div css={{
      [HAS_PHYSICAL_KEYBOARD]: {
        display: 'none'
      },
      fontFamily: '"HelveticaNeue-Light", "Helvetica Neue Light", "Helvetica Neue", Helvetica, Arial, "Lucida Grande", sans-serif',
      width: '100%',
      height: KEYBOARD_HEIGHT,
      overflow: 'hidden',
      padding: '4px',
      borderRadius: '5px',
      userSelect: 'none',
      background: 'var(--kb-bg)',
    }}>{props.children}</div>
  );
};

interface KeyRowProps {
  addMarginLeft?: boolean,
  children: ReactNode
}
export const KeyRow = (props: KeyRowProps) => {
  return (
    <div css={{
      marginLeft: props.addMarginLeft ? '5%' : 0,
      [SMALL_AND_UP]: {
        marginLeft: 0
      },
      display: 'flex',
      paddingTop: 10,
    }}>{props.children}</div>
  );
};

interface KeyProps {
  keyStroke: string,
  display?: ReactNode,
  onKeypress: (key: string) => void,
  smallSize?: boolean,
  largeSize?: boolean,
  smallFont?: boolean,
  backgroundColor?: string,
  onlyOnTablet?: boolean,
  notOnTablet?: boolean
}
export const Key = (props: KeyProps) => {
  return (
    <button css={{
      padding: 0,
      border: 'none',
      fontSize: props.smallFont ? '90%' : '100%',
      background: props.backgroundColor ? props.backgroundColor : 'var(--key-bg)',
      flex: props.smallSize ? '0.5 1 0 ' : (props.largeSize ? '1.6 1 0 ' : '1 1 0'),
      cursor: 'pointer',
      boxShadow: '0 0 3px -1px rgba(0,0,0,.3)',
      height: '40px',
      borderRadius: '5px',
      borderBottom: '1px solid var(--key-ul)',
      justifyContent: 'center',
      alignItems: 'center',
      display: props.onlyOnTablet ? 'none' : 'flex',
      [SMALL_AND_UP]: {
        display: props.notOnTablet ? 'none' : 'flex',
      },
      '&:not(:last-child)': {
        marginRight: '5px'
      },
      WebkitTapHighlightColor: 'rgba(0, 0, 0, 0)',
      '&:active': {
        background: 'var(--key-bg-click)',
      },
    }} onClick={() => { props.onKeypress(props.keyStroke); }}>{props.display || props.keyStroke}</button>
  );
};

interface KeyboardProps {
  muted: boolean,
  keyboardHandler: (key: string) => void,
  showExtraKeyLayout: boolean,
  includeBlockKey: boolean,
}
export const Keyboard = memo(function Keyboard({ muted, keyboardHandler, ...props }: KeyboardProps) {
  const [audioContext, initAudioContext] = useContext(CrosshareAudioContext);
  const playKeystrokeSound = useRef<(() => void) | null>(null);

  useEffect(() => {
    const showingKeyboard = window.matchMedia(HAS_PHYSICAL_KEYBOARD_RULES).matches;

    if (!audioContext) {
      return initAudioContext();
    }
    if (!playKeystrokeSound.current && !muted && showingKeyboard && audioContext) {
      fetch('/keypress.mp3')
        .then(response => response.arrayBuffer())
        .then((buffer) => {
          const gainNode = audioContext.createGain();
          gainNode.gain.value = 0.7;
          gainNode.connect(audioContext.destination);
          audioContext.decodeAudioData(buffer, (audioBuffer) => {
            playKeystrokeSound.current = () => {
              const source = audioContext.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(gainNode);
              source.start();
            };
          });
        });
    }
  }, [muted, audioContext, initAudioContext]);

  const keypress = useCallback((key: string) => {
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
        <Key onlyOnTablet keyStroke='{bksp}' display={<FaBackspace />} onKeypress={keypress} />

      </KeyRow>
      <KeyRow addMarginLeft={props.includeBlockKey}>
        <Key onlyOnTablet={props.includeBlockKey} keyStroke='{prev}' smallSize={true} display={<FaAngleLeft />} onKeypress={keypress} />
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
          : ''
        }
        <Key onlyOnTablet keyStroke='{dir}' smallSize={props.includeBlockKey} display={<AiOutlineEnter />} onKeypress={keypress} />
        <Key onlyOnTablet={props.includeBlockKey} keyStroke='{next}' smallSize={true} display={<FaAngleRight />} onKeypress={keypress} />
      </KeyRow>
      <KeyRow>
        <Key onlyOnTablet keyStroke='{prevEntry}' display={<FaAngleDoubleLeft />} onKeypress={keypress} />
        <Key notOnTablet keyStroke='{num}' smallFont={true} largeSize={true} display="More" onKeypress={keypress} />
        <Key keyStroke='Z' onKeypress={keypress} />
        <Key keyStroke='X' onKeypress={keypress} />
        <Key keyStroke='C' onKeypress={keypress} />
        <Key keyStroke='V' onKeypress={keypress} />
        <Key keyStroke='B' onKeypress={keypress} />
        <Key keyStroke='N' onKeypress={keypress} />
        <Key keyStroke='M' onKeypress={keypress} />
        <Key onlyOnTablet keyStroke='{num}' display="More" onKeypress={keypress} />
        <Key onlyOnTablet keyStroke='{rebus}' display="Rebus" onKeypress={keypress} />
        <Key onlyOnTablet keyStroke='{nextEntry}' display={<FaAngleDoubleRight />} onKeypress={keypress} />
        <Key notOnTablet keyStroke='{bksp}' largeSize={true} display={<FaBackspace />} onKeypress={keypress} />
      </KeyRow>
    </KeyRows>
  );
});
