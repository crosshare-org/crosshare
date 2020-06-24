import { useState, useEffect, useContext, ReactNode } from 'react';

import { Link } from './Link';
import { AuthContext } from './AuthContext';
import { getPlays, PlayMapT } from '../lib/plays';
import { PuzzleResult } from '../lib/types';
import { SMALL_AND_UP } from '../lib/style';
import { PuzzleSizeIcon } from '../components/Icons';
import { Emoji } from '../components/Emoji';
import { timeString } from '../lib/utils';

export const PuzzleLink = (props: { id: string, width?: number, height?: number, title: string, pending?: boolean, byline?: ReactNode, children?: ReactNode }) => {
  const { user } = useContext(AuthContext);
  const [plays, setPlays] = useState<PlayMapT | null>(null);

  useEffect(() => {
    getPlays(user)
      .then(pm => setPlays(pm))
      .catch(reason => {
        console.error(reason);
      });
  }, [user]);

  const play = plays && plays[props.id];

  return <div css={{
    overflow: 'auto',
    display: 'inline-block',
    width: '100%',
    [SMALL_AND_UP]: {
      width: '50%',
    },
  }}>
    <Link css={{
      color: (play && play.f) ? 'var(--text)' : (play ? 'var(--error)' : 'var(--link)'),
      '&:hover': {
        color: (play && play.f) ? 'var(--text)' : (play ? 'var(--error-hover)' : 'var(--link-hover)'),
      }
    }} href={props.pending ? '/pending/[puzzleId]' : '/crosswords/[puzzleId]'} as={props.pending ? `/pending/${props.id}` : `/crosswords/${props.id}`} passHref>
      <div css={{ position: 'relative', verticalAlign: 'top !important', float: 'left', fontSize: '4em', marginRight: '0.3em' }} >
        <PuzzleSizeIcon width={props.width} height={props.height} />
        {play && play.f ?
          <div css={{ textShadow: '2px 0 0 white, -2px 0 0 white, 0 2px 0 white, 0 -2px 0 white', position: 'absolute', top: '0.1em', left: '0.35em', fontSize: '0.6em' }}>
            {play.ch ? <Emoji title='Used helpers' symbol='😏' /> : <Emoji title='Solved without helpers' symbol='🤓' />}
          </div>
          :
          ''
        }
      </div>
      <h3>{props.title} {play ? (play.f ? <i>({timeString(play.t, false)})</i> : <i>(unfinished)</i>) : ''}</h3>
      {props.byline}
    </Link>
    {props.children}
  </div>;
};

export const PuzzleResultLink = ({ puzzle }: { puzzle: PuzzleResult }) => {
  return <PuzzleLink id={puzzle.id} width={puzzle.size.cols} height={puzzle.size.rows} title={puzzle.title} byline={<p>By {puzzle.authorName}</p>} />;
};
