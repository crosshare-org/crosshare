import {
  useRef,
  Dispatch,
  memo,
  MouseEvent,
  KeyboardEvent,
  ReactNode,
  Fragment,
} from 'react';

import { Position, Direction } from '../lib/types';
import { CluedEntry } from '../lib/viewableGrid';
import { GridBase, valAt, EntryBase } from '../lib/gridBase';

import { PuzzleAction, ClickedEntryAction } from '../reducers/reducer';
import { SMALL_AND_UP } from '../lib/style';
import { ToolTipText } from './ToolTipText';

interface ClueTextProps {
  text: string;
  allEntries: Array<CluedEntry>;
  grid: GridBase<EntryBase>;
}
const ClueText = (props: ClueTextProps) => {
  let text = props.text;
  const parts: Array<ReactNode> = [];
  const re = /^(?<all>(?<num>\d+)(?<others>[, \d-]*?((and|&)[\d -]+)?)(?<dir>across|down))\b/i;
  const digit = /\d/;
  const oppo = /^(?<text>.+?)\b\d/;
  let i = 0;
  while (text) {
    const match = text.match(re);
    if (
      match &&
      match.groups &&
      match.groups.num &&
      match.groups.dir &&
      match.groups.all
    ) {
      const num = parseInt(match.groups.num);
      const dir =
        match.groups.dir.toLowerCase() === 'across'
          ? Direction.Across
          : Direction.Down;
      let matchLength = match.groups.all.length;
      if (match.groups.others?.match(digit)) {
        // There are more numbers, so only link on the digits themselves
        matchLength = match.groups.num.length;
      }
      const e = props.allEntries.find(
        (v) => v.labelNumber === num && v.direction === dir
      );
      if (!e) {
        parts.push(<Fragment key={i++}>{text.slice(0, matchLength)}</Fragment>);
      } else {
        parts.push(
          <ToolTipText
            key={i++}
            text={text.slice(0, matchLength)}
            tooltip={
              <>
                {e.clue}
                <b
                  css={{
                    marginLeft: '0.5em',
                    whiteSpace: 'nowrap',
                  }}
                >
                  [{e.cells.map((a) => valAt(props.grid, a).trim() || '-')}]
                </b>
              </>
            }
          />
        );
      }
      text = text.slice(matchLength);
    } else {
      const chaff = text.match(oppo);
      if (chaff && chaff.groups && chaff.groups.text) {
        parts.push(<Fragment key={i++}>{chaff.groups.text}</Fragment>);
        text = text.slice(chaff.groups.text.length);
      } else {
        parts.push(<Fragment key={i++}>{text}</Fragment>);
        text = '';
      }
    }
  }
  return <div>{parts}</div>;
};

interface ClueListItemProps {
  dimCompleted: boolean;
  conceal: boolean;
  entry: CluedEntry;
  dispatch: Dispatch<PuzzleAction>;
  isActive: boolean;
  isCross: boolean;
  isRefed: boolean;
  active: Position | null;
  wasEntryClick: boolean;
  showEntry: boolean;
  allEntries?: Array<CluedEntry>;
  grid: GridBase<EntryBase>;
  scrollToCross: boolean;
}

const ClueListItem = memo(function ClueListItem({
  isActive,
  isCross,
  ...props
}: ClueListItemProps) {
  const ref = useRef<HTMLLIElement>(null);
  if (ref.current) {
    if (
      (isActive && !props.wasEntryClick) ||
      (props.scrollToCross && isCross)
    ) {
      ref.current.scrollIntoView({ behavior: 'auto', block: 'center' });
    }
  }
  function click(e: MouseEvent | KeyboardEvent) {
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
      css={{
        display: isActive || props.showEntry ? 'list-item' : 'none',
        [SMALL_AND_UP]: {
          display: 'list-item',
        },
        padding: '0.5em',
        backgroundColor: isActive
          ? 'var(--lighter)'
          : isCross
            ? 'var(--secondary)'
            : props.isRefed
              ? 'var(--vlighter)'
              : 'none',
        listStyleType: 'none',
        cursor: 'pointer',
        '&:hover': {
          backgroundColor: isActive
            ? 'var(--lighter)'
            : isCross
              ? 'var(--cross-clue-bg)'
              : props.isRefed
                ? 'var(--vvlighter)'
                : 'var(--clue-bg)',
        },
        width: '100%',
      }}
      ref={ref}
      key={props.entry.index}
    >
      <div
        css={{
          outline: 'none',
          display: 'flex',
          flexDirection: 'row',
          flexWrap: 'nowrap',
          alignItems: 'center',
          width: '100%',
        }}
        role="button"
        tabIndex={0}
        onClick={click}
        onKeyPress={click}
      >
        <div
          css={{
            display: props.showEntry ? 'block' : 'none',
            [SMALL_AND_UP]: {
              display: 'block',
            },
            flexShrink: 0,
            width: '3em',
            height: '100%',
            fontWeight: 'bold',
            textAlign: 'right',
            padding: '0 0.5em',
          }}
        >
          {props.entry.labelNumber}
          <span
            css={{
              [SMALL_AND_UP]: { display: 'none' },
            }}
          >
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
                ? 'var(--default-text)'
                : 'var(--black)',
            textShadow: props.conceal ? '0 0 1em var(--conceal-text)' : '',
          }}
        >
          {props.allEntries ? (
            <ClueText
              text={props.entry.clue}
              allEntries={props.allEntries}
              grid={props.grid}
            />
          ) : (
            <div>{props.entry.clue}</div>
          )}
          {props.showEntry ? (
            <div>
              {props.entry.cells.map((a) => {
                return (
                  <span
                    key={a.col + '-' + a.row}
                    css={{
                      display: 'inline-block',
                      textAlign: 'center',
                      fontWeight: 'bold',
                      minWidth: '1em',
                      border:
                        props.active &&
                        a.row === props.active.row &&
                        a.col === props.active.col
                          ? '1px solid var(--black)'
                          : '1px solid transparent',
                    }}
                  >
                    {valAt(props.grid, a).trim() || '-'}
                  </span>
                );
              })}
            </div>
          ) : (
            ''
          )}
        </div>
      </div>
    </li>
  );
});

interface ClueListProps {
  dimCompleted: boolean;
  conceal: boolean;
  header: string;
  current?: number;
  active: Position;
  wasEntryClick: boolean;
  cross?: number;
  refed?: Array<number>;
  entries: Array<CluedEntry>;
  allEntries?: Array<CluedEntry>;
  dispatch: Dispatch<PuzzleAction>;
  showEntries: boolean;
  grid: GridBase<EntryBase>;
  scrollToCross: boolean;
}

export const ClueList = (props: ClueListProps): JSX.Element => {
  const clues = props.entries.map((entry) => {
    const isActive = props.current === entry.index;
    const isCross = props.cross === entry.index;
    const isRefed = props.refed?.find((n) => n === entry.index) !== undefined;
    return (
      <ClueListItem
        wasEntryClick={props.wasEntryClick}
        scrollToCross={props.scrollToCross}
        dimCompleted={props.dimCompleted}
        grid={props.grid}
        showEntry={props.showEntries}
        allEntries={props.allEntries}
        entry={entry}
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
        }}
      >
        {props.header}
      </div>
      <div
        css={{
          maxHeight: '100%',
          [SMALL_AND_UP]: {
            maxHeight: 'calc(100% - 1.5em)',
          },
          overflowY: 'scroll',
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
