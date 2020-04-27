/** @jsx jsx */
import { jsx } from '@emotion/core';

import * as React from 'react';

import * as t from "io-ts";
import { navigate, Link, RouteComponentProps } from "@reach/router";
import { isRight } from 'fp-ts/lib/Either';
import { PathReporter } from "io-ts/lib/PathReporter";

import { requiresAdmin, AuthProps } from './App';
import { Page } from './Page';
import { PuzzleResult, TimestampedPuzzleT, puzzleFromDB, puzzleTitle } from './types';
import { downloadTimestamped, DailyStatsT, DailyStatsV, DBPuzzleV, getDateString } from './common/dbtypes';
import type { UpcomingMinisCalendarProps } from "./UpcomingMinisCalendar";

const UpcomingMinisCalendar = React.lazy(() => import(/* webpackChunkName: "minisCal" */ './UpcomingMinisCalendar'));

declare var firebase: typeof import('firebase');

const LoadableCalendar = (props: UpcomingMinisCalendarProps) => (
  <React.Suspense fallback={<div>Loading...</div>}>
    <UpcomingMinisCalendar {...props} />
  </React.Suspense>
);

const PuzzleListItem = (props: PuzzleResult) => {
  return (
    <li key={props.id}><Link to={"/crosswords/" + props.id}>{puzzleTitle(props)}</Link> by {props.authorName}</li>
  );
}

const TimestampedStatsV = downloadTimestamped(DailyStatsV);
type TimestampedStatsT = t.TypeOf<typeof TimestampedStatsV>;

export const Admin = requiresAdmin((_: RouteComponentProps & AuthProps) => {
  const [unmoderated, setUnmoderated] = React.useState<Array<PuzzleResult> | null>(null);
  const [stats, setStats] = React.useState<DailyStatsT | null>(null);
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    console.log("loading admin content");
    if (error) {
      console.log("error set, skipping");
      return;
    }
    const db = firebase.firestore();
    db.collection('c').where("m", "==", false).get().then((value) => {
      let results: Array<PuzzleResult> = [];
      value.forEach(doc => {
        const data = doc.data();
        const validationResult = DBPuzzleV.decode(data);
        if (isRight(validationResult)) {
          const puzzle = puzzleFromDB(validationResult.right);
          const forStorage: TimestampedPuzzleT = { downloadedAt: firebase.firestore.Timestamp.now(), data: puzzle }
          sessionStorage.setItem('c/' + doc.id, JSON.stringify(forStorage));
          results.push({ ...puzzle, id: doc.id });
        } else {
          console.error(PathReporter.report(validationResult).join(","));
          setError(true);
        }
      });
      setUnmoderated(results);
    }).catch(reason => {
      console.error(reason);
      setError(true);
    });

    const now = new Date();
    const dateString = getDateString(now)
    const stats = sessionStorage.getItem("ds/" + dateString);
    if (stats) {
      const validationResult = TimestampedStatsV.decode(JSON.parse(stats));
      if (isRight(validationResult)) {
        const valid = validationResult.right;
        const ttl = 1000 * 60 * 30; // 30min
        if (now.getTime() < valid.downloadedAt.toDate().getTime() + ttl) {
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
    db.collection("ds").doc(dateString).get().then((value) => {
      if (!value.exists) {
        console.error("No stats for today yet");
        return;
      }
      const validationResult = DailyStatsV.decode(value.data());
      if (isRight(validationResult)) {
        console.log("loaded, and caching in local storage");
        setStats(validationResult.right);
        const forLS: TimestampedStatsT = {
          downloadedAt: firebase.firestore.Timestamp.now(),
          data: validationResult.right
        };
        sessionStorage.setItem("ds/" + dateString, JSON.stringify(forLS));
      } else {
        console.error(PathReporter.report(validationResult).join(","));
        setError(true);
      }
    }).catch(reason => {
      console.error(reason);
      setError(true);
    });
  }, [error]);

  const goToPuzzle = React.useCallback((_date: Date, puzzle: string | null) => {
    if (puzzle) {
      navigate("/crosswords/" + puzzle);
    }
  }, []);

  if (error) {
    return <Page title={null}>Error loading admin content</Page>;
  }
  if (unmoderated === null) {
    return <Page title={null}>Loading admin content...</Page>;
  }

  return (
    <Page title="Admin">
      <div css={{ margin: '1em', }}>
        <h4 css={{ borderBottom: '1px solid var(--black)' }}>Unmoderated</h4>
        {unmoderated.length === 0 ?
          <div>No puzzles are currently awaiting moderation.</div>
          :
          <ul>{unmoderated.map(PuzzleListItem)}</ul>
        }
        {stats ?
          <React.Fragment>
            <h4 css={{ borderBottom: '1px solid var(--black)' }}>Today's Stats</h4>
            <div>Total completions: {stats.n}</div>
            <div>Users w/ completions: {stats.u.length}</div>
          </React.Fragment>
          : ""}
        <h4 css={{ borderBottom: '1px solid var(--black)' }}>Upcoming Minis</h4>

        <LoadableCalendar disableExisting={false} onChange={goToPuzzle} />
      </div>
    </Page>
  );
});
