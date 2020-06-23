import { useState, useEffect, useContext } from 'react';

import { ErrorPage } from './ErrorPage';
import { Link } from './Link';
import { AuthContext } from './AuthContext';
import { DefaultTopBar } from './TopBar';
import {
  CategoryIndexT, getDateString, prettifyDateString
} from '../lib/dbtypes';
import { getPlays, PlayMapT } from '../lib/plays';

interface CategoryProps {
  puzzles: CategoryIndexT,
  categoryName: string
}

export const Category = ({ puzzles, categoryName }: CategoryProps) => {
  const { user } = useContext(AuthContext);
  const [plays, setPlays] = useState<PlayMapT | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    getPlays(user)
      .then(pm => setPlays(pm))
      .catch(reason => {
        console.error(reason);
        setError(true);
      });
  }, [user]);

  if (error) {
    return <ErrorPage title="Error loading plays" />;
  }

  const today = new Date();
  today.setHours(12);
  const ds = addZeros(getDateString(today));

  function addZeros(dateString: string) {
    const groups = dateString.match(/^(\d+)-(\d+)-(\d+)$/);
    if (!groups) {
      throw new Error('Bad date string: ' + dateString);
    }
    const year = groups[1];
    let month = groups[2];
    if (month.length === 1) {
      month = '0' + month;
    }
    let date = groups[3];
    if (date.length === 1) {
      date = '0' + date;
    }
    return year + '-' + month + '-' + date;
  }

  return (
    <>
      <DefaultTopBar />
      <ul css={{
        margin: 0,
        padding: 0,
        listStyleType: 'none',
      }}>
        {Object.entries(puzzles)
          .map(([k, v]) => [addZeros(k), v])
          .filter(([k, _v]) => k <= ds)
          .sort((a, b) => a[0] > b[0] ? -1 : 1)
          .map(([dateString, puzzleId]) => {
            const play = plays && plays[puzzleId];
            return (<li key={dateString} css={{
              padding: '0.5em 0',
              width: '100%',
            }}>
              <Link css={{ display: 'inline-block', width: '50%', textAlign: 'right', paddingRight: '1em', fontWeight: play ?.f ? 'normal' : 'bold' }} href='/crosswords/[puzzleId]' as={`/crosswords/${puzzleId}`} passHref>
                {categoryName + ' for ' + prettifyDateString(dateString)}
              </Link>
              <div css={{ display: 'inline-block', width: '50%', paddingLeft: '1em' }}>{play ?.f ? 'completed ' + (play ?.ch ? 'with helpers' : 'without helpers') : (play ? 'unfinished' : '')}</div>
            </li>);
          })}
      </ul>
    </>
  );
};