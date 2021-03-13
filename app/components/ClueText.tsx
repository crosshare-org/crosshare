import { ReactNode, Fragment } from 'react';

import { CluedEntry, RefPosition } from '../lib/viewableGrid';
import { GridBase, valAt, EntryBase } from '../lib/gridBase';

import { ToolTipText } from './ToolTipText';
import { getClueText } from '../lib/types';

interface ClueTextProps {
  entryIndex: number;
  allEntries: Array<CluedEntry>;
  refPositions: Array<Array<RefPosition>>;
  grid: GridBase<EntryBase>;
}
export const ClueText = (props: ClueTextProps) => {
  const entry = props.allEntries[props.entryIndex];
  if (!entry) {
    throw new Error('oob');
  }
  const text = getClueText(entry);
  let offset = 0;
  const parts: Array<ReactNode> = [];
  let i = 0;
  for (const [refIndex, start, end] of props.refPositions[props.entryIndex] ||
    []) {
    if (offset < start) {
      parts.push(<Fragment key={i++}>{text.slice(offset, start)}</Fragment>);
    }
    const e = props.allEntries[refIndex];
    if (!e) {
      throw new Error('oob');
    }
    parts.push(
      <ToolTipText
        key={i++}
        text={text.slice(start, end)}
        tooltip={
          <>
            {getClueText(e)}
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
    offset = end;
  }
  if (offset < text.length) {
    parts.push(<Fragment key={i++}>{text.slice(offset)}</Fragment>);
  }
  return <div>{parts}</div>;
};
