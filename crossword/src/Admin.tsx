/** @jsx jsx */
import { jsx } from '@emotion/core';

import * as React from 'react';

import { navigate, Link, RouteComponentProps } from "@reach/router";

import { requiresAdmin, AuthProps } from './App';
import { Page } from './Page';
import { PuzzleResult, puzzleFromDB, puzzleTitle } from './types';
import {
  TimestampedPuzzleT, DailyStatsT, DailyStatsV, DBPuzzleV, getDateString,
  CategoryIndexT, CategoryIndexV, prettifyDateString, DBPuzzleT,
  CommentForModerationWithIdT, CommentForModerationV, CommentWithRepliesT
} from './common/dbtypes';
import { getFromDB, getFromSessionOrDB, mapEachResult } from './dbUtils';
import type { UpcomingMinisCalendarProps } from "./UpcomingMinisCalendar";
import { getFirebaseApp, getTimestampClass } from './firebase';

const UpcomingMinisCalendar = React.lazy(() => import(/* webpackChunkName: "minisCal" */ './UpcomingMinisCalendar'));

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

export const Admin = requiresAdmin((_: RouteComponentProps & AuthProps) => {
  const [unmoderated, setUnmoderated] = React.useState<Array<PuzzleResult> | null>(null);
  const [commentsForModeration, setCommentsForModeration] = React.useState<Array<CommentForModerationWithIdT> | null>(null);
  const [minis, setMinis] = React.useState<CategoryIndexT | null>(null);
  const [stats, setStats] = React.useState<DailyStatsT | null>(null);
  const [error, setError] = React.useState(false);
  const [commentIdsForDeletion, setCommentIdsForDeletion] = React.useState<Set<string>>(new Set());

  React.useEffect(() => {
    console.log("loading admin content");
    const db = getFirebaseApp().firestore();
    const now = new Date();
    const dateString = getDateString(now);
    Promise.all([
      getFromSessionOrDB('ds', dateString, DailyStatsV, 1000 * 60 * 30),
      getFromSessionOrDB('categories', 'dailymini', CategoryIndexV, 24 * 60 * 60 * 1000),
      mapEachResult(db.collection('c').where("m", "==", false), DBPuzzleV, (dbpuzz, docId) => {
        const forStorage: TimestampedPuzzleT = { downloadedAt: getTimestampClass().now(), data: dbpuzz }
        sessionStorage.setItem('c/' + docId, JSON.stringify(forStorage));
        return { ...puzzleFromDB(dbpuzz), id: docId };
      }),
      mapEachResult(db.collection('cfm'), CommentForModerationV, (cfm, docId) => {
        return { ...cfm, i: docId };
      })
    ])
      .then(([stats, minis, unmoderated, cfm]) => {
        setStats(stats);
        setMinis(minis);
        setUnmoderated(unmoderated);
        setCommentsForModeration(cfm);
      })
      .catch(reason => {
        console.error(reason);
        setError(true);
      });
  }, []);

  const goToPuzzle = React.useCallback((_date: Date, puzzle: string | null) => {
    if (puzzle) {
      navigate("/crosswords/" + puzzle);
    }
  }, []);

  if (error) {
    return <Page title={null}>Error loading admin content</Page>;
  }
  if (unmoderated === null || commentsForModeration === null) {
    return <Page title={null}>Loading admin content...</Page>;
  }

  function titleForId(crosswordId: string): string {
    if (minis) {
      const dateString = Object.keys(minis).find(key => minis[key] === crosswordId);
      if (dateString) {
        return "Daily mini for " + prettifyDateString(dateString);
      }
    }
    return crosswordId;
  }

  function findCommentById(comments: Array<CommentWithRepliesT>, id: string): CommentWithRepliesT | null {
    for (const comment of comments) {
      if (comment.i === id) {
        return comment;
      }
      if (comment.r !== undefined) {
        const res = findCommentById(comment.r, id);
        if (res !== null) {
          return res;
        }
      }
    }
    return null;
  }

  async function moderateComments(e: React.FormEvent) {
    e.preventDefault();
    const db = getFirebaseApp().firestore();
    const puzzles: Record<string, DBPuzzleT> = {};
    if (commentsForModeration) {
      for (const comment of commentsForModeration) {
        // Don't need to do anything for any comment that has been marked for deletion
        if (!commentIdsForDeletion.has(comment.i)) {
          let puzzle: DBPuzzleT;
          if (puzzles.hasOwnProperty(comment.pid)) {
            puzzle = puzzles[comment.pid];
          } else {
            puzzle = await getFromDB('c', comment.pid, DBPuzzleV);
            puzzles[comment.pid] = puzzle;
          }
          if (puzzle.cs === undefined) {
            puzzle.cs = [];
          }
          if (comment.rt === null) {
            puzzle.cs.push(comment);
          } else {
            const parent = findCommentById(puzzle.cs, comment.rt);
            if (parent === null) {
              throw new Error('parent comment not found');
            }
            if (parent.r) {
              parent.r.push(comment);
            } else {
              parent.r = [comment];
            }
          }
        }
        await db.collection('cfm').doc(comment.i).delete();
      }
    }

    // Now we've merged in all the comments, so update the puzzles:
    for (const [puzzleId, dbPuzzle] of Object.entries(puzzles)) {
      console.log("updating", puzzleId, dbPuzzle.cs);
      await db.collection('c').doc(puzzleId).update({ cs: dbPuzzle.cs });
    }

    setCommentsForModeration([]);
  }

  function setCommentForDeletion(commentId: string, checked: boolean) {
    if (!checked) {
      commentIdsForDeletion.delete(commentId);
    } else {
      commentIdsForDeletion.add(commentId);
    }
    setCommentIdsForDeletion(new Set(commentIdsForDeletion));
  }

  return (
    <Page title="Admin">
      <div css={{ margin: '1em', }}>
        <h4 css={{ borderBottom: '1px solid var(--black)' }}>Comment Moderation</h4>
        {commentsForModeration.length === 0 ?
          <div>No comments are currently awaiting moderation.</div>
          :
          <form onSubmit={moderateComments}>
            <p>Check comments to disallow them</p>
            <ul>
              {commentsForModeration.map((cfm) =>
                <li key={cfm.i}>
                  <label>
                    <input css={{
                      marginRight: '1em'
                    }} type='checkbox' checked={commentIdsForDeletion.has(cfm.i)} onChange={(e) => setCommentForDeletion(cfm.i, e.target.checked)} />
                    <i>{cfm.n}</i> - {cfm.c}
                  </label>
                </li>
              )}
            </ul>
            <input type='submit' value='Moderate' />
          </form>
        }
        <h4 css={{ marginTop: '2em', borderBottom: '1px solid var(--black)' }}>Unmoderated</h4>
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
            <h5>Top Puzzles</h5>
            <ul>
              {Object.entries(stats.c).map(([crosswordId, count]) => {
                return (
                  <li key={crosswordId}>
                    <Link to={"/crosswords/" + crosswordId}>{titleForId(crosswordId)}</Link>: {count}
                    (<Link to={'/crosswords/' + crosswordId + '/stats'}>stats</Link>)
                  </li>
                );
              })}
            </ul>
          </React.Fragment>
          : ""}
        <h4 css={{ borderBottom: '1px solid var(--black)' }}>Upcoming Minis</h4>

        <LoadableCalendar disableExisting={false} onChange={goToPuzzle} />
      </div>
    </Page>
  );
});
