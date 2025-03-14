import {
  Timestamp,
  addDoc,
  arrayUnion,
  deleteField,
  doc,
  query,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import Head from 'next/head';
import NextJSRouter from 'next/router';
import React, {
  FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  useCollectionData,
  useDocumentDataOnce,
} from 'react-firebase-hooks/firestore';
import { requiresAdmin } from '../components/AuthHelpers.js';
import { Button } from '../components/Buttons.js';
import { ConstructorNotes } from '../components/ConstructorNotes.js';
import { Link } from '../components/Link.js';
import { Markdown } from '../components/Markdown.js';
import { CommentReportV } from '../components/ReportOverlay.js';
import { useSnackbar } from '../components/Snackbar.js';
import { TagList } from '../components/TagList.js';
import { DefaultTopBar } from '../components/TopBar.js';
import { UpcomingMinisCalendar } from '../components/UpcomingMinisCalendar.js';
import { ConstructorPageWithIdV } from '../lib/constructorPage.js';
import { getFromSessionOrDB } from '../lib/dbUtils.js';
import {
  AdminSettingsV,
  CommentDeletionT,
  CommentForModerationWithIdV,
  DBPuzzleWithIdV,
  DailyStatsT,
  DailyStatsV,
  DonationsListV,
  getDateString,
} from '../lib/dbtypes.js';
import {
  getCollection,
  getDocRef,
  getValidatedCollection,
} from '../lib/firebaseWrapper.js';
import { hasUnches } from '../lib/gridBase.js';
import { markdownToHast } from '../lib/markdown/markdown.js';
import { checkSpam } from '../lib/spam.js';
import { withStaticTranslation } from '../lib/translation.js';
import { PuzzleResult, puzzleFromDB } from '../lib/types.js';
import { logAsyncErrors, slugify } from '../lib/utils.js';
import { fromCells, getClueMap } from '../lib/viewableGrid.js';

export const getStaticProps = withStaticTranslation(() => {
  return { props: {} };
});

function paypalConvert(input: string): string {
  const donated = parseFloat(input);
  const fee = 0.0289 * donated + 0.49;
  return (donated - fee).toFixed(2);
}

function intersect(a: string[], b: string[]): string[] {
  const setB = new Set(b);
  return [...new Set(a)].filter((x) => setB.has(x));
}

const PuzzleListItem = (props: PuzzleResult & { crypticMods: string[] }) => {
  async function markAsModerated(featured: boolean) {
    const update = { m: true, c: null, f: featured };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await updateDoc(getDocRef('c', props.id), update as any).then(() => {
      console.log('moderated');
    });
  }

  async function makePrivate() {
    const update = { pv: true, pvu: deleteField() };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await updateDoc(getDocRef('c', props.id), update as any).then(() => {
      console.log('marked private');
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
    return (
      <div key={i} className={checkSpam(merged) ? 'colorError' : ''}>
        {merged}
      </div>
    );
  });
  const modLikes = intersect(props.crypticMods, props.likes);
  return (
    <li key={props.id} className="marginBottom2em">
      <Link href={`/crosswords/${props.id}/${slugify(props.title)}`}>
        {props.title}
      </Link>{' '}
      by {props.authorName}
      <TagList tags={(props.userTags ?? []).concat(props.autoTags ?? [])} />
      {props.constructorNotes ? (
        <div className="textAlignCenter overflowWrapBreakWord">
          <ConstructorNotes
            notes={markdownToHast({ text: props.constructorNotes })}
          />
        </div>
      ) : (
        ''
      )}
      {props.blogPost ? (
        <div className="margin1em0 overflowWrapBreakWord">
          <Markdown
            className="textAlignLeft"
            hast={markdownToHast({ text: props.blogPost })}
          />
        </div>
      ) : (
        ''
      )}
      {puzHasUnches ? <div className="colorError">Puzzle has unches</div> : ''}
      {clues}
      <ul>
        {props.comments.map((c, i) => (
          <li key={i}>
            <b>{c.n}</b>: {c.c}
          </li>
        ))}
      </ul>
      {props.likes.length > 0 ? <div>Likes: {props.likes.length}</div> : ''}
      {props.userTags?.includes('cryptic') && modLikes.length > 0 ? (
        <div>Cryptic Mod Likes: {modLikes.length}</div>
      ) : (
        ''
      )}
      <div className="marginBottom1em">
        <button
          // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
          disabled={!!props.isPrivate}
          onClick={logAsyncErrors(async () => {
            return markAsModerated(true);
          })}
        >
          Set as Featured
        </button>
      </div>
      <div className="marginBottom1em">
        <button
          onClick={logAsyncErrors(async () => {
            return makePrivate();
          })}
        >
          Make Private
        </button>
      </div>
      <div className="marginBottom1em">
        <button
          onClick={logAsyncErrors(async () => {
            return markAsModerated(false);
          })}
        >
          Mark as Moderated
        </button>
      </div>
    </li>
  );
};

export default requiresAdmin(() => {
  const [donationEmail, setDonationEmail] = useState('');
  const [donationAmount, setDonationAmount] = useState('');
  const [donationReceivedAmount, setDonationReceivedAmount] = useState('');
  const [donationName, setDonationName] = useState('');
  const [donationPage, setDonationPage] = useState('');
  const [donationUserId, setDonationUserId] = useState('');
  const [newHomepageText, setNewHomepageText] = useState<string>('');
  const { showSnackbar } = useSnackbar();

  const puzzleCollection = useRef(
    query(
      getValidatedCollection('c', DBPuzzleWithIdV, 'id'),
      where('m', '==', false),
      where('rfm', '==', true),
      where('pvu', '<=', Timestamp.now())
    )
  );
  const [dbUnmoderated] = useCollectionData(puzzleCollection.current);
  const unmoderated: PuzzleResult[] = (dbUnmoderated ?? [])
    .map((x) => ({ ...puzzleFromDB(x, x.id), id: x.id }))
    .sort((a, b) => (a.isPrivateUntil ?? 0) - (b.isPrivateUntil ?? 0));

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
    query(
      getValidatedCollection('cfm', CommentForModerationWithIdV, 'i'),
      where('needsModeration', '==', true)
    )
  );
  const [commentsForModeration] = useCollectionData(
    forModerationCollection.current
  );

  const reportedCommentsCollection = useRef(
    query(getValidatedCollection('cr', CommentReportV), where('h', '==', false))
  );
  const [reportedComments] = useCollectionData(
    reportedCommentsCollection.current
  );

  const donationsCollection = useRef(
    doc(getValidatedCollection('donations', DonationsListV), 'donations')
  );
  const [donations] = useDocumentDataOnce(donationsCollection.current);

  const [crypticMods, setCrypticMods] = useState<string[]>([]);

  useEffect(() => {
    getFromSessionOrDB({
      collection: 'settings',
      docId: 'settings',
      validator: AdminSettingsV,
      ttl: 1 * 60 * 60 * 1000,
    })
      .then((x) => {
        if (x) {
          setCrypticMods(x.crypticMods ?? []);
        }
      })
      .catch((e: unknown) => {
        console.error('failed to get settings', e);
      });
  }, []);

  const goToPuzzle = useCallback((_date: Date, puzzle: string | null) => {
    if (puzzle) {
      void NextJSRouter.push('/crosswords/' + puzzle);
    }
  }, []);

  function titleForId(stats: DailyStatsT, crosswordId: string): string {
    const forPuzzle = stats.i?.[crosswordId];
    if (forPuzzle) {
      return forPuzzle[0] + ' by ' + forPuzzle[1];
    }
    return crosswordId;
  }

  async function moderatePages(e: FormEvent) {
    e.preventDefault();
    if (pagesForModeration) {
      for (const cp of pagesForModeration) {
        await setDoc(getDocRef('cp', cp.id), { m: false }, { merge: true });
      }
    }
  }

  return (
    <>
      <Head>
        <title>{`Admin | Crosshare`}</title>
        <meta name="robots" content="noindex" />
      </Head>
      <DefaultTopBar />
      <div className="margin1em">
        {reportedComments?.length ? (
          <>
            <h4 className="borderBottom1pxSolidBlack">Reported Comments:</h4>
            <ul>
              {reportedComments.map((rc) => (
                <li key={`${rc.cid}-${rc.u}`}>
                  <div>{rc.ct}</div>
                  <div>
                    <i>- {rc.cn}</i>
                  </div>
                  <div>Notes: {rc.n}</div>
                  <div>
                    <Link href={`/crosswords/${rc.pid}`}>puzzle</Link> -{' '}
                    {rc.pid}
                  </div>
                  <button
                    disabled={rc.d || !rc.ca}
                    className="marginRight2em"
                    onClick={logAsyncErrors(async () => {
                      if (!rc.ca) {
                        return;
                      }
                      const deletion: CommentDeletionT = {
                        pid: rc.pid,
                        cid: rc.cid,
                        a: rc.ca,
                        removed: true,
                      };
                      await addDoc(
                        getCollection('deleteComment'),
                        deletion
                      ).then(() => {
                        console.log('delete comment');
                      });
                      await updateDoc(getDocRef('cr', `${rc.cid}-${rc.u}`), {
                        d: true,
                      }).then(() => {
                        console.log('marked as deleted');
                      });
                    })}
                  >
                    Delete Comment
                  </button>
                  <button
                    className="marginRight2em"
                    onClick={logAsyncErrors(async () => {
                      await updateDoc(getDocRef('settings', 'settings'), {
                        noAuto: arrayUnion(rc.ca),
                      }).then(() => {
                        showSnackbar('no automod');
                      });
                    })}
                  >
                    Set No Automod
                  </button>
                  <button
                    onClick={logAsyncErrors(async () => {
                      await updateDoc(getDocRef('cr', `${rc.cid}-${rc.u}`), {
                        h: true,
                      }).then(() => {
                        console.log('marked as handled');
                      });
                    })}
                  >
                    Mark as Handled
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : (
          ''
        )}
        <h4 className="borderBottom1pxSolidBlack">Comment Moderation</h4>
        {!commentsForModeration || commentsForModeration.length === 0 ? (
          <div>No comments are currently awaiting moderation.</div>
        ) : (
          commentsForModeration.map((cfm) => (
            <div key={cfm.i}>
              <Link href={`/crosswords/${cfm.pid}`}>puzzle</Link> {cfm.n}:
              <Markdown hast={markdownToHast({ text: cfm.c })} />
              <button
                className="marginRight2em marginTop1em"
                onClick={logAsyncErrors(async () => {
                  await updateDoc(getDocRef('cfm', cfm.i), {
                    approved: true,
                    needsModeration: deleteField(),
                  }).then(() => {
                    console.log('approved');
                  });
                })}
              >
                Approve
              </button>
              <button
                className="marginRight2em marginTop1em"
                onClick={logAsyncErrors(async () => {
                  await updateDoc(getDocRef('cfm', cfm.i), {
                    rejected: true,
                    needsModeration: deleteField(),
                  }).then(() => {
                    console.log('rejected');
                  });
                })}
              >
                Reject
              </button>
              <button
                className="marginTop1em"
                onClick={logAsyncErrors(async () => {
                  await updateDoc(getDocRef('settings', 'settings'), {
                    noAuto: arrayUnion(cfm.a),
                  }).then(() => {
                    showSnackbar('no automod');
                  });
                })}
              >
                Set No Automod
              </button>
            </div>
          ))
        )}
        <h4 className="marginTop2em borderBottom1pxSolidBlack">
          Page Moderation
        </h4>
        {!pagesForModeration || pagesForModeration.length === 0 ? (
          <div>No pages need moderation.</div>
        ) : (
          <form onSubmit={logAsyncErrors(moderatePages)}>
            {pagesForModeration.map((cp) => (
              <div key={cp.id}>
                <p>
                  {cp.n} - <Link href={`/${cp.i}`}>@{cp.i}</Link>
                </p>
                <Markdown hast={markdownToHast({ text: cp.b })} />
              </div>
            ))}
            <input type="submit" value="Mark as moderated" />
          </form>
        )}
        <h4 className="marginTop2em borderBottom1pxSolidBlack">
          Unmoderated (oldest first)
        </h4>
        {unmoderated.length === 0 ? (
          <div>No puzzles are currently awaiting moderation.</div>
        ) : (
          <>
            <ul>
              {unmoderated.map((um) => (
                <PuzzleListItem {...um} key={um.id} crypticMods={crypticMods} />
              ))}
            </ul>
          </>
        )}
        {stats ? (
          <>
            <h4 className="borderBottom1pxSolidBlack">Today&apos;s Stats</h4>
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
        <h4 className="borderBottom1pxSolidBlack">Upcoming Minis</h4>

        <UpcomingMinisCalendar disableExisting={false} onChange={goToPuzzle} />
        <h4 className="borderBottom1pxSolidBlack">Homepage Text</h4>
        <form
          onSubmit={logAsyncErrors(async (e: React.FormEvent) => {
            e.preventDefault();
            if (!newHomepageText.trim()) {
              await updateDoc(getDocRef('settings', 'settings'), {
                homepageText: deleteField(),
              }).then(() => {
                showSnackbar('reset homepage text');
              });
            } else {
              await updateDoc(getDocRef('settings', 'settings'), {
                homepageText: newHomepageText.trim(),
              }).then(() => {
                showSnackbar('updated homepage text');
              });
            }
          })}
        >
          <textarea
            className="width100"
            value={newHomepageText}
            onChange={(e) => {
              setNewHomepageText(e.target.value);
            }}
          />
          {newHomepageText ? (
            <div className="margin1em0">
              <h5>Live Preview:</h5>
              <Markdown hast={markdownToHast({ text: newHomepageText })} />
            </div>
          ) : (
            ''
          )}
          <Button
            type="submit"
            text="Update Homepage Text"
            className="margin1em0"
          />
        </form>
        <h4 className="borderBottom1pxSolidBlack">Record Donation</h4>
        <form
          onSubmit={logAsyncErrors(async (e: React.FormEvent) => {
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
            await setDoc(
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
              document.getElementById('donationEmail')?.focus();
            });
          })}
        >
          <label>
            Email
            <input
              id="donationEmail"
              className="margin0-0-5em"
              type="text"
              value={donationEmail}
              onChange={(e) => {
                setDonationEmail(e.target.value);
              }}
            />
          </label>
          <label>
            Amount
            <input
              className="margin0-0-5em"
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
              className="margin0-0-5em"
              type="text"
              value={donationReceivedAmount}
              onChange={(e) => {
                setDonationReceivedAmount(e.target.value);
              }}
            />
          </label>
          <label>
            Name
            <input
              className="margin0-0-5em"
              type="text"
              value={donationName}
              onChange={(e) => {
                setDonationName(e.target.value);
              }}
            />
          </label>
          <label>
            Page
            <input
              className="margin0-0-5em"
              type="text"
              value={donationPage}
              onChange={(e) => {
                setDonationPage(e.target.value);
              }}
            />
          </label>
          <label>
            UserId
            <input
              className="margin0-0-5em"
              type="text"
              value={donationUserId}
              onChange={(e) => {
                setDonationUserId(e.target.value);
              }}
            />
          </label>
          <Button type="submit" text="Record Donation" />
        </form>
        {donations ? (
          <>
            <h4 className="borderBottom1pxSolidBlack">Donation Totals</h4>
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
