/** @jsx jsx */
import { jsx } from '@emotion/core';

import * as React from 'react';
import { requiresAuth, AuthProps } from './App';
import { RouteComponentProps } from '@reach/router';

import * as t from "io-ts";
import { isRight } from 'fp-ts/lib/Either';
import { PathReporter } from "io-ts/lib/PathReporter";

import { usePuzzleAndPlay } from './Puzzle';
import { Page } from './Page';
import { puzzleTitle, PuzzleResult } from './types';
import { downloadTimestamped, PuzzleStatsT, PuzzleStatsV } from './common/dbtypes';
import { timeString } from './utils';

declare var firebase: typeof import('firebase');

interface PuzzleStatsProps extends RouteComponentProps, AuthProps {
  crosswordId?: string
}

export const PuzzleStats = requiresAuth((props: PuzzleStatsProps) => {
  const [puzzle, error] = usePuzzleAndPlay(false, props.crosswordId, props.user.uid, props.location)
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

const TimestampedStatsV = downloadTimestamped(PuzzleStatsV);
type TimestampedStatsT = t.TypeOf<typeof TimestampedStatsV>;

const StatsLoader = ({ puzzle }: { puzzle: PuzzleResult } & AuthProps) => {
  const [stats, setStats] = React.useState<PuzzleStatsT | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const stats = sessionStorage.getItem("stats/" + puzzle.id);
    if (stats) {
      const validationResult = TimestampedStatsV.decode(JSON.parse(stats));
      if (isRight(validationResult)) {
        const valid = validationResult.right;
        const ttl = 1000 * 60 * 30; // 30min
        if ((new Date()).getTime() < valid.downloadedAt.toDate().getTime() + ttl) {
          console.log("loaded stats from local storage");
          setStats(valid.data);
          return;
        } else {
          console.log("stats in local storage have expired");
        }
      } else {
        console.error("Couldn't parse stored stats");
        console.error(PathReporter.report(validationResult).join(","));
      }
    }

    console.log("loading stats from db");
    if (error) {
      console.log("error set, skipping");
      return;
    }
    const db = firebase.firestore();
    db.collection("s").doc(puzzle.id).get().then((value) => {
      if (!value.exists) {
        setError("No stats for this puzzle yet");
        return;
      }
      const validationResult = PuzzleStatsV.decode(value.data());
      if (isRight(validationResult)) {
        console.log("loaded, and caching in local storage");
        setStats(validationResult.right);
        const forLS: TimestampedStatsT = {
          downloadedAt: firebase.firestore.Timestamp.now(),
          data: validationResult.right
        };
        sessionStorage.setItem("stats/" + puzzle.id, JSON.stringify(forLS));
      } else {
        console.error(PathReporter.report(validationResult).join(","));
        setError("Couldn't decode stats");
      }
    }).catch(reason => {
      console.error(reason);
      setError("Error loading stats");
    });
  }, [error, puzzle.id]);

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
