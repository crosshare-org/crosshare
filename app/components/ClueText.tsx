import { ReactNode, Fragment } from 'react';

import { Direction } from '../lib/types';
import { CluedEntry } from '../lib/viewableGrid';
import { GridBase, valAt, EntryBase } from '../lib/gridBase';

import { ToolTipText } from './ToolTipText';

interface ClueTextProps {
  entryIndex: number;
  allEntries: Array<CluedEntry>;
  grid: GridBase<EntryBase>;
}
export const ClueText = (props: ClueTextProps) => {
  const entry = props.allEntries[props.entryIndex];
  if (!entry) {
    throw new Error('oob');
  }
  let text = entry.clue;
  const parts: Array<ReactNode> = [];
  const re = /^(?<all>(?<num>\d+)(?<others>[, \d-]*?((and|&)[\d -]+)?)(?<dir>across(es)?|downs?))\b/i;
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
      const dir = match.groups.dir.toLowerCase().startsWith('across')
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
