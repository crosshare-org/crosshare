import { ReactNode } from 'react';

import { Link } from '../components/Link';
import { PuzzleResult } from '../lib/types';
import { SMALL_AND_UP } from '../lib/style';
import { PuzzleSizeIcon } from '../components/Icons';

export const PuzzleLink = (props: { id: string, width: number, height: number, title: string, byline?: ReactNode, children?: ReactNode }) => {
  return <div css={{
    overflow: 'auto',
    display: 'inline-block',
    width: '100%',
    [SMALL_AND_UP]: {
      width: '50%',
    }
  }}>
    <Link href='/crosswords/[puzzleId]' as={`/crosswords/${props.id}`} passHref>
      <div css={{ verticalAlign: 'top !important', float: 'left', fontSize: '4em', marginRight: '0.3em' }} >
        <PuzzleSizeIcon width={props.width} height={props.height} />
      </div>
      <h3>{props.title}</h3>
      {props.byline}
    </Link>
    {props.children}
  </div>;
};

export const PuzzleResultLink = ({ puzzle }: { puzzle: PuzzleResult }) => {
  return <PuzzleLink id={puzzle.id} width={puzzle.size.cols} height={puzzle.size.rows} title={puzzle.title} byline={<p>By {puzzle.authorName}</p>} />;
};
