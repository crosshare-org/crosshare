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
import { Direction, Position } from '../lib/types';
import { CluedEntry } from '../lib/viewableGrid';
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
      data-conceal={props.conceal}
      data-dim={Boolean(props.entry.completedWord && props.dimCompleted)}
      data-entering-rebus={props.isEnteringRebus}
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
          <div className={styles.clueText}>
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
                      data-active-cell={isActiveCell}
                      className={styles.clueModeCell}
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
    <div className={styles.listWrapper}>
      <div className={styles.listHeader}>{props.header}</div>
      <div ref={ref} className={styles.list}>
        <ol className="margin0 padding0">{clues}</ol>
      </div>
    </div>
  );
};
