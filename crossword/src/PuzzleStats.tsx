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
import { puzzleTitle, PuzzleResult, PlayT, PlayV } from './types';
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
  return <StatsPlaysLoader puzzle={puzzle} {...props} />
});

const ExpiringPlayStorage = t.type({
  /** millis since epoch when saved */
  savedAt: t.number,
  /** array of plays for this puzzle */
  plays: t.array(PlayV),
});
type ExpiringPlayStorageT = t.TypeOf<typeof ExpiringPlayStorage>;

const StatsPlaysLoader = ({ puzzle }: { puzzle: PuzzleResult } & AuthProps) => {
  const [plays, setPlays] = React.useState<Array<PlayT> | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const playsData = localStorage.getItem("plays/" + puzzle.id);
    if (playsData) {
      const validationResult = ExpiringPlayStorage.decode(JSON.parse(playsData));
      if (isRight(validationResult)) {
        const ttl = 1000 * 60 * 60; // 1hr
        if ((new Date()).getTime() < validationResult.right.savedAt + ttl) {
          console.log("loaded plays from local storage");
          setPlays(validationResult.right.plays);
          return;
        } else {
          console.log("plays in local storage have expired");
        }
      } else {
        console.error("Couldn't parse stored plays");
        console.error(PathReporter.report(validationResult).join(","));
      }
    }

    console.log("loading plays from db");
    if (error) {
      console.log("error set, skipping");
      return;
    }
    const db = firebase.firestore();
    db.collection("p").where('c', '==', puzzle.id).get().then((value) => {
      let results: Array<PlayT> = [];
      value.forEach(doc => {
        const data = doc.data();
        const validationResult = PlayV.decode(data);
        if (isRight(validationResult)) {
          results.push(validationResult.right);
        } else {
          console.error(PathReporter.report(validationResult).join(","));
          setError("Couldn't decode play");
        }
      });
      console.log("loaded, and caching in local storage");
      setPlays(results);
      const forStorage: ExpiringPlayStorageT = { savedAt: (new Date()).getTime(), plays: results }
      localStorage.setItem("plays/" + puzzle.id, JSON.stringify(forStorage));
    }).catch(reason => {
      console.error(reason);
      setError("Error loading plays");
    });
  }, [error, puzzle.id]);

  if (error) {
    return <Page title={null}>Error loading stats: {error}</Page>;
  }
  if (plays === null) {
    return <Page title={null}>Loading stats...</Page>;
  }

  let playCount = 0;
  let finishedCount = 0;
  let withoutCheating = 0;
  let totalFinishedTime = 0;
  let totalWithoutCheatingTime = 0;

  plays.filter(p => p.u !== puzzle.authorId).forEach(p => {
    playCount += 1;
    if (p.f) {
      p.g.forEach((v, i) => {
        if (!v.trim()) {
          console.error("Incomplete grid for finished play:", p);
        }
        if (v !== '.') {
          if (p.ct[i] === 0) {
            console.error("Bad updated times for finished play:", p);
          }
        }
      })
      finishedCount += 1;
      totalFinishedTime += p.t;
      if (!p.ch) {
        withoutCheating += 1;
        totalWithoutCheatingTime += p.t;
      }
    }
  });

  return (
    <Page title={"Stats | " + puzzleTitle(puzzle)}>
      <div>Total Plays: {playCount}</div>
      <div>Total Completions: {finishedCount}</div>
      <div>Average Completion Time: {finishedCount && timeString(totalFinishedTime / finishedCount)}</div>
      <div>Non-cheating Completions: {withoutCheating}</div>
      <div>Average Non-Cheating Completion Time: {withoutCheating && timeString(totalWithoutCheatingTime / withoutCheating)}</div>
    </Page>
  );
}
