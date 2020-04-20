/** @jsx jsx */
import { jsx } from '@emotion/core';

import * as React from 'react';

import { navigate, RouteComponentProps } from "@reach/router";
import { isRight } from 'fp-ts/lib/Either';
import { PathReporter } from "io-ts/lib/PathReporter";

import { requiresAdmin, AuthProps } from './App';
import { Page } from './Page';
import { PuzzleResult, DBPuzzleV, puzzleFromDB } from './types';
import { PuzzleListItem } from './PuzzleList';
import { UpcomingMinisCalendar } from './UpcomingMinisCalendar';

declare var firebase: typeof import('firebase');

export const Admin = requiresAdmin((_: RouteComponentProps & AuthProps) => {
  const [unmoderated, setUnmoderated] = React.useState<Array<PuzzleResult>|null>(null);
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
          results.push({...puzzleFromDB(validationResult.right), id: doc.id});
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
  }, [error]);

  const goToPuzzle = React.useCallback((_date: Date, puzzle: PuzzleResult|null) => {
    if (puzzle) {
      navigate("/crosswords/" + puzzle.id, {state: puzzle});
    }
  },[]);

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
        { unmoderated.length === 0 ?
          <div>No puzzles are currently awaiting moderation.</div>
          :
          <ul>{unmoderated.map(PuzzleListItem)}</ul>
        }
        <h4 css={{ borderBottom: '1px solid var(--black)' }}>Upcoming Minis</h4>
        <UpcomingMinisCalendar disableExisting={false} onChange={goToPuzzle}/>
      </div>
    </Page>
  );
});
