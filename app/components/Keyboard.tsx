import {
  type ReactNode,
  memo,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from 'react';
import { AiOutlineEnter } from 'react-icons/ai';
import {
  FaAngleDoubleLeft,
  FaAngleDoubleRight,
  FaAngleLeft,
  FaAngleRight,
  FaBackspace,
} from 'react-icons/fa';
import { clsx } from '../lib/utils';
import { CrosshareAudioContext } from './CrosshareAudioContext';
import styles from './Keyboard.module.css';

interface KeyRowsProps {
  children: ReactNode;
  toggleKeyboard: boolean;
}

const KeyRows = (props: KeyRowsProps) => {
  return (
    <div data-toggled={props.toggleKeyboard} className={styles.keyRows}>
      {props.children}
    </div>
  );
};

interface KeyRowProps {
  children: ReactNode;
}
const KeyRow = (props: KeyRowProps) => {
  return <div className={styles.keyRow}>{props.children}</div>;
};

interface KeyProps {
  keyStroke: string;
  display?: ReactNode;
  onKeypress: (key: string) => void;
  smallSize?: boolean;
  largeSize?: boolean;
  smallFont?: boolean;
  onlyOnTablet?: boolean;
  notOnTablet?: boolean;
  className?: string;
}
const Key = (props: KeyProps) => {
  return (
    <button
      data-small-font={props.smallFont}
      data-small-size={props.smallSize}
      data-large-size={props.largeSize}
      data-only-on-tablet={props.onlyOnTablet}
      data-not-on-tablet={props.notOnTablet}
      className={clsx(styles.key, props.className)}
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
      initAudioContext();
      return;
    }
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unnecessary-condition
    if (!playKeystrokeSound.current && !muted && audioContext) {
      fetch('/keypress.mp3')
        .then((response) => response.arrayBuffer())
        .then(async (buffer) => {
          const gainNode = audioContext.createGain();
          gainNode.gain.value = 0.7;
          gainNode.connect(audioContext.destination);
          await audioContext.decodeAudioData(buffer, (audioBuffer) => {
            playKeystrokeSound.current = () => {
              const source = audioContext.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(gainNode);
              source.start();
            };
          });
        })
        .catch((e: unknown) => {
          console.error('error loading keypress', e);
        });
    }
  }, [muted, audioContext, initAudioContext]);

  const keypress = useCallback(
    (key: string) => {
      if (!muted && playKeystrokeSound.current) {
        playKeystrokeSound.current();
      }
      keyboardHandler(key);
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
            className={styles.block}
            keyStroke="{block}"
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
