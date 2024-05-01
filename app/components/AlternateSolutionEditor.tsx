import useEventListener from '@use-it/event-listener';
import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
import {
  FaEllipsisH,
  FaKeyboard,
  FaSave,
  FaVolumeMute,
  FaVolumeUp,
  FaWindowClose,
} from 'react-icons/fa';
import { isTextInput } from '../lib/domUtils';
import { usePersistedBoolean, usePolyfilledResizeObserver } from '../lib/hooks';
import {
  Direction,
  KeyK,
  fromKeyString,
  fromKeyboardEvent,
} from '../lib/types';
import { logAsyncErrors } from '../lib/utils';
import { fromCells } from '../lib/viewableGrid';
import { KeypressAction } from '../reducers/commonActions';
import { PasteAction, gridInterfaceReducer } from '../reducers/gridReducer';
import styles from './AlternateSolutionEditor.module.css';
import { GridView } from './Grid';
import { EscapeKey, Rebus } from './Icons';
import { Keyboard } from './Keyboard';
import {
  TopBar,
  TopBarDropDown,
  TopBarDropDownLink,
  TopBarLink,
} from './TopBar';

export function AlternateSolutionEditor(props: {
  grid: string[];
  width: number;
  height: number;
  vBars: Set<number>;
  hBars: Set<number>;
  hidden: Set<number>;
  highlighted: Set<number>;
  highlight: 'circle' | 'shade';
  cancel: () => void;
  save: (alt: Record<number, string>) => Promise<void>;
}) {
  const initialGrid = fromCells({
    mapper: (e) => e,
    width: props.width,
    height: props.height,
    cells: props.grid,
    vBars: props.vBars,
    hBars: props.hBars,
    allowBlockEditing: false,
    highlighted: props.highlighted,
    highlight: props.highlight,
    hidden: props.hidden,
  });

  const [state, dispatch] = useReducer(gridInterfaceReducer, {
    type: 'alternate-editor',
    active: { col: 0, row: 0, dir: Direction.Across },
    grid: initialGrid,
    wasEntryClick: false,
    showExtraKeyLayout: false,
    isEnteringRebus: false,
    rebusValue: '',
    downsOnly: false,
    isEditable: () => true,
  });

  const [muted, setMuted] = usePersistedBoolean('muted', true);
  const [toggleKeyboard, setToggleKeyboard] = usePersistedBoolean(
    'keyboard',
    false
  );

  const physicalKeyboardHandler = useCallback(
    (e: KeyboardEvent) => {
      const mkey = fromKeyboardEvent(e);
      if (mkey !== null) {
        const kpa: KeypressAction = { type: 'KEYPRESS', key: mkey };
        dispatch(kpa);
        e.preventDefault();
      }
    },
    [dispatch]
  );
  useEventListener('keydown', physicalKeyboardHandler);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const { width: cqw, height: cqh } = usePolyfilledResizeObserver(containerRef);
  const [useCQ, setUseCQ] = useState(true);
  useEffect(() => {
    if (!('container' in document.documentElement.style)) {
      setUseCQ(false);
    }
  }, []);

  const pasteHandler = useCallback(
    (e: ClipboardEvent) => {
      if (isTextInput(e.target)) {
        return;
      }
      const pa: PasteAction = {
        type: 'PASTE',
        content: e.clipboardData?.getData('Text') ?? '',
      };
      dispatch(pa);
      e.preventDefault();
    },
    [dispatch]
  );
  useEventListener('paste', pasteHandler);

  const keyboardHandler = useCallback(
    (key: string) => {
      const mkey = fromKeyString(key);
      if (mkey !== null) {
        const kpa: KeypressAction = { type: 'KEYPRESS', key: mkey };
        dispatch(kpa);
      }
    },
    [dispatch]
  );

  const topBarChildren = useMemo(() => {
    return (
      <>
        <TopBarLink
          icon={<FaSave />}
          text="Add Alternate"
          onClick={logAsyncErrors(async () => {
            const alt: Record<number, string> = {};
            let hadAny = false;
            for (const [idx, cellValue] of state.grid.cells.entries()) {
              const defaultCellValue = initialGrid.cells[idx];
              if (
                cellValue.trim() &&
                cellValue.trim() != defaultCellValue?.trim()
              ) {
                hadAny = true;
                alt[idx] = cellValue;
              }
            }
            if (!hadAny) {
              props.cancel();
              return;
            }
            return props.save(alt).then(() => {
              props.cancel();
            });
          })}
        />
        <TopBarLink
          icon={<FaWindowClose />}
          text="Cancel"
          onClick={props.cancel}
        />
        <TopBarDropDown icon={<FaEllipsisH />} text="More">
          {() => (
            <>
              <TopBarDropDownLink
                icon={<Rebus />}
                text="Enter Rebus"
                shortcutHint={<EscapeKey />}
                onClick={() => {
                  const a: KeypressAction = {
                    type: 'KEYPRESS',
                    key: { k: KeyK.Escape },
                  };
                  dispatch(a);
                }}
              />
              {muted ? (
                <TopBarDropDownLink
                  icon={<FaVolumeUp />}
                  text="Unmute"
                  onClick={() => {
                    setMuted(false);
                  }}
                />
              ) : (
                <TopBarDropDownLink
                  icon={<FaVolumeMute />}
                  text="Mute"
                  onClick={() => {
                    setMuted(true);
                  }}
                />
              )}
              <TopBarDropDownLink
                icon={<FaKeyboard />}
                text="Toggle Keyboard"
                onClick={() => {
                  setToggleKeyboard(!toggleKeyboard);
                }}
              />
            </>
          )}
        </TopBarDropDown>
      </>
    );
  }, [
    initialGrid.cells,
    muted,
    props,
    setMuted,
    setToggleKeyboard,
    state.grid.cells,
    toggleKeyboard,
  ]);

  const aspectRatio = props.width / props.height;

  return (
    <>
      <div className={styles.page}>
        <div className="flexNone">
          <TopBar>{topBarChildren}</TopBar>
        </div>
        <div className={styles.main}>
          <div
            // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
            tabIndex={0}
            className={styles.container}
            ref={containerRef}
          >
            <div
              aria-label="grid"
              className="marginAuto"
              style={{
                width: useCQ
                  ? `min(100cqw, 100cqh * ${aspectRatio})`
                  : `min(${cqw}px, ${cqh}px * ${aspectRatio})`,
                height: useCQ
                  ? `min(100cqh, 100cqw / ${aspectRatio})`
                  : `min(${cqh}px, ${cqw}px / ${aspectRatio})`,
              }}
            >
              <GridView
                isEnteringRebus={state.isEnteringRebus}
                rebusValue={state.rebusValue}
                grid={state.grid}
                defaultGrid={initialGrid}
                active={state.active}
                dispatch={dispatch}
                allowBlockEditing={false}
                autofill={[]}
              />
            </div>
          </div>
        </div>
        <div className="flexNone width100">
          <Keyboard
            toggleKeyboard={toggleKeyboard}
            keyboardHandler={keyboardHandler}
            muted={muted}
            showExtraKeyLayout={state.showExtraKeyLayout}
            includeBlockKey={false}
          />
        </div>
      </div>
    </>
  );
}
