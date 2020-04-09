/** @jsx jsx */
import { jsx } from '@emotion/core';

import * as React from 'react';

import { RouteComponentProps } from "@reach/router";
import firebase from 'firebase/app';
import 'firebase/firestore';
import { isRight } from 'fp-ts/lib/Either';
import { PathReporter } from "io-ts/lib/PathReporter";

import { requiresAdmin, AuthProps } from './App';
import { Page } from './Page';
import { PuzzleResult, PuzzleV } from './types';
import { PuzzleListItem } from './PuzzleList';

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
    db.collection('crosswords').where("moderated", "==", false).get().then((value) => {
      let results: Array<PuzzleResult> = [];
      value.forEach(doc => {
        const data = doc.data();
        const validationResult = PuzzleV.decode(data);
        if (isRight(validationResult)) {
          results.push({...validationResult.right, id: doc.id});
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

  if (error) {
    return <Page title={null}>Error loading admin content</Page>;
  }
  if (unmoderated === null) {
    return <Page title={null}>Loading admin content...</Page>;
  }
  return (
    <Page title="Admin">
      <div css={{ margin: '1em', }}>
        <h4 css={{ borderBottom: '1px solid black' }}>Unmoderated</h4>
        { unmoderated.length === 0 ?
          <div>No puzzles are currently awaiting moderation.</div>
          :
          <ul>{unmoderated.map(PuzzleListItem)}</ul>
        }
      </div>
    </Page>
  );
});
