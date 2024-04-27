import { useContext } from 'react';
import { valAt } from '../lib/gridBase';
import { Direction, getClueText } from '../lib/types';
import { DownsOnlyContext } from './DownsOnlyContext';
import { GridContext } from './GridContext';
import { ShowRefsContext } from './ShowRefsContext';
import { ToolTipText } from './ToolTipText';

interface ClueReferenceProps {
  direction: Direction;
  labelNumber: number;
  text: string;
}
export const ClueReference = (props: ClueReferenceProps): JSX.Element => {
  const grid = useContext(GridContext);
  const showRefs = useContext(ShowRefsContext);
  const downsOnly = useContext(DownsOnlyContext);

  if (!showRefs) {
    return <>{props.text}</>;
  }

  const entry = grid?.entries.find(
    (e) =>
      e.labelNumber === props.labelNumber && e.direction === props.direction
  );
  if (!grid || !entry) {
    console.log('missing grid or entry', grid, entry);
    return <>{props.text}</>;
  }

  return (
    <ToolTipText
      text={props.text}
      tooltip={
        <>
          <b className="marginRight0-5em whiteSpaceNowrap">
            {props.labelNumber}
            {props.direction === Direction.Across ? 'A' : 'D'}
          </b>
          {downsOnly && props.direction === Direction.Across
            ? '-'
            : getClueText(entry)}
          <b className="marginRight0-5em whiteSpaceNowrap">
            [{entry.cells.map((a) => valAt(grid, a).trim() || '-')}]
          </b>
        </>
      }
    />
  );
};
