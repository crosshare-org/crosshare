import useEventListener from '@use-it/event-listener';
import { useCallback, useReducer, useMemo } from 'react';
import {
  FaSave,
  FaWindowClose,
  FaEllipsisH,
  FaVolumeUp,
  FaVolumeMute,
} from 'react-icons/fa';
import { usePersistedBoolean } from '../lib/hooks';
import {
  Direction,
  KeyK,
} from '../lib/types';
import { fromCells } from '../lib/viewableGrid';
import { Rebus, EscapeKey } from './Icons';
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
import { GridView } from './Grid';
import { HiddenInput, useKeyboard } from './HiddenInput';

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

  const [muted, setMuted] = usePersistedBoolean('muted', false);

  const [hiddenInputRef, focusGrid] = useKeyboard();

  const pasteHandler = useCallback(
    (e: ClipboardEvent) => {
      const tagName = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tagName === 'textarea' || tagName === 'input') {
        return;
      }
      const pa: PasteAction = {
        type: 'PASTE',
        content: e.clipboardData?.getData('Text') || '',
      };
      dispatch(pa);
      e.preventDefault();
    },
    [dispatch]
  );
  useEventListener('paste', pasteHandler);

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
            </>
          )}
        </TopBarDropDown>
      </>
    );
  }, [focusGrid, initialGrid.cells, muted, props, setMuted, state.grid.cells]);

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
        <HiddenInput ref={hiddenInputRef} dispatch={dispatch} />
        <div
          onClick={focusGrid}
          onKeyDown={focusGrid}
          tabIndex={0}
          role={'textbox'}
          css={{ flex: '1 1 auto', overflow: 'scroll', position: 'relative' }}
        >
          <div
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
          >
            <div
              aria-label="grid"
              css={{
                margin: 'auto',
                width: `min(100cqw, 100cqh * ${aspectRatio})`,
                height: `min(100cqh, 100cqw / ${aspectRatio})`,
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
      </div>
    </>
  );
}
