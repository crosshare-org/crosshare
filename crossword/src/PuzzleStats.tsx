/** @jsx jsx */
import { jsx } from '@emotion/core';

import * as React from 'react';
import { RouteComponentProps } from '@reach/router';

import { requiresAuth, AuthProps } from './App';
import { usePuzzleAndPlay } from './Puzzle';
import { Page } from './Page';
import { puzzleTitle, PuzzleResult } from './types';
import { PuzzleStatsT, PuzzleStatsV } from './common/dbtypes';
import { getFromSessionOrDB } from './dbUtils';
import { timeString } from './utils';

interface PuzzleStatsProps extends RouteComponentProps, AuthProps {
  crosswordId?: string
}

export const PuzzleStats = requiresAuth((props: PuzzleStatsProps) => {
  const [puzzle, error] = usePuzzleAndPlay(false, props.crosswordId, props.user.uid);
  if (error) {
    return <Page title={null}>Something went wrong while loading puzzle '{props.crosswordId}': {error}</Page>;
  }
  if (puzzle === null) {
    return <Page title={null}>Loading '{props.crosswordId}'...</Page>
  }
  if (!props.isAdmin && props.user.uid !== puzzle.authorId) {
    return <Page title={null}>Stats are only available for the puzzle author</Page>
  }
  return <StatsLoader puzzle={puzzle} {...props} />
});

const StatsLoader = ({ puzzle }: { puzzle: PuzzleResult } & AuthProps) => {
  const [stats, setStats] = React.useState<PuzzleStatsT | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    getFromSessionOrDB('s', puzzle.id, PuzzleStatsV, 30 * 60 * 1000)
      .then(setStats)
      .catch(setError);
  }, [puzzle.id]);

  if (error) {
    return <Page title={null}>Error loading stats: {error}</Page>;
  }
  if (stats === null) {
    return <Page title={null}>Loading stats...</Page>;
  }

  return (
    <Page title={"Stats | " + puzzleTitle(puzzle)}>
      <div>Stats for <b>{puzzleTitle(puzzle)}</b> as of {stats.ua.toDate().toLocaleTimeString()}</div>
      <div>Total Completions: {stats.n}</div>
      <div>Average Completion Time: {stats.n && timeString(stats.nt / stats.n)}</div>
      <div>Non-cheating Completions: {stats.s}</div>
      <div>Average Non-Cheating Completion Time: {stats.s && timeString(stats.st / stats.s)}</div>
    </Page>
  );
}
