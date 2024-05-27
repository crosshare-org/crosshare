import { useContext } from 'react';
import { valAt } from '../lib/gridBase.js';
import { Direction, directionString, getClueText } from '../lib/types.js';
import { DownsOnlyContext } from './DownsOnlyContext.js';
import { GridContext } from './GridContext.js';
import { ShowRefsContext } from './ShowRefsContext.js';
import { ToolTipText } from './ToolTipText.js';

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
            {directionString(props.direction)}
          </b>
          {downsOnly && props.direction === Direction.Across
            ? '-'
            : getClueText(entry)}
          <b className="marginLeft0-5em whiteSpaceNowrap">
            [{entry.cells.map((a) => valAt(grid, a).trim() || '-')}]
          </b>
        </>
      }
    />
  );
};
