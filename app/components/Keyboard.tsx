import {
  ReactNode,
  memo,
  useRef,
  useEffect,
  useContext,
  useCallback,
} from 'react';
import {
  FaBackspace,
  FaAngleRight,
  FaAngleLeft,
  FaAngleDoubleRight,
  FaAngleDoubleLeft,
} from 'react-icons/fa';
import { AiOutlineEnter } from 'react-icons/ai';

import { CrosshareAudioContext } from './CrosshareAudioContext';
import {
  KEYBOARD_HEIGHT,
  SMALL_AND_UP,
  HAS_PHYSICAL_KEYBOARD,
} from '../lib/style';

interface KeyRowsProps {
  children: ReactNode;
  toggleKeyboard: boolean;
}

const KeyRows = (props: KeyRowsProps) => {
  return (
    <div
      css={{
        display: props.toggleKeyboard ? 'none' : 'block',
        [HAS_PHYSICAL_KEYBOARD]: {
          display: props.toggleKeyboard ? 'block' : 'none',
        },
        fontFamily:
          '"HelveticaNeue-Light", "Helvetica Neue Light", "Helvetica Neue", Helvetica, Arial, "Lucida Grande", sans-serif',
        width: '100%',
        height: KEYBOARD_HEIGHT,
        overflow: 'hidden',
        padding: '4px',
        borderRadius: '5px',
        userSelect: 'none',
        background: 'var(--kb-bg)',
      }}
    >
      {props.children}
    </div>
  );
};

interface KeyRowProps {
  children: ReactNode;
}
const KeyRow = (props: KeyRowProps) => {
  return (
    <div
      css={{
        display: 'flex',
        paddingTop: 10,
      }}
    >
      {props.children}
    </div>
  );
};

interface KeyProps {
  keyStroke: string;
  display?: ReactNode;
  onKeypress: (key: string) => void;
  smallSize?: boolean;
  largeSize?: boolean;
  smallFont?: boolean;
  backgroundColor?: string;
  onlyOnTablet?: boolean;
  notOnTablet?: boolean;
  className?: string;
}
const Key = (props: KeyProps) => {
  return (
    <button
      className={props.className}
      css={{
        '&:focus': {
          outline: 'none',
        },
        padding: 0,
        border: 'none',
        fontSize: props.smallFont ? '90%' : '100%',
        background: props.backgroundColor
          ? props.backgroundColor
          : 'var(--key-bg)',
        flex: props.smallSize
          ? '0.5 1 0 '
          : props.largeSize
          ? '1.6 1 0 '
          : '1 1 0',
        cursor: 'pointer',
        color: 'var(--black)',
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
          marginRight: '5px',
        },
        WebkitTapHighlightColor: 'rgba(0, 0, 0, 0)',
        '&:active': {
          background: props.backgroundColor
            ? props.backgroundColor
            : 'var(--key-bg-click)',
        },
      }}
      onClick={(e) => {
        props.onKeypress(props.keyStroke);
        e.preventDefault();
      }}
    >
      {props.display !== undefined ? props.display : props.keyStroke}
    </button>
  );
};

