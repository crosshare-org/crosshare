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
  CommentForModerationWithIdT,
  CommentForModerationV,
} from '../lib/dbtypes';
import { getFromSessionOrDB, mapEachResult } from '../lib/dbUtils';
import { App, FieldValue, TimestampClass } from '../lib/firebaseWrapper';
import { UpcomingMinisCalendar } from '../components/UpcomingMinisCalendar';
import { ConstructorPageV, ConstructorPageT } from '../lib/constructorPage';
import { useSnackbar } from '../components/Snackbar';
import { moderateComments } from '../lib/comments';
import {
  useCollectionData,
  useDocumentDataOnce,
} from 'react-firebase-hooks/firestore';
import { DonationsListT } from './donate';

const PuzzleListItem = (props: PuzzleResult) => {
  return (
    <li key={props.id}>
      <Link href={`/crosswords/${props.id}`}>{props.title}</Link> by{' '}
      {props.authorName}
      <span css={{ color: 'var(--error)' }}>
        {props.isPrivate
          ? ' PRIVATE'
          : props.isPrivateUntil && props.isPrivateUntil > Date.now()
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
  const [commentsForModeration, setCommentsForModeration] =
    useState<Array<CommentForModerationWithIdT> | null>(null);
  const [minis, setMinis] = useState<CategoryIndexT | null>(null);
  const [stats, setStats] = useState<DailyStatsT | null>(null);
  const [error, setError] = useState(false);
  const [mailErrors, setMailErrors] = useState(0);
  const [commentIdsForDeletion, setCommentIdsForDeletion] = useState<
    Set<string>
  >(new Set());
  const [pagesForModeration, setPagesForModeration] =
    useState<Array<ConstructorPageT> | null>(null);
  const [uidToUnsub, setUidToUnsub] = useState('');
  const [donationEmail, setDonationEmail] = useState('');
  const [donationAmount, setDonationAmount] = useState('');
  const [donationReceivedAmount, setDonationReceivedAmount] = useState('');
  const [donationName, setDonationName] = useState('');
  const [donationPage, setDonationPage] = useState('');
  const { showSnackbar } = useSnackbar();
  const db = App.firestore();

  useEffect(() => {
    console.log('loading admin content');
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
        unmoderated.sort((a, b) => a.publishTime - b.publishTime);
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
  }, [db]);

  const goToPuzzle = useCallback((_date: Date, puzzle: string | null) => {
    if (puzzle) {
      NextJSRouter.push('/crosswords/' + puzzle);
    }
  }, []);

  const [automoderated] = useCollectionData<CommentForModerationWithIdT>(
    db.collection('automoderated'),
    { idField: 'i' }
  );

  const [donations] = useDocumentDataOnce<DonationsListT>(
    db.doc('donations/donations')
  );

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

  async function retryMail(e: FormEvent) {
    e.preventDefault();
    const db = App.firestore();
    db.collection('mail')
      .where('delivery.error', '!=', null)
      .get()
      .then((r) => {
        r.forEach((s) => {
          console.log('retrying', s.id);
          db.collection('mail').doc(s.id).update({ 'delivery.state': 'RETRY' });
        });
      });
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

  async function moderatePrivatePuzzles(e: FormEvent) {
    e.preventDefault();
    const db = App.firestore();
    const privates = unmoderated?.filter((p) => p.isPrivate);
    if (unmoderated && privates) {
      await Promise.all(
        privates.map((pr) => {
          return db.collection('c').doc(pr.id).update({ m: true });
        })
      ).then(() => {
        setUnmoderated(unmoderated.filter((p) => !p.isPrivate));
      });
    }
  }

  async function doModerateComments(e: FormEvent) {
    e.preventDefault();
    if (!commentsForModeration) {
      return;
    }
    const db = App.firestore();
    moderateComments(
      db as unknown as FirebaseFirestore.Firestore,
      commentsForModeration,
      commentIdsForDeletion,
      false
    );
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
        {mailErrors ? (
          <div>
            <h4>There are {mailErrors} mail errors!</h4>
            <Button onClick={retryMail} text="Retry send" />
          </div>
        ) : (
          ''
        )}
        <h4 css={{ borderBottom: '1px solid var(--black)' }}>
          Comment Moderation
        </h4>
        {commentsForModeration.length === 0 ? (
          <div>No comments are currently awaiting moderation.</div>
        ) : (
          <form onSubmit={doModerateComments}>
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
                  <Link href={`/crosswords/${cfm.pid}`}>puzzle</Link> {cfm.n}:
                  <Markdown text={cfm.c} />
                </label>
              </div>
            ))}
            <input type="submit" value="Moderate" />
          </form>
        )}
        {automoderated ? (
          <>
            <h4 css={{ borderBottom: '1px solid var(--black)' }}>
              Auto-moderated Comments
            </h4>
            {automoderated.length === 0 ? (
              <div>No automoderated comments.</div>
            ) : (
              <>
                {automoderated.map((cfm) => (
                  <div key={cfm.i}>
                    <Link href={`/crosswords/${cfm.pid}`}>puzzle</Link> {cfm.n}:
                    <Markdown text={cfm.c} />
                  </div>
                ))}
                <Button
                  onClick={() => {
                    const db = App.firestore();
                    automoderated.forEach((cfm) => {
                      db.doc(`automoderated/${cfm.i}`).delete();
                    });
                  }}
                  text="Mark as Seen"
                />
              </>
            )}
          </>
        ) : (
          ''
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
                  {cp.n} - <Link href={`/${cp.i}`}>@{cp.i}</Link>
                </p>
                <Markdown text={cp.b} />
              </div>
            ))}
            <input type="submit" value="Mark as moderated" />
          </form>
        )}
        <h4 css={{ marginTop: '2em', borderBottom: '1px solid var(--black)' }}>
          Unmoderated (oldest first)
        </h4>
        {unmoderated.length === 0 ? (
          <div>No puzzles are currently awaiting moderation.</div>
        ) : (
          <>
            <ul>{unmoderated.map(PuzzleListItem)}</ul>
            <Button
              onClick={moderatePrivatePuzzles}
              text="Mark all private as moderated"
            />
          </>
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
                      <Link href={`/crosswords/${crosswordId}`}>
                        {titleForId(stats, crosswordId)}
                      </Link>
                      : {count}(
                      <Link href={`/crosswords/${crosswordId}/stats`}>
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
        <h4 css={{ borderBottom: '1px solid var(--black)' }}>
          Record Donation
        </h4>
        <form
          onSubmit={(e: React.FormEvent) => {
            e.preventDefault();
            if (!donationEmail.trim()) {
              return;
            }
            const toAdd = {
              e: donationEmail.trim(),
              d: TimestampClass.now(),
              a: parseFloat(donationAmount),
              r: parseFloat(donationReceivedAmount),
              n: donationName.trim() || null,
              p: donationPage.trim() || null,
            };
            App.firestore()
              .doc('donations/donations')
              .set({ d: FieldValue.arrayUnion(toAdd) }, { merge: true })
              .then(() => {
                showSnackbar('Added Donation');
                setDonationEmail('');
                setDonationAmount('');
                setDonationReceivedAmount('');
                setDonationName('');
                setDonationPage('');
              });
          }}
        >
          <label>
            Email
            <input
              css={{ margin: '0 0.5em' }}
              type="text"
              value={donationEmail}
              onChange={(e) => setDonationEmail(e.target.value)}
            />
          </label>
          <label>
            Amount
            <input
              css={{ margin: '0 0.5em' }}
              type="text"
              value={donationAmount}
              onChange={(e) => setDonationAmount(e.target.value)}
            />
          </label>
          <label>
            Received Amount
            <input
              css={{ margin: '0 0.5em' }}
              type="text"
              value={donationReceivedAmount}
              onChange={(e) => setDonationReceivedAmount(e.target.value)}
            />
          </label>
          <label>
            Name
            <input
              css={{ margin: '0 0.5em' }}
              type="text"
              value={donationName}
              onChange={(e) => setDonationName(e.target.value)}
            />
          </label>
          <label>
            Page
            <input
              css={{ margin: '0 0.5em' }}
              type="text"
              value={donationPage}
              onChange={(e) => setDonationPage(e.target.value)}
            />
          </label>
          <Button type="submit" text="Record Donation" />
        </form>
        {donations ? (
          <>
            <h4 css={{ borderBottom: '1px solid var(--black)' }}>
              Donation Totals
            </h4>
            <p>
              Total given:{' '}
              {Math.floor(donations.d.reduce((prev, cur) => prev + cur.a, 0))}
            </p>
            <p>
              Total received:{' '}
              {Math.floor(donations.d.reduce((prev, cur) => prev + cur.r, 0))}
            </p>
          </>
        ) : (
          ''
        )}
      </div>
    </>
  );
});
