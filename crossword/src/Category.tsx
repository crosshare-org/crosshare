/** @jsx jsx */
import { jsx } from '@emotion/core';
import * as React from 'react';

import { Link, RouteComponentProps } from "@reach/router";

import { ensureUser, AuthProps } from './App';
import { Page } from './Page';
import {
  CategoryIndexT, CategoryIndexV, UserPlaysT, UserPlaysV, getDateString
} from './common/dbtypes';
import { getFromSessionOrDB } from './dbUtils';

interface CategoryProps extends RouteComponentProps, AuthProps {
  categoryId?: string
}

const CategoryNames: { [key: string]: string } = {
  dailymini: "Daily Mini"
}

export const Category = ensureUser(({ user, categoryId }: CategoryProps) => {
  const [plays, setPlays] = React.useState<UserPlaysT | null>(null);
  const [puzzles, setPuzzles] = React.useState<CategoryIndexT | null>(null);
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    if (!categoryId || !CategoryNames.hasOwnProperty(categoryId)) {
      console.log("Missing category id")
      setError(true);
      return;
    }
    Promise.all([
      getFromSessionOrDB('categories', categoryId, CategoryIndexV, 24 * 60 * 60 * 1000),
      getFromSessionOrDB('up', user.uid, UserPlaysV, -1)
    ])
      .then(([puzzles, plays]) => {
        setPuzzles(puzzles);
        setPlays(plays);
      }).catch(reason => {
        console.error(reason);
        setError(true);
      });
  }, [categoryId, user.uid]);

  if (!puzzles) {
    return <Page title={null}>Loading...</Page>;
  }

  if (!categoryId || !CategoryNames.hasOwnProperty(categoryId) || !puzzles || error) {
    return <Page title={null}>Error loading category page</Page>;
  }

  const today = new Date()
  today.setHours(12);
  const ds = addZeros(getDateString(today));

  function prettifyDateString(dateString: string) {
    const groups = dateString.match(/^(\d+)-(\d+)-(\d+)$/);
    if (!groups) {
      throw new Error("Bad date string: " + dateString);
    }
    return (parseInt(groups[2]) + 1) + '/' + parseInt(groups[3]) + '/' + groups[1];
  }

  function addZeros(dateString: string) {
    const groups = dateString.match(/^(\d+)-(\d+)-(\d+)$/);
    if (!groups) {
      throw new Error("Bad date string: " + dateString);
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
    <Page title={CategoryNames[categoryId] + ' Puzzles'}>
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
              <Link css={{ display: 'inline-block', width: '50%', textAlign: 'right', paddingRight: '1em', fontWeight: play ?.[3] ? 'normal' : 'bold' }} to={'/crosswords/' + puzzleId}>{CategoryNames[categoryId] + ' for ' + prettifyDateString(dateString)}</Link>
              <div css={{ display: 'inline-block', width: '50%', paddingLeft: '1em' }}>{play ?.[3] ? 'completed ' + (play ?.[2] ? 'with helpers' : 'without helpers') : (play ? 'unfinished' : '')}</div>
            </li>);
          })}
      </ul>
    </Page>
  );
});
