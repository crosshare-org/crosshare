import type { Root } from 'hast';
import {
  Dispatch,
  KeyboardEvent,
  MouseEvent,
  RefObject,
  memo,
  useRef,
} from 'react';
import { EntryBase, GridBase, valAt } from '../lib/gridBase';
import { SMALL_AND_UP } from '../lib/style';
import { Direction, Position } from '../lib/types';
import { CluedEntry, RefPosition } from '../lib/viewableGrid';
import { PuzzleAction } from '../reducers/commonActions';
import { ClickedEntryAction } from '../reducers/gridReducer';
import styles from './ClueList.module.css';
import { ClueText } from './ClueText';

interface ClueListItemProps {
  dimCompleted: boolean;
  isEnteringRebus?: boolean;
  rebusValue?: string;
  conceal: boolean;
  entry: CluedEntry;
  hast: Root;
  dispatch: Dispatch<PuzzleAction>;
  isActive: boolean;
  isCross: boolean;
  isRefed: boolean;
  active: Position | null;
  wasEntryClick: boolean;
  showEntry: boolean;
  grid: GridBase<EntryBase>;
  scrollToCross: boolean;
  listRef: RefObject<HTMLDivElement>;
}

const ClueListItem = memo(function ClueListItem({
  isActive,
  isCross,
  ...props
}: ClueListItemProps) {
  const ref = useRef<HTMLLIElement>(null);
  if (ref.current && props.listRef.current) {
    if (
      (isActive && !props.wasEntryClick) ||
      (props.scrollToCross && isCross)
    ) {
      props.listRef.current.scrollTop =
        ref.current.offsetTop - props.listRef.current.offsetTop;
    }
  }
  function click(e: MouseEvent | KeyboardEvent) {
    if ((e.target as HTMLElement).tagName.toLowerCase() === 'a') {
      return;
    }
    e.preventDefault();
    if (isActive) {
      props.dispatch({ type: 'CHANGEDIRECTION' });
      return;
    }
    const ca: ClickedEntryAction = {
      type: 'CLICKEDENTRY',
      entryIndex: props.entry.index,
    };
    props.dispatch(ca);
  }
  return (
    <li
      data-active={isActive}
      data-cross={isCross}
      data-show-entry={props.showEntry}
      data-refed={props.isRefed}
      className={styles.item}
      ref={ref}
      key={props.entry.index}
    >
      <div
        className="outlineNone width100"
        role="button"
        tabIndex={0}
        onClick={click}
        onKeyPress={click}
      >
        <div className={styles.outer}>
          <div className={styles.label}>
            {props.entry.labelNumber}
            <span className={styles.direction}>
              {props.entry.direction === Direction.Across ? 'A' : 'D'}
            </span>
          </div>
          <div
            css={{
              flex: '1 1 auto',
              height: '100%',
              color: props.conceal
                ? 'transparent'
                : props.entry.completedWord && props.dimCompleted
                ? 'var(--completed-clue)'
                : 'var(--text)',
              textShadow: props.conceal ? '0 0 1em var(--conceal-text)' : '',
            }}
          >
            <div>
              <ClueText entry={props.entry} hast={props.hast} />
            </div>
            {props.showEntry ? (
              <div>
                {props.entry.cells.map((a) => {
                  const isActiveCell =
                    props.active &&
                    a.row === props.active.row &&
                    a.col === props.active.col;
                  return (
                    <span
                      key={a.col + '-' + a.row}
                      css={{
                        display: 'inline-block',
                        textAlign: 'center',
                        fontWeight: 'bold',
                        minWidth: '1em',
                        color: 'var(--text)',
                        border: isActiveCell
                          ? props.isEnteringRebus
                            ? '1px solid var(--primary)'
                            : '1px solid var(--black)'
                          : '1px solid transparent',
                      }}
                    >
                      {props.isEnteringRebus && isActiveCell
                        ? // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
                          props.rebusValue || '|'
                        : valAt(props.grid, a).trim() || '-'}
                    </span>
                  );
                })}
              </div>
            ) : (
              ''
            )}
          </div>
        </div>
      </div>
    </li>
  );
});

interface ClueListProps {
  conceal: boolean;
  dimCompleted: boolean;
  header: string;
  current?: number;
  active: Position;
  wasEntryClick: boolean;
  cross?: number;
  refed: Set<number>;
  entries: CluedEntry[];
  allEntries?: CluedEntry[];
  refPositions?: RefPosition[][];
  dispatch: Dispatch<PuzzleAction>;
  showEntries: boolean;
  isEnteringRebus?: boolean;
  rebusValue?: string;
  grid: GridBase<EntryBase>;
  scrollToCross: boolean;
}

export const ClueList = (props: ClueListProps): JSX.Element => {
  const ref = useRef<HTMLDivElement>(null);
  const clues = props.entries.map((entry) => {
    const isActive = props.current === entry.index;
    const isCross = props.cross === entry.index;
    const isRefed = props.refed.has(entry.index);
    return (
      <ClueListItem
        dimCompleted={props.dimCompleted}
        listRef={ref}
        wasEntryClick={props.wasEntryClick}
        scrollToCross={props.scrollToCross}
        isEnteringRebus={props.isEnteringRebus}
        rebusValue={props.rebusValue}
        grid={props.grid}
        showEntry={props.showEntries}
        entry={entry}
        hast={entry.clueHast}
        conceal={props.conceal}
        key={entry.index}
        dispatch={props.dispatch}
        isActive={isActive}
        isCross={isCross}
        isRefed={isRefed}
        active={
          props.showEntries && (isActive || isCross) ? props.active : null
        }
      />
    );
  });
  return (
    <div
      css={{
        height: '100% !important',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        [SMALL_AND_UP]: {
          display: 'unset',
          alignItems: 'unset',
        },
      }}
    >
      <div
        css={{
          display: 'none',
          [SMALL_AND_UP]: {
            display: 'block',
          },
          fontWeight: 'bold',
          borderBottom: '1px solid var(--autofill)',
          height: '1.5em',
          paddingLeft: '0.5em',
          backgroundColor: 'var(--bg)',
          textTransform: 'uppercase',
          letterSpacing: '1.36px',
          color: 'var(--readable-primary)',
        }}
      >
        {props.header}
      </div>
      <div
        ref={ref}
        css={{
          maxHeight: '100%',
          [SMALL_AND_UP]: {
            maxHeight: 'calc(100% - 1.5em)',
          },
          overflowY: 'scroll',
          scrollbarWidth: 'none',
        }}
      >
        <ol
          css={{
            margin: 0,
            padding: 0,
          }}
        >
          {clues}
        </ol>
      </div>
    </div>
  );
};
