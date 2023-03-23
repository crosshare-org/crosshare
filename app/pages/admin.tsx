import { FormEvent, useState, useCallback, useRef } from 'react';
import Head from 'next/head';
import NextJSRouter from 'next/router';

import { Markdown } from '../components/Markdown';
import { Link } from '../components/Link';
import { Button } from '../components/Buttons';
import { requiresAdmin } from '../components/AuthHelpers';
import { DefaultTopBar } from '../components/TopBar';
import { PuzzleResult, puzzleFromDB } from '../lib/types';
import {
  DailyStatsT,
  DailyStatsV,
  getDateString,
  CommentForModerationWithIdV,
  DonationsListV,
  DBPuzzleWithIdV,
} from '../lib/dbtypes';
import {
  convertTimestamps,
  getCollection,
  getDocRef,
  getValidatedCollection,
} from '../lib/firebaseWrapper';
import { UpcomingMinisCalendar } from '../components/UpcomingMinisCalendar';
import { ConstructorPageWithIdV } from '../lib/constructorPage';
import { useSnackbar } from '../components/Snackbar';
import { moderateComments } from '../lib/comments';
import { slugify } from '../lib/utils';
import {
  useCollectionData,
  useDocumentDataOnce,
} from 'react-firebase-hooks/firestore';
import {
  arrayUnion,
  deleteDoc,
  doc,
  getDocs,
  query,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { TagList } from '../components/TagList';
import { ConstructorNotes } from '../components/ConstructorNotes';
import { hasUnches } from '../lib/gridBase';
import { fromCells, getClueMap } from '../lib/viewableGrid';
import spam from '../lib/spam.json';
import { markdownToHast } from '../lib/markdown/markdown';
import { css } from '@emotion/react';

function paypalConvert(input: string): string {
  const donated = parseFloat(input);
  const fee = 0.0289 * donated + 0.49;
  return (donated - fee).toFixed(2);
}

function checkSpam(input: string): boolean {
  const lower = input.toLowerCase();
  for (const spamWord of spam) {
    if (lower.indexOf(spamWord) !== -1) {
      return true;
    }
  }
  return false;
}

const red = css({color: 'red'});

const PuzzleListItem = (props: PuzzleResult) => {
  function markAsModerated(featured: boolean) {
    const update = { m: true, c: null, f: featured };
    updateDoc(getDocRef('c', props.id), update).then(() => {
      console.log('moderated');
    });
  }

  const grid = fromCells({
    mapper: (e) => e,
    width: props.size.cols,
    height: props.size.rows,
    cells: props.grid,
    vBars: new Set(props.vBars),
    hBars: new Set(props.hBars),
    allowBlockEditing: false,
    highlighted: new Set(props.highlighted),
    highlight: props.highlight,
    hidden: new Set(props.hidden),
  });
  const puzHasUnches = hasUnches(grid);
  const clueMap = getClueMap(grid, props.clues);
  const clues = Object.keys(clueMap).map((entry, i) => {
    const clues = clueMap[entry];
    const merged = entry + ' ' + clues?.join('; ');
    return <div key={i} css={checkSpam(merged) ? red : {}}>{merged}</div>;
  });
  return (
    <li key={props.id} css={{ marginBottom: '2em' }}>
      <Link href={`/crosswords/${props.id}/${slugify(props.title)}`}>
        {props.title}
      </Link>{' '}
      by {props.authorName}
      <TagList tags={(props.userTags || []).concat(props.autoTags || [])} />
      {props.constructorNotes ? (
        <div css={{ textAlign: 'center', overflowWrap: 'break-word' }}>
          <ConstructorNotes notes={markdownToHast({text: props.constructorNotes})} />
        </div>
      ) : (
        ''
      )}
      {props.blogPost ? (
        <div css={{ margin: '1em 0', overflowWrap: 'break-word' }}>
          <Markdown css={{ textAlign: 'left' }} hast={markdownToHast({text: props.blogPost})} />
        </div>
      ) : (
        ''
      )}
      {puzHasUnches ? <div css={{ color: 'red' }}>Puzzle has unches</div> : ''}
      {clues}
      <ul>
      {props.comments.map((c,i) => (
        <li key={i}>
          <b>{c.n}</b>: {c.c}
        </li>
      ))}
      </ul>
      <div css={{ marginBottom: '1em' }}>
        <button
          // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
          disabled={!!props.isPrivate}
          onClick={() => markAsModerated(true)}
        >
          Set as Featured
        </button>
      </div>
      <div css={{ marginBottom: '1em' }}>
        <button onClick={() => markAsModerated(false)}>
          Mark as Moderated
        </button>
      </div>
    </li>
  );
};

export default requiresAdmin(() => {
  const [commentIdsForDeletion, setCommentIdsForDeletion] = useState<
    Set<string>
  >(new Set());
  const [uidToUnsub, setUidToUnsub] = useState('');
  const [donationEmail, setDonationEmail] = useState('');
  const [donationAmount, setDonationAmount] = useState('');
  const [donationReceivedAmount, setDonationReceivedAmount] = useState('');
  const [donationName, setDonationName] = useState('');
  const [donationPage, setDonationPage] = useState('');
  const [donationUserId, setDonationUserId] = useState('');
  const { showSnackbar } = useSnackbar();

  const puzzleCollection = useRef(
    query(
      getValidatedCollection('c', DBPuzzleWithIdV, 'id'),
      where('m', '==', false),
      where('pvu', '<=', Timestamp.now())
    )
  );
  const [dbUnmoderated] = useCollectionData(puzzleCollection.current);
  const unmoderated: PuzzleResult[] = (dbUnmoderated || [])
    .map((x) => ({ ...puzzleFromDB(x), id: x.id }))
    .sort((a, b) => (a.isPrivateUntil || 0) - (b.isPrivateUntil || 0));

  const now = new Date();
  const dateString = getDateString(now);
  const statsCollection = useRef(
    doc(getValidatedCollection('ds', DailyStatsV), dateString)
  );
  const [stats] = useDocumentDataOnce(statsCollection.current);

  const pagesCollection = useRef(
    query(
      getValidatedCollection('cp', ConstructorPageWithIdV, 'id'),
      where('m', '==', true)
    )
  );
  const [pagesForModeration] = useCollectionData(pagesCollection.current);

  const forModerationCollection = useRef(
    getValidatedCollection('cfm', CommentForModerationWithIdV, 'i')
  );
  const [commentsForModeration] = useCollectionData(
    forModerationCollection.current
  );

  const mailCollection = useRef(
    query(getCollection('mail'), where('delivery.error', '!=', null))
  );
  const [mailErrors] = useCollectionData(mailCollection.current);

  const automoderatedCollection = useRef(
    getValidatedCollection('automoderated', CommentForModerationWithIdV, 'i')
  );
  const [automoderated] = useCollectionData(automoderatedCollection.current);

  const donationsCollection = useRef(
    doc(getValidatedCollection('donations', DonationsListV), 'donations')
  );
  const [donations] = useDocumentDataOnce(donationsCollection.current);

  const goToPuzzle = useCallback((_date: Date, puzzle: string | null) => {
    if (puzzle) {
      NextJSRouter.push('/crosswords/' + puzzle);
    }
  }, []);

  function titleForId(stats: DailyStatsT, crosswordId: string): string {
    const forPuzzle = stats.i?.[crosswordId];
    if (forPuzzle) {
      return forPuzzle[0] + ' by ' + forPuzzle[1];
    }
    return crosswordId;
  }

  async function retryMail(e: FormEvent) {
    e.preventDefault();
    getDocs(
      query(getCollection('mail'), where('delivery.error', '!=', null))
    ).then((r) => {
      r.forEach((s) => {
        console.log('retrying', s.id);
        updateDoc(s.ref, { 'delivery.state': 'RETRY' });
      });
    });
  }

  async function moderatePages(e: FormEvent) {
    e.preventDefault();
    if (pagesForModeration) {
      for (const cp of pagesForModeration) {
        await setDoc(getDocRef('cp', cp.id), { m: false }, { merge: true });
      }
    }
  }

  async function doModerateComments(e: FormEvent) {
    e.preventDefault();
    if (!commentsForModeration) {
      return;
    }
    moderateComments(
      commentsForModeration,
      commentIdsForDeletion,
      (cid) => deleteDoc(getDocRef('cfm', cid)),
      (puzzleId, update) =>
        updateDoc(getDocRef('c', puzzleId), convertTimestamps(update))
    );
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
        <title>{`Admin | Crosshare`}</title>
        <meta name="robots" content="noindex" />
      </Head>
      <DefaultTopBar />
      <div css={{ margin: '1em' }}>
        {mailErrors?.length ? (
          <div>
            <h4>There are {mailErrors.length} mail errors!</h4>
            <Button onClick={retryMail} text="Retry send" />
          </div>
        ) : (
          ''
        )}
        <h4 css={{ borderBottom: '1px solid var(--black)' }}>
          Comment Moderation
        </h4>
        {!commentsForModeration || commentsForModeration.length === 0 ? (
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
                  <Markdown hast={markdownToHast({text: cfm.c})} />
                </label>
              </div>
            ))}
            <Button type="submit" text="Moderate" />
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
                    <Markdown hast={markdownToHast({text: cfm.c})} />
                  </div>
                ))}
                <Button
                  onClick={() => {
                    automoderated.forEach((cfm) => {
                      deleteDoc(getDocRef('automoderated', cfm.i));
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
        {!pagesForModeration || pagesForModeration.length === 0 ? (
          <div>No pages need moderation.</div>
        ) : (
          <form onSubmit={moderatePages}>
            {pagesForModeration.map((cp) => (
              <div key={cp.id}>
                <p>
                  {cp.n} - <Link href={`/${cp.i}`}>@{cp.i}</Link>
                </p>
                <Markdown hast={markdownToHast({text: cp.b})} />
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
                      <Link href={`/stats/${crosswordId}`}>stats</Link>)
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
              setDoc(
                getDocRef('prefs', uidToUnsub),
                { unsubs: arrayUnion('all') },
                { merge: true }
              ).then(() => {
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
              d: Timestamp.now(),
              a: parseFloat(donationAmount),
              r: parseFloat(donationReceivedAmount),
              n: donationName.trim() || null,
              p: donationPage.trim() || null,
              ...(donationUserId.trim() && { u: donationUserId.trim() }),
            };
            setDoc(
              getDocRef('donations', 'donations'),
              { d: arrayUnion(toAdd) },
              { merge: true }
            ).then(() => {
              showSnackbar('Added Donation');
              setDonationEmail('');
              setDonationAmount('');
              setDonationReceivedAmount('');
              setDonationName('');
              setDonationPage('');
              setDonationUserId('');
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
              onChange={(e) => {
                setDonationAmount(e.target.value);
                setDonationReceivedAmount(paypalConvert(e.target.value));
              }}
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
          <label>
            UserId
            <input
              css={{ margin: '0 0.5em' }}
              type="text"
              value={donationUserId}
              onChange={(e) => setDonationUserId(e.target.value)}
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
