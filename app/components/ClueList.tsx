import { useRef, Dispatch, memo, MouseEvent } from 'react';

import { Position } from '../lib/types';
import { CluedEntry } from '../lib/viewableGrid';
import { Direction } from '../lib/types';
import { PuzzleAction, ClickedEntryAction } from '../reducers/reducer';
import { SECONDARY, LIGHTER } from '../lib/style';

interface ClueListItemProps {
  showDirection: boolean,
  conceal: boolean,
  entry: CluedEntry,
  dispatch: Dispatch<PuzzleAction>,
  isActive: boolean,
  isCross: boolean,
  active: Position | null,
  scrollToCross: boolean,
  showEntry: boolean,
  valAt: (pos: Position) => string,
}

const ClueListItem = memo(function ClueListItem({ isActive, isCross, ...props }: ClueListItemProps) {
  const ref = useRef<HTMLLIElement>(null);
  if (ref.current) {
    if (isActive || (props.scrollToCross && isCross)) {
      ref.current.scrollIntoView({ behavior: 'auto', block: 'center' });
    }
  }
  function click(e: MouseEvent) {
    e.preventDefault();
    if (isActive) {
      props.dispatch({ type: 'CHANGEDIRECTION' });
      return;
    }
    const ca: ClickedEntryAction = { type: 'CLICKEDENTRY', entryIndex: props.entry.index };
    props.dispatch(ca);
  }
  return (
    <li css={{
      padding: '0.5em',
      backgroundColor: (isActive ? LIGHTER : (isCross ? SECONDARY : 'none')),
      listStyleType: 'none',
      cursor: 'pointer',
      '&:hover': {
        backgroundColor: (isActive ? LIGHTER : (isCross ? 'var(--cross-clue-bg)' : 'var(--clue-bg)')),
      },
      display: 'flex',
      flexDirection: 'row',
      flexWrap: 'nowrap',
      alignItems: 'center',
      width: '100%',
    }} ref={ref} onClick={click} key={props.entry.index}>
      <div css={{
        flexShrink: 0,
        width: '3em',
        height: '100%',
        fontWeight: 'bold',
        textAlign: 'right',
        padding: '0 0.5em',
      }}>{props.entry.labelNumber}{props.showDirection ? (props.entry.direction === Direction.Across ? 'A' : 'D') : ''}
      </div>
      <div css={{
        flex: '1 1 auto',
        height: '100%',
        color: props.conceal ? 'transparent' : (props.entry.completedWord ? 'var(--default-text)' : 'var(--black)'),
        textShadow: props.conceal ? '0 0 1em var(--conceal-text)' : '',
      }}>
        <div>{props.entry.clue}</div>
        {props.showEntry ?
          <div>{props.entry.cells.map(a => {
            return <span key={a.col + '-' + a.row} css={{
              display: 'inline-block',
              textAlign: 'center',
              fontWeight: 'bold',
              minWidth: '1em',
              border: (props.active && a.row === props.active.row && a.col === props.active.col) ?
                '1px solid var(--black)' : '1px solid transparent',
            }}>{props.valAt(a).trim() || '-'}</span>;
          })}</div>
          : ''}
      </div>
    </li>
  );
});

interface ClueListProps {
  conceal: boolean,
  header?: string,
  current: number,
  active: Position,
  cross?: number,
  entries: Array<CluedEntry>,
  scrollToCross: boolean,
  dispatch: Dispatch<PuzzleAction>,
  showEntries: boolean,
  valAt: (pos: Position) => string,
}

export const ClueList = (props: ClueListProps) => {
  const clues = props.entries.map((entry) => {
    const isActive = props.current === entry.index;
    const isCross = props.cross === entry.index;
    return (<ClueListItem
      valAt={props.valAt}
      showDirection={props.header ? false : true}
      showEntry={props.showEntries}
      entry={entry}
      conceal={props.conceal}
      key={entry.index}
      scrollToCross={props.scrollToCross}
      dispatch={props.dispatch}
      isActive={isActive}
      isCross={isCross}
      active={props.showEntries && (isActive || isCross) ? props.active : null}
    />);
  });
  return (
    <div css={{
      height: '100% !important',
      position: 'relative',
    }}>{props.header ?
        <div css={{
          fontWeight: 'bold',
          borderBottom: '1px solid var(--autofill)',
          height: '1.5em',
          paddingLeft: '0.5em',
        }}>{props.header}</div> : ''}
      <div css={{
        maxHeight: props.header ? 'calc(100% - 1.5em)' : '100%',
        overflowY: 'scroll',
      }}>
        <ol css={{
          margin: 0,
          padding: 0,
        }}>
          {clues}
        </ol>
      </div>
    </div>
  );
};
