import useEventListener from '@use-it/event-listener';
import {
  useCallback,
  useReducer,
  useMemo,
  useRef,
  useState,
  useEffect,
} from 'react';
import {
  FaSave,
  FaWindowClose,
  FaEllipsisH,
  FaVolumeUp,
  FaVolumeMute,
  FaKeyboard,
} from 'react-icons/fa';
import { usePersistedBoolean, usePolyfilledResizeObserver } from '../lib/hooks';
import {
  Direction,
  fromKeyboardEvent,
  fromKeyString,
  KeyK,
} from '../lib/types';
import { fromCells } from '../lib/viewableGrid';
import { Rebus, EscapeKey } from './Icons';
import { Keyboard } from './Keyboard';
import {
  TopBar,
  TopBarLink,
  TopBarDropDown,
  TopBarDropDownLink,
} from './TopBar';
import {
  gridInterfaceReducer,
  KeypressAction,
  PasteAction,
} from '../reducers/reducer';
import { isSome } from 'fp-ts/lib/Option';
import { GridView } from './Grid';
import { logAsyncErrors } from '../lib/utils';
import { isTextInput } from '../lib/domUtils';

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
      if (isSome(mkey)) {
        const kpa: KeypressAction = { type: 'KEYPRESS', key: mkey.value };
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
      if (isSome(mkey)) {
        const kpa: KeypressAction = { type: 'KEYPRESS', key: mkey.value };
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
      <div
        css={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
        }}
      >
        <div css={{ flex: 'none' }}>
          <TopBar>{topBarChildren}</TopBar>
        </div>
        <div
          css={{ flex: '1 1 auto', overflow: 'scroll', position: 'relative' }}
        >
          <div
            // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
            tabIndex={0}
            css={{
              outline: 'none',
              display: 'flex',
              flex: '1 1 auto',
              flexDirection: 'column',
              alignItems: 'center',
              height: '100%',
              width: '100%',
              position: 'absolute',
              flexWrap: 'nowrap',
              containerType: 'size',
            }}
            ref={containerRef}
          >
            <div
              aria-label="grid"
              css={{
                margin: 'auto',
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
        <div css={{ flex: 'none', width: '100%' }}>
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
