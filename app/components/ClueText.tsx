import { useContext } from 'react';

import { CluedEntry } from '../lib/viewableGrid';

import { Direction, getClueText } from '../lib/types';
import { Markdown } from './Markdown';
import { DownsOnlyContext } from './DownsOnlyContext';

interface ClueTextProps {
  entry: CluedEntry;
}
export const ClueText = (props: ClueTextProps) => {
  const downsOnly = useContext(DownsOnlyContext);
  if (downsOnly && props.entry.direction === Direction.Across) {
    return <span>-</span>;
  }
  const text = getClueText(props.entry);
  if (props.entry.clue.startsWith('!#')) {
    return <span>{text}</span>;
  }
  let noRefs = false;
  if (props.entry.clue.startsWith('!@')) {
    console.log('setting norefs');
    noRefs = true;
  }
  return <Markdown text={text} inline={true} noRefs={noRefs} />;
};
