import { useContext } from 'react';

import { CluedEntry } from '../lib/viewableGrid';

import { Direction, getClueText } from '../lib/types';
import { Markdown } from './Markdown';
import { DownsOnlyContext } from './DownsOnlyContext';
import type { Root } from 'hast';

interface ClueTextProps {
  entry: CluedEntry;
  hast: Root;
}
export const ClueText = (props: ClueTextProps) => {
  const downsOnly = useContext(DownsOnlyContext);
  if (downsOnly && props.entry.direction === Direction.Across) {
    return <span>-</span>;
  }
  if (props.entry.clue.startsWith('!#')) {
    return <span>{getClueText(props.entry)}</span>;
  }
  let noRefs = false;
  if (props.entry.clue.startsWith('!@')) {
    console.log('setting norefs');
    noRefs = true;
  }
  return <Markdown hast={props.hast} inline={true} noRefs={noRefs} />;
};
