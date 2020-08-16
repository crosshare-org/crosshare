import { useState, useEffect, useContext, ReactNode } from 'react';

import { Link } from './Link';
import { AuthContext } from './AuthContext';
import { getPlays, PlayMapT } from '../lib/plays';
import { PuzzleResult } from '../lib/types';
import { SMALL_AND_UP } from '../lib/style';
import { PuzzleSizeIcon } from '../components/Icons';
import { Emoji } from '../components/Emoji';
import { timeString } from '../lib/utils';
import { getFromSessionOrDB } from '../lib/dbUtils';
import { AuthoredPuzzlesV } from '../lib/dbtypes';
import { ConstructorPageT } from '../lib/constructorPage';

export const PuzzleLink = (props: { id: string, width?: number, height?: number, title: string, children?: ReactNode }) => {
  const { user } = useContext(AuthContext);
  const [plays, setPlays] = useState<PlayMapT | null>(null);
  const [authored, setAuthored] = useState(false);

  useEffect(() => {
    if (user) {
      getFromSessionOrDB({ collection: 'uc', docId: user.uid, validator: AuthoredPuzzlesV, ttl: 5 * 60 * 1000 })
        .then(aps => {
          if (aps !== null) {
            setAuthored(Object.prototype.hasOwnProperty.call(aps, props.id));
          }
        })
        .catch(reason => {
          console.error(reason);
        });
    }

    getPlays(user)
      .then(pm => setPlays(pm))
      .catch(reason => {
        console.error(reason);
      });
  }, [user, props.id]);

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
      color: (authored || (play && play.f)) ? 'var(--text)' : (play ? 'var(--error)' : 'var(--link)'),
      '&:hover': {
        color: (authored || (play && play.f)) ? 'var(--text)' : (play ? 'var(--error-hover)' : 'var(--link-hover)'),
      }
    }} href='/crosswords/[puzzleId]' as={`/crosswords/${props.id}`} passHref>
      <div css={{ position: 'relative', verticalAlign: 'top !important', float: 'left', fontSize: '4em', marginRight: '0.3em' }} >
        <PuzzleSizeIcon width={props.width} height={props.height} />
        {authored || (play && play.f) ?
          <div css={{ textShadow: '2px 0 0 white, -2px 0 0 white, 0 2px 0 white, 0 -2px 0 white', position: 'absolute', top: '0.1em', left: '0.35em', fontSize: '0.6em' }}>
            {authored ?
              <Emoji title='Authored Puzzle' symbol='🖋️' />
              :
              (play && play.ch ? <Emoji title='Used helpers' symbol='😏' /> : <Emoji title='Solved without helpers' symbol='🤓' />)
            }
          </div>
          :
          ''
        }
      </div>
      <h3>{props.title} {!authored && play ? (play.f ? <i>({timeString(play.t, false)})</i> : <i>(unfinished)</i>) : ''}</h3>
    </Link>
    {props.children}
  </div>;
};

export const AuthorLink = ({ authorName, constructorPage }: { authorName: string, constructorPage: ConstructorPageT | null }) => {
  if (constructorPage) {
    const username = constructorPage.i || constructorPage.id;
    return <p>By <Link href='/[...slug]' as={'/' + username} passHref>{constructorPage.n}</Link></p>;
  }
  return <p>By {authorName}</p>;
};

export const PuzzleResultLink = ({ puzzle, showAuthor, constructorPage }: { puzzle: PuzzleResult, showAuthor: boolean, constructorPage?: ConstructorPageT | null }) => {
  return <PuzzleLink id={puzzle.id} width={puzzle.size.cols} height={puzzle.size.rows} title={puzzle.title}>
    {showAuthor ? <AuthorLink authorName={puzzle.authorName} constructorPage={constructorPage || null} /> : undefined}
  </PuzzleLink>;
};
