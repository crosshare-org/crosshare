import {
  type ReactNode,
  RefObject,
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
import { clsx } from '../lib/utils.js';
import { CrosshareAudioContext } from './CrosshareAudioContext.js';
import styles from './Keyboard.module.scss';

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
  touched: RefObject<boolean>;
}
const Key = ({ touched, ...props }: KeyProps) => {
  return (
    <button
      data-small-font={props.smallFont}
      data-small-size={props.smallSize}
      data-large-size={props.largeSize}
      data-only-on-tablet={props.onlyOnTablet}
      data-not-on-tablet={props.notOnTablet}
      className={clsx(styles.key, props.className)}
      onClick={(e) => {
        e.preventDefault();
        if (touched.current) {
          touched.current = false;
        } else {
          props.onKeypress(props.keyStroke);
        }
      }}
      onTouchStart={() => {
        touched.current = true;
        props.onKeypress(props.keyStroke);
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

  const touched = useRef(false);

  if (props.showExtraKeyLayout) {
    return (
      <KeyRows toggleKeyboard={props.toggleKeyboard}>
        <KeyRow>
          <Key touched={touched} keyStroke="1" onKeypress={keypress} />
          <Key touched={touched} keyStroke="2" onKeypress={keypress} />
          <Key touched={touched} keyStroke="3" onKeypress={keypress} />
          <Key touched={touched} keyStroke="4" onKeypress={keypress} />
          <Key touched={touched} keyStroke="5" onKeypress={keypress} />
          <Key touched={touched} keyStroke="6" onKeypress={keypress} />
          <Key touched={touched} keyStroke="7" onKeypress={keypress} />
          <Key touched={touched} keyStroke="8" onKeypress={keypress} />
          <Key touched={touched} keyStroke="9" onKeypress={keypress} />
          <Key touched={touched} keyStroke="0" onKeypress={keypress} />
        </KeyRow>
        <KeyRow>
          <Key touched={touched} keyStroke="Ñ" onKeypress={keypress} />
          <Key touched={touched} keyStroke="Å" onKeypress={keypress} />
          <Key touched={touched} keyStroke="Ä" onKeypress={keypress} />
          <Key touched={touched} keyStroke="Ö" onKeypress={keypress} />
          <Key touched={touched} keyStroke="&" onKeypress={keypress} />
          <Key touched={touched} keyStroke="/" onKeypress={keypress} />
          <Key touched={touched} keyStroke="\" onKeypress={keypress} />
        </KeyRow>
        <KeyRow>
          <Key
            touched={touched}
            keyStroke="{abc}"
            display="ABC"
            onKeypress={keypress}
          />
          <Key
            touched={touched}
            keyStroke="{rebus}"
            display="Rebus"
            onKeypress={keypress}
          />
          <Key
            touched={touched}
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
        <Key touched={touched} keyStroke="Q" onKeypress={keypress} />
        <Key touched={touched} keyStroke="W" onKeypress={keypress} />
        <Key touched={touched} keyStroke="E" onKeypress={keypress} />
        <Key touched={touched} keyStroke="R" onKeypress={keypress} />
        <Key touched={touched} keyStroke="T" onKeypress={keypress} />
        <Key touched={touched} keyStroke="Y" onKeypress={keypress} />
        <Key touched={touched} keyStroke="U" onKeypress={keypress} />
        <Key touched={touched} keyStroke="I" onKeypress={keypress} />
        <Key touched={touched} keyStroke="O" onKeypress={keypress} />
        <Key touched={touched} keyStroke="P" onKeypress={keypress} />
        <Key
          touched={touched}
          onlyOnTablet
          keyStroke="{bksp}"
          display={<FaBackspace />}
          onKeypress={keypress}
        />
      </KeyRow>
      <KeyRow>
        <Key
          touched={touched}
          onlyOnTablet={props.includeBlockKey}
          keyStroke="{prev}"
          smallSize={true}
          display={<FaAngleLeft />}
          onKeypress={keypress}
        />
        <Key touched={touched} keyStroke="A" onKeypress={keypress} />
        <Key touched={touched} keyStroke="S" onKeypress={keypress} />
        <Key touched={touched} keyStroke="D" onKeypress={keypress} />
        <Key touched={touched} keyStroke="F" onKeypress={keypress} />
        <Key touched={touched} keyStroke="G" onKeypress={keypress} />
        <Key touched={touched} keyStroke="H" onKeypress={keypress} />
        <Key touched={touched} keyStroke="J" onKeypress={keypress} />
        <Key touched={touched} keyStroke="K" onKeypress={keypress} />
        <Key touched={touched} keyStroke="L" onKeypress={keypress} />
        {props.includeBlockKey ? (
          <Key
            touched={touched}
            className={styles.block}
            keyStroke="{block}"
            display=" "
            onKeypress={keypress}
          />
        ) : (
          ''
        )}
        <Key
          touched={touched}
          onlyOnTablet
          keyStroke="{dir}"
          smallSize={props.includeBlockKey}
          display={<AiOutlineEnter />}
          onKeypress={keypress}
        />
        <Key
          touched={touched}
          onlyOnTablet={props.includeBlockKey}
          keyStroke="{next}"
          smallSize={true}
          display={<FaAngleRight />}
          onKeypress={keypress}
        />
      </KeyRow>
      <KeyRow>
        <Key
          touched={touched}
          onlyOnTablet
          keyStroke="{prevEntry}"
          display={<FaAngleDoubleLeft />}
          onKeypress={keypress}
        />
        <Key
          touched={touched}
          notOnTablet
          keyStroke="{num}"
          smallFont={true}
          largeSize={true}
          display="More"
          onKeypress={keypress}
        />
        <Key touched={touched} keyStroke="Z" onKeypress={keypress} />
        <Key touched={touched} keyStroke="X" onKeypress={keypress} />
        <Key touched={touched} keyStroke="C" onKeypress={keypress} />
        <Key touched={touched} keyStroke="V" onKeypress={keypress} />
        <Key touched={touched} keyStroke="B" onKeypress={keypress} />
        <Key touched={touched} keyStroke="N" onKeypress={keypress} />
        <Key touched={touched} keyStroke="M" onKeypress={keypress} />
        <Key
          touched={touched}
          onlyOnTablet
          keyStroke="{num}"
          display="More"
          onKeypress={keypress}
        />
        <Key
          touched={touched}
          onlyOnTablet
          keyStroke="{rebus}"
          display="Rebus"
          onKeypress={keypress}
        />
        <Key
          touched={touched}
          onlyOnTablet
          keyStroke="{nextEntry}"
          display={<FaAngleDoubleRight />}
          onKeypress={keypress}
        />
        <Key
          touched={touched}
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
