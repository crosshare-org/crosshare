import useEventListener from '@use-it/event-listener';
import { useRef, useCallback, useReducer, useMemo } from 'react';
import { FaSave, FaWindowClose, FaEllipsisH, FaVolumeUp, FaVolumeMute, FaKeyboard } from 'react-icons/fa';
import { usePersistedBoolean } from '../lib/hooks';
import { Direction, fromKeyboardEvent, fromKeyString, KeyK } from '../lib/types';
import { fromCells } from '../lib/viewableGrid';
import { Rebus, EscapeKey } from './Icons';
import { Keyboard } from './Keyboard';
import { TopBar, TopBarLink, TopBarDropDown, TopBarDropDownLink } from './TopBar';
import { gridInterfaceReducer, KeypressAction, PasteAction } from '../reducers/reducer';
import { Square } from './Square';
import { GridView } from './Grid';
import { isSome } from 'fp-ts/lib/Option';

export function AlternateSolutionEditor(props: { grid: string[], width: number, height: number, highlighted: Set<number>, highlight: 'circle' | 'shade', cancel: () => void, save: (alt: Record<number, string>) => Promise<void> }) {
  const initialGrid = fromCells({
    mapper: (e) => e,
    width: props.width,
    height: props.height,
    cells: props.grid,
    allowBlockEditing: false,
    highlighted: props.highlighted,
    highlight: props.highlight,
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

  const [muted, setMuted] = usePersistedBoolean('muted', false);
  const [toggleKeyboard, setToggleKeyboard] = usePersistedBoolean(
    'keyboard',
    false
  );

  const gridRef = useRef<HTMLDivElement | null>(null);

  const focusGrid = useCallback(() => {
    if (gridRef.current) {
      gridRef.current.focus();
    }
  }, []);

  const physicalKeyboardHandler = useCallback(
    (e: KeyboardEvent) => {
      const tagName = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tagName === 'textarea' || tagName === 'input') {
        return;
      }
      const mkey = fromKeyboardEvent(e);
      if (isSome(mkey)) {
        const kpa: KeypressAction = { type: 'KEYPRESS', key: mkey.value };
        dispatch(kpa);
        e.preventDefault();
      }
    },
    [dispatch]
  );
  useEventListener(
    'keydown',
    physicalKeyboardHandler,
    gridRef.current || undefined
  );

  const pasteHandler = useCallback((e: ClipboardEvent) => {
    const tagName = (e.target as HTMLElement)?.tagName?.toLowerCase();
    if (tagName === 'textarea' || tagName === 'input') {
      return;
    }
    const pa: PasteAction = {
      type: 'PASTE',
      content: e.clipboardData?.getData('Text') || ''
    };
    dispatch(pa);
    e.preventDefault();
  }, [dispatch]);
  useEventListener(
    'paste',
    pasteHandler
  );

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
          onClick={async () => {
            const alt: Record<number, string> = {};
            let hadAny = false;
            for (const [idx, cellValue] of state.grid.cells.entries()) {
              const defaultCellValue = initialGrid.cells[idx];
              if (cellValue.trim() && cellValue.trim() != defaultCellValue?.trim()) {
                hadAny = true;
                alt[idx] = cellValue;
              }
            }
            if (!hadAny) {
              props.cancel();
              return;
            }
            return props.save(alt).then(() => props.cancel());
          }}
        />
        <TopBarLink
          icon={<FaWindowClose />}
          text="Cancel"
          onClick={props.cancel}
        />
        <TopBarDropDown onClose={focusGrid} icon={<FaEllipsisH />} text="More">
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
                  onClick={() => setMuted(false)}
                />
              ) : (
                <TopBarDropDownLink
                  icon={<FaVolumeMute />}
                  text="Mute"
                  onClick={() => setMuted(true)}
                />
              )}
              <TopBarDropDownLink
                icon={<FaKeyboard />}
                text="Toggle Keyboard"
                onClick={() => setToggleKeyboard(!toggleKeyboard)}
              />
            </>
          )}
        </TopBarDropDown>
      </>
    );
  }, [focusGrid, initialGrid.cells, muted, props, setMuted, setToggleKeyboard, state.grid.cells, toggleKeyboard]);

  const parentRef = useRef<HTMLDivElement | null>(null);

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
            ref={(instance) => {
              parentRef.current = instance;
            }}
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
            }}
          >
            <Square
              noColumns={true}
              waitToResize={false}
              parentRef={parentRef}
              aspectRatio={props.width / props.height}
              contents={(width: number, _height: number) => {
                return (
                  <GridView
                    isEnteringRebus={state.isEnteringRebus}
                    rebusValue={state.rebusValue}
                    squareWidth={width}
                    grid={state.grid}
                    defaultGrid={initialGrid}
                    active={state.active}
                    dispatch={dispatch}
                    allowBlockEditing={false}
                    autofill={[]}
                  />
                );
              }}
            />
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