interface KeyboardProps {
  muted: boolean;
  keyboardHandler: (key: string) => void;
  showExtraKeyLayout: boolean;
  includeBlockKey: boolean;
  toggleKeyboard: boolean;
}
export const Keyboard = memo(function Keyboard({
  muted,
  keyboardHandler,
  ...props
}: KeyboardProps) {
  const [audioContext, initAudioContext] = useContext(CrosshareAudioContext);
  const playKeystrokeSound = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!audioContext) {
      return initAudioContext();
    }
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (!playKeystrokeSound.current && !muted && audioContext) {
      fetch('/keypress.mp3')
        .then((response) => response.arrayBuffer())
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

  const keypress = useCallback(
    (key: string) => {
      if (!muted && playKeystrokeSound.current) {
        playKeystrokeSound.current();
      }
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      if (keyboardHandler) {
        keyboardHandler(key);
      }
    },
    [muted, keyboardHandler]
  );

  if (props.showExtraKeyLayout) {
    return (
      <KeyRows toggleKeyboard={props.toggleKeyboard}>
        <KeyRow>
          <Key keyStroke="1" onKeypress={keypress} />
          <Key keyStroke="2" onKeypress={keypress} />
          <Key keyStroke="3" onKeypress={keypress} />
          <Key keyStroke="4" onKeypress={keypress} />
          <Key keyStroke="5" onKeypress={keypress} />
          <Key keyStroke="Ñ" onKeypress={keypress} />
        </KeyRow>
        <KeyRow>
          <Key keyStroke="6" onKeypress={keypress} />
          <Key keyStroke="7" onKeypress={keypress} />
          <Key keyStroke="8" onKeypress={keypress} />
          <Key keyStroke="9" onKeypress={keypress} />
          <Key keyStroke="0" onKeypress={keypress} />
          <Key keyStroke="&" onKeypress={keypress} />
        </KeyRow>
        <KeyRow>
          <Key keyStroke="{abc}" display="ABC" onKeypress={keypress} />
          <Key keyStroke="{rebus}" display="Rebus" onKeypress={keypress} />
          <Key
            keyStroke="{bksp}"
            display={<FaBackspace />}
            onKeypress={keypress}
          />
        </KeyRow>
      </KeyRows>
    );
  }
  return (
    <KeyRows toggleKeyboard={props.toggleKeyboard}>
      <KeyRow>
        <Key keyStroke="Q" onKeypress={keypress} />
        <Key keyStroke="W" onKeypress={keypress} />
        <Key keyStroke="E" onKeypress={keypress} />
        <Key keyStroke="R" onKeypress={keypress} />
        <Key keyStroke="T" onKeypress={keypress} />
        <Key keyStroke="Y" onKeypress={keypress} />
        <Key keyStroke="U" onKeypress={keypress} />
        <Key keyStroke="I" onKeypress={keypress} />
        <Key keyStroke="O" onKeypress={keypress} />
        <Key keyStroke="P" onKeypress={keypress} />
        <Key
          onlyOnTablet
          keyStroke="{bksp}"
          display={<FaBackspace />}
          onKeypress={keypress}
        />
      </KeyRow>
      <KeyRow>
        <Key
          onlyOnTablet={props.includeBlockKey}
          keyStroke="{prev}"
          smallSize={true}
          display={<FaAngleLeft />}
          onKeypress={keypress}
        />
        <Key keyStroke="A" onKeypress={keypress} />
        <Key keyStroke="S" onKeypress={keypress} />
        <Key keyStroke="D" onKeypress={keypress} />
        <Key keyStroke="F" onKeypress={keypress} />
        <Key keyStroke="G" onKeypress={keypress} />
        <Key keyStroke="H" onKeypress={keypress} />
        <Key keyStroke="J" onKeypress={keypress} />
        <Key keyStroke="K" onKeypress={keypress} />
        <Key keyStroke="L" onKeypress={keypress} />
        {props.includeBlockKey ? (
          <Key
            css={{ border: '1px solid var(--cell-wall)' }}
            keyStroke="{block}"
            backgroundColor="repeating-linear-gradient(-45deg,var(--cell-wall),var(--cell-wall) 10px,var(--primary) 10px,var(--primary) 20px);"
            display=" "
            onKeypress={keypress}
          />
        ) : (
          ''
        )}
        <Key
          onlyOnTablet
          keyStroke="{dir}"
          smallSize={props.includeBlockKey}
          display={<AiOutlineEnter />}
          onKeypress={keypress}
        />
        <Key
          onlyOnTablet={props.includeBlockKey}
          keyStroke="{next}"
          smallSize={true}
          display={<FaAngleRight />}
          onKeypress={keypress}
        />
      </KeyRow>
      <KeyRow>
        <Key
          onlyOnTablet
          keyStroke="{prevEntry}"
          display={<FaAngleDoubleLeft />}
          onKeypress={keypress}
        />
        <Key
          notOnTablet
          keyStroke="{num}"
          smallFont={true}
          largeSize={true}
          display="More"
          onKeypress={keypress}
        />
        <Key keyStroke="Z" onKeypress={keypress} />
        <Key keyStroke="X" onKeypress={keypress} />
        <Key keyStroke="C" onKeypress={keypress} />
        <Key keyStroke="V" onKeypress={keypress} />
        <Key keyStroke="B" onKeypress={keypress} />
        <Key keyStroke="N" onKeypress={keypress} />
        <Key keyStroke="M" onKeypress={keypress} />
        <Key
          onlyOnTablet
          keyStroke="{num}"
          display="More"
          onKeypress={keypress}
        />
        <Key
          onlyOnTablet
          keyStroke="{rebus}"
          display="Rebus"
          onKeypress={keypress}
        />
        <Key
          onlyOnTablet
          keyStroke="{nextEntry}"
          display={<FaAngleDoubleRight />}
          onKeypress={keypress}
        />
        <Key
          notOnTablet
          keyStroke="{bksp}"
          largeSize={true}
          display={<FaBackspace />}
          onKeypress={keypress}
        />
      </KeyRow>
    </KeyRows>
  );
});
