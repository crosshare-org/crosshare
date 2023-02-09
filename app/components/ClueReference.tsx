import { useContext } from 'react';
import { valAt } from '../lib/gridBase';
import { ToolTipText } from './ToolTipText';
import { Direction, getClueText } from '../lib/types';
import { GridContext } from './GridContext';
import { DownsOnlyContext } from './DownsOnlyContext';
import { ShowRefsContext } from './ShowRefsContext';

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
          {downsOnly && props.direction === Direction.Across
            ? '-'
            : getClueText(entry)}
          <b
            css={{
              marginLeft: '0.5em',
              whiteSpace: 'nowrap',
            }}
          >
            [{entry.cells.map((a) => valAt(grid, a).trim() || '-')}]
          </b>
        </>
      }
    />
  );
};
