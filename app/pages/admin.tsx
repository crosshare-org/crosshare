import { FormEvent, useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import NextJSRouter from 'next/router';

import { Markdown } from '../components/Markdown';
import { Link } from '../components/Link';
import { Button } from '../components/Buttons';
import { requiresAdmin } from '../components/AuthContext';
import { DefaultTopBar } from '../components/TopBar';
import { PuzzleResult, puzzleFromDB } from '../lib/types';
import {
  DailyStatsT,
  DailyStatsV,
  DBPuzzleV,
  getDateString,
  CategoryIndexT,
  CategoryIndexV,
  prettifyDateString,
  DBPuzzleT,
  CommentForModerationWithIdT,
  CommentForModerationV,
  CommentWithRepliesT,
} from '../lib/dbtypes';
import { getFromDB, getFromSessionOrDB, mapEachResult } from '../lib/dbUtils';
import { App, FieldValue } from '../lib/firebaseWrapper';
import { UpcomingMinisCalendar } from '../components/UpcomingMinisCalendar';
import { ConstructorPageV, ConstructorPageT } from '../lib/constructorPage';
import { useSnackbar } from '../components/Snackbar';

const PuzzleListItem = (props: PuzzleResult) => {
  return (
    <li key={props.id}>
      <Link
        href="/crosswords/[puzzleId]"
        as={`/crosswords/${props.id}`}
        passHref
      >
        {props.title}
      </Link>{' '}
      by {props.authorName}
      <span css={{ color: 'var(--error)' }}>
        {props.isPrivate
          ? ' PRIVATE'
          : props.isPrivateUntil
            ? ' PRIVATE until ' + new Date(props.isPrivateUntil).toISOString()
            : ''}
      </span>
    </li>
  );
};

export default requiresAdmin(() => {
  const [unmoderated, setUnmoderated] = useState<Array<PuzzleResult> | null>(
    null
  );
  const [
    commentsForModeration,
    setCommentsForModeration,
  ] = useState<Array<CommentForModerationWithIdT> | null>(null);
  const [minis, setMinis] = useState<CategoryIndexT | null>(null);
  const [stats, setStats] = useState<DailyStatsT | null>(null);
  const [error, setError] = useState(false);
  const [mailErrors, setMailErrors] = useState(0);
  const [commentIdsForDeletion, setCommentIdsForDeletion] = useState<
    Set<string>
  >(new Set());
  const [
    pagesForModeration,
    setPagesForModeration,
  ] = useState<Array<ConstructorPageT> | null>(null);
  const [uidToUnsub, setUidToUnsub] = useState('');
  const { showSnackbar } = useSnackbar();

  useEffect(() => {
    console.log('loading admin content');
    const db = App.firestore();
    const now = new Date();
    const dateString = getDateString(now);
    Promise.all([
      db.collection('mail').where('delivery.error', '!=', null).get(),
      getFromSessionOrDB({
        collection: 'ds',
        docId: dateString,
        validator: DailyStatsV,
        ttl: 1000 * 60 * 30,
      }),
      getFromSessionOrDB({
        collection: 'categories',
        docId: 'dailymini',
        validator: CategoryIndexV,
        ttl: 24 * 60 * 60 * 1000,
      }),
      mapEachResult(
        db.collection('c').where('m', '==', false),
        DBPuzzleV,
        (dbpuzz, docId) => {
          return { ...puzzleFromDB(dbpuzz), id: docId };
        }
      ),
      mapEachResult(
        db.collection('cfm'),
        CommentForModerationV,
        (cfm, docId) => {
          return { ...cfm, i: docId };
        }
      ),
      mapEachResult(
        db.collection('cp').where('m', '==', true),
        ConstructorPageV,
        (cp, docId) => {
          return { ...cp, id: docId };
        }
      ),
    ])
      .then(([mailErrors, stats, minis, unmoderated, cfm, cps]) => {
        setMailErrors(mailErrors?.size || 0);
        setStats(stats);
        setMinis(minis);
        setUnmoderated(unmoderated);
        setCommentsForModeration(cfm);
        setPagesForModeration(cps);
      })
      .catch((reason) => {
        console.error(reason);
        setError(true);
      });
  }, []);

  const goToPuzzle = useCallback((_date: Date, puzzle: string | null) => {
    if (puzzle) {
      NextJSRouter.push('/crosswords/' + puzzle);
    }
  }, []);

  if (error) {
    return <div>Error loading admin content</div>;
  }
  if (
    unmoderated === null ||
    commentsForModeration === null ||
    pagesForModeration === null
  ) {
    return <div>Loading admin content...</div>;
  }

  function titleForId(stats: DailyStatsT, crosswordId: string): string {
    if (minis) {
      const dateString = Object.keys(minis).find(
        (key) => minis[key] === crosswordId
      );
      if (dateString) {
        return 'Daily mini for ' + prettifyDateString(dateString);
      }
    }
    const forPuzzle = stats.i?.[crosswordId];
    if (forPuzzle) {
      return forPuzzle[0] + ' by ' + forPuzzle[1];
    }
    return crosswordId;
  }

  function findCommentById(
    comments: Array<CommentWithRepliesT>,
    id: string
  ): CommentWithRepliesT | null {
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

  async function moderatePages(e: FormEvent) {
    e.preventDefault();
    const db = App.firestore();
    if (pagesForModeration) {
      for (const cp of pagesForModeration) {
        await db.collection('cp').doc(cp.id).set({ m: false }, { merge: true });
      }
    }
    setPagesForModeration([]);
  }

  async function moderateComments(e: FormEvent) {
    e.preventDefault();
    const db = App.firestore();
    const puzzles: Record<string, DBPuzzleT> = {};
    if (commentsForModeration) {
      for (const comment of commentsForModeration) {
        // Don't need to do anything for any comment that has been marked for deletion
        if (!commentIdsForDeletion.has(comment.i)) {
          let puzzle: DBPuzzleT;
          const fromCache = puzzles[comment.pid];
          if (fromCache) {
            puzzle = fromCache;
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
      console.log('updating', puzzleId, dbPuzzle.cs);
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
    <>
      <Head>
        <title>Admin | Crosshare</title>
        <meta name="robots" content="noindex" />
      </Head>
      <DefaultTopBar />
      <div css={{ margin: '1em' }}>
        {mailErrors ? <h4>There are {mailErrors} mail errors!</h4> : ''}
        <h4 css={{ borderBottom: '1px solid var(--black)' }}>
          Comment Moderation
        </h4>
        {commentsForModeration.length === 0 ? (
          <div>No comments are currently awaiting moderation.</div>
        ) : (
          <form onSubmit={moderateComments}>
            <p>Check comments to disallow them:</p>
            {commentsForModeration.map((cfm) => (
              <div key={cfm.i}>
                <label>
                  <input
                    css={{
                      marginRight: '1em',
                    }}
                    type="checkbox"
                    checked={commentIdsForDeletion.has(cfm.i)}
                    onChange={(e) =>
                      setCommentForDeletion(cfm.i, e.target.checked)
                    }
                  />
                  <Link
                    href="/crosswords/[puzzleId]"
                    as={`/crosswords/${cfm.pid}`}
                    passHref
                  >
                    puzzle
                  </Link>{' '}
                  {cfm.n}:
                  <Markdown text={cfm.c} />
                </label>
              </div>
            ))}
            <input type="submit" value="Moderate" />
          </form>
        )}
        <h4 css={{ marginTop: '2em', borderBottom: '1px solid var(--black)' }}>
          Page Moderation
        </h4>
        {pagesForModeration.length === 0 ? (
          <div>No pages need moderation.</div>
        ) : (
          <form onSubmit={moderatePages}>
            {pagesForModeration.map((cp) => (
              <div key={cp.id}>
                <p>
                  {cp.n} -{' '}
                  <Link href="/[...slug]" as={`/${cp.i}`} passHref>
                    @{cp.i}
                  </Link>
                </p>
                <Markdown text={cp.b} />
              </div>
            ))}
            <input type="submit" value="Mark as moderated" />
          </form>
        )}
        <h4 css={{ marginTop: '2em', borderBottom: '1px solid var(--black)' }}>
          Unmoderated
        </h4>
        {unmoderated.length === 0 ? (
          <div>No puzzles are currently awaiting moderation.</div>
        ) : (
          <ul>{unmoderated.map(PuzzleListItem)}</ul>
        )}
        {stats ? (
          <>
            <h4 css={{ borderBottom: '1px solid var(--black)' }}>
              Today&apos;s Stats
            </h4>
            <div>Total completions: {stats.n}</div>
            <div>Users w/ completions: {stats.u.length}</div>
            <h5>Top Puzzles</h5>
            <ul>
              {Object.entries(stats.c)
                .sort((a, b) => b[1] - a[1])
                .map(([crosswordId, count]) => {
                  return (
                    <li key={crosswordId}>
                      <Link
                        href="/crosswords/[puzzleId]"
                        as={`/crosswords/${crosswordId}`}
                        passHref
                      >
                        {titleForId(stats, crosswordId)}
                      </Link>
                      : {count}(
                      <Link
                        href="/crosswords/[puzzleId]/stats"
                        as={`/crosswords/${crosswordId}/stats`}
                        passHref
                      >
                        stats
                      </Link>
                      )
                    </li>
                  );
                })}
            </ul>
          </>
        ) : (
          ''
        )}
        <h4 css={{ borderBottom: '1px solid var(--black)' }}>Upcoming Minis</h4>

        <UpcomingMinisCalendar disableExisting={false} onChange={goToPuzzle} />
        <h4 css={{ borderBottom: '1px solid var(--black)' }}>
          Unsubscribe User
        </h4>
        <form
          onSubmit={(e: React.FormEvent) => {
            e.preventDefault();
            const toSubmit = uidToUnsub.trim();
            setUidToUnsub('');
            if (toSubmit) {
              App.firestore()
                .doc(`prefs/${uidToUnsub}`)
                .set({ unsubs: FieldValue.arrayUnion('all') }, { merge: true })
                .then(() => {
                  showSnackbar('Unsubscribed');
                });
            }
          }}
        >
          <label>
            Unsubscribe by user id:
            <input
              css={{ margin: '0 0.5em' }}
              type="text"
              value={uidToUnsub}
              onChange={(e) => setUidToUnsub(e.target.value)}
            />
          </label>
          <Button type="submit" text="Unsubscribe" />
        </form>
      </div>
    </>
  );
});
