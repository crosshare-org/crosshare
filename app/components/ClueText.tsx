import type { Root } from 'hast';
import { useContext } from 'react';
import { Direction, getClueText } from '../lib/types.js';
import { CluedEntry } from '../lib/viewableGrid.js';
import { DownsOnlyContext } from './DownsOnlyContext.js';
import { Markdown } from './Markdown.js';

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
