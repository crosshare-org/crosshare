import { formatDistanceToNow } from 'date-fns/formatDistanceToNow';
import { lightFormat } from 'date-fns/lightFormat';
import {
  arrayRemove,
  arrayUnion,
  deleteField,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';
import { isRight } from 'fp-ts/lib/Either';
import { PathReporter } from 'io-ts/lib/PathReporter';
import dynamic from 'next/dynamic';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useMemo, useRef, useState } from 'react';
import { useDocument } from 'react-firebase-hooks/firestore';
import { AlternateSolutionEditor } from '../../components/AlternateSolutionEditor';
import { requiresAuth, AuthProps } from '../../components/AuthHelpers';
import { Button, ButtonAsLink } from '../../components/Buttons';
import {
  MAX_META_SUBMISSION_LENGTH,
  MAX_STRING_LENGTH,
  MAX_BLOG_LENGTH,
} from '../../components/ClueMode';
import { ContactLinks } from '../../components/ContactLinks';
import { DateTimePicker } from '../../components/DateTimePicker';
import { EditableText } from '../../components/EditableText';
import { ErrorPage } from '../../components/ErrorPage';
import { GridContext } from '../../components/GridContext';
import { LengthView, LengthLimitedInput } from '../../components/Inputs';
import { Markdown } from '../../components/Markdown';
import { Overlay } from '../../components/Overlay';
import { useSnackbar } from '../../components/Snackbar';
import { TagEditor } from '../../components/TagEditor';
import { TagList } from '../../components/TagList';
import { DefaultTopBar } from '../../components/TopBar';
import { DBPuzzleV, DBPuzzleT } from '../../lib/dbtypes';
import { getDocRef } from '../../lib/firebaseWrapper';
import { markdownToHast } from '../../lib/markdown/markdown';
import { COVER_PIC } from '../../lib/style';
import { withTranslation } from '../../lib/translation';
import {
  PuzzleResult,
  puzzleFromDB,
  Direction,
  removeClueSpecials,
} from '../../lib/types';
import { clsx, isMetaSolution, logAsyncErrors } from '../../lib/utils';
import { fromCells, CluedEntry, addClues } from '../../lib/viewableGrid';
import styles from './editPuzzle.module.css';

export const getServerSideProps = withTranslation(() => {
  return Promise.resolve({ props: {} });
});

const ImageCropper = dynamic(
  () => import('../../components/ImageCropper').then((mod) => mod.ImageCropper),
  { ssr: false }
);

export default requiresAuth((props: AuthProps) => {
  const router = useRouter();
  const { puzzleId } = router.query;
  // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
  if (!puzzleId) {
    return <div />;
  }
  if (Array.isArray(puzzleId)) {
    return <ErrorPage title="Bad Puzzle Id" />;
  }
  return <PuzzleLoader key={puzzleId} puzzleId={puzzleId} auth={props} />;
});

// export for testing
export const PuzzleLoader = ({
  puzzleId,
  auth,
}: {
  puzzleId: string;
  auth: AuthProps;
}) => {
  const puzRef = useRef(getDocRef('c', puzzleId));
  const [doc, loading, error] = useDocument(puzRef.current);
  const [puzzle, puzzleDecodeError] = useMemo(() => {
    if (doc === undefined) {
      return [undefined, undefined];
    }
    if (!doc.exists()) {
      return [null, undefined];
    }
    const validationResult = DBPuzzleV.decode(
      doc.data({ serverTimestamps: 'previous' })
    );
    if (isRight(validationResult)) {
      const puzzle = validationResult.right;
      return [puzzle, undefined];
    } else {
      console.log(PathReporter.report(validationResult).join(','));
      return [undefined, 'failed to decode puzzle'];
    }
  }, [doc]);

  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
  if (error || puzzleDecodeError) {
    return (
      <ErrorPage title="Something Went Wrong">
        {/* eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing */}
        <p>{error?.message || puzzleDecodeError}</p>
      </ErrorPage>
    );
  }
  if (loading) {
    return <div>Loading...</div>;
  }
  if (!puzzle) {
    return (
      <ErrorPage title="Something Went Wrong">
        <p>Failed to load the puzzle!</p>
      </ErrorPage>
    );
  }

  const nicePuzzle: PuzzleResult = { ...puzzleFromDB(puzzle), id: puzzleId };

  if (!auth.isAdmin && auth.user.uid !== nicePuzzle.authorId) {
    return (
      <ErrorPage title="Not Allowed">
        <p>You do not have permission to view this page</p>
      </ErrorPage>
    );
  }

  return <PuzzleEditor key={puzzleId} puzzle={nicePuzzle} dbPuzzle={puzzle} />;
};

const ClueRow = (props: {
  puzzleId: string;
  ac: string[];
  an: number[];
  dc: string[];
  dn: number[];
  entry: CluedEntry;
}) => {
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [value, setValue] = useState(props.entry.clue);
  const word = props.entry.completedWord;
  if (word === null) {
    throw new Error("shouldn't ever get here");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const toSubmit = value.trim();
    if (toSubmit.length === 0) {
      return;
    }
    setSubmitting(true);
    let update: Record<string, string[]>;
    if (props.entry.direction === Direction.Across) {
      update = {
        ac: props.ac.map((v, i) => {
          if (props.an[i] === props.entry.labelNumber) {
            return toSubmit;
          }
          return v;
        }),
      };
    } else {
      update = {
        dc: props.dc.map((v, i) => {
          if (props.dn[i] === props.entry.labelNumber) {
            return toSubmit;
          }
          return v;
        }),
      };
    }
    await updateDoc(getDocRef('c', props.puzzleId), update).then(() => {
      setSubmitting(false);
      setEditing(false);
    });
  }

  return (
    <tr>
      <td
        css={{
          paddingRight: '0.5em',
          paddingBottom: '1em',
          textAlign: 'right',
          width: '1px',
        }}
      >
        {props.entry.labelNumber}
        {props.entry.direction === Direction.Down ? 'D' : 'A'}
      </td>
      <td
        css={{
          paddingRight: '0.5em',
          paddingBottom: '1em',
          textAlign: 'right',
          width: '1px',
        }}
      >
        <label className="marginBottom0" htmlFor={word + '-input'}>
          {word}
        </label>
      </td>
      <td className="paddingBottom1em">
        {editing ? (
          <form
            css={{ display: 'flex', flexWrap: 'wrap' }}
            onSubmit={logAsyncErrors(handleSubmit)}
          >
            <LengthLimitedInput
              id={word + '-input'}
              type="text"
              css={{ marginRight: '0.5em', flex: '1 1 auto' }}
              placeholder="Enter a clue"
              value={value}
              updateValue={setValue}
              maxLength={MAX_STRING_LENGTH}
              spellCheck="true"
            />
            <LengthView
              maxLength={MAX_STRING_LENGTH}
              value={value}
              hideUntilWithin={30}
            />
            <Button
              type="submit"
              text="Save"
              disabled={submitting || !value.trim()}
            />
            <Button
              boring={true}
              className="marginLeft0-5em"
              onClick={() => {
                setEditing(false);
                setValue(props.entry.clue);
              }}
              text="Cancel"
            />
          </form>
        ) : (
          <>
            {props.entry.clue.startsWith('!#') ? (
              <span>{removeClueSpecials(props.entry.clue)}</span>
            ) : (
              <Markdown
                css={{
                  display: 'inline',
                  '& .paragraph': { display: 'inline' },
                }}
                hast={props.entry.clueHast}
                noRefs={props.entry.clue.startsWith('!@')}
                inline={true}
              />
            )}
            <ButtonAsLink
              className="marginLeft1em"
              text="edit"
              title={`Edit ${word}`}
              onClick={() => {
                setEditing(true);
              }}
            />
          </>
        )}
      </td>
    </tr>
  );
};

const PuzzleEditor = ({
  puzzle,
  dbPuzzle,
}: {
  puzzle: PuzzleResult;
  dbPuzzle: DBPuzzleT;
}) => {
  const grid = useMemo(() => {
    return addClues(
      fromCells({
        mapper: (e) => e,
        width: puzzle.size.cols,
        height: puzzle.size.rows,
        cells: puzzle.grid,
        allowBlockEditing: false,
        highlighted: new Set(puzzle.highlighted),
        highlight: puzzle.highlight,
        vBars: new Set(puzzle.vBars),
        hBars: new Set(puzzle.hBars),
        hidden: new Set(puzzle.hidden),
      }),
      puzzle.clues,
      (c: string) => markdownToHast({ text: c, inline: true })
    );
  }, [puzzle]);
  const clueRows = grid.entries
    .sort((e1, e2) =>
      e1.direction === e2.direction
        ? e1.labelNumber - e2.labelNumber
        : e1.direction - e2.direction
    )
    .map((e) => (
      <ClueRow
        puzzleId={puzzle.id}
        key={e.completedWord ?? ''}
        entry={e}
        ac={dbPuzzle.ac}
        an={dbPuzzle.an}
        dc={dbPuzzle.dc}
        dn={dbPuzzle.dn}
      />
    ));
  const [settingCoverPic, setSettingCoverPic] = useState(false);
  const [showingDeleteOverlay, setShowingDeleteOverlay] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const router = useRouter();
  const { showSnackbar } = useSnackbar();

  const [isPrivate, setIsPrivate] = useState(puzzle.isPrivate);
  const [isPrivateUntil, setIsPrivateUntil] = useState(puzzle.isPrivateUntil);
  const [addingAlternate, setAddingAlternate] = useState(false);
  const [editingTags, setEditingTags] = useState(false);

  if (addingAlternate) {
    return (
      <>
        <AlternateSolutionEditor
          grid={puzzle.grid}
          save={async (alt) =>
            updateDoc(getDocRef('c', puzzle.id), {
              alts: arrayUnion(alt),
            })
          }
          cancel={() => {
            setAddingAlternate(false);
          }}
          width={puzzle.size.cols}
          height={puzzle.size.rows}
          highlight={puzzle.highlight}
          highlighted={new Set(puzzle.highlighted)}
          vBars={new Set(puzzle.vBars)}
          hBars={new Set(puzzle.hBars)}
          hidden={new Set(puzzle.hidden)}
        />
      </>
    );
  }

  return (
    <>
      <GridContext.Provider value={grid}>
        <Head>
          <title>{`Editing | ${puzzle.title} | Crosshare`}</title>
        </Head>
        <DefaultTopBar />
        <div className="margin1em">
          <p>
            Note: changes may take up to an hour to appear on the site - we
            cache pages to keep Crosshare fast!
          </p>
          <h3>Title</h3>
          <EditableText
            title="Title"
            className="marginBottom1em"
            text={puzzle.title}
            hast={false}
            maxLength={MAX_STRING_LENGTH}
            handleSubmit={(newTitle) =>
              updateDoc(getDocRef('c', puzzle.id), { t: newTitle })
            }
          />
          <h3>Clues</h3>
          <table className="width100">
            <tbody>{clueRows}</tbody>
          </table>
          <h3>Tags</h3>
          <p>
            Tags are shown any time a puzzle is displayed on the site, and help
            solvers quickly find puzzles with a particular attribute or theme.
          </p>
          {editingTags ? (
            <div className="marginBottom1-5em">
              <TagEditor
                userTags={puzzle.userTags ?? []}
                autoTags={puzzle.autoTags ?? []}
                cancel={() => {
                  setEditingTags(false);
                }}
                save={async (newTags) =>
                  updateDoc(getDocRef('c', puzzle.id), { tg_u: newTags }).then(
                    () => {
                      setEditingTags(false);
                    }
                  )
                }
              />
            </div>
          ) : (
            <>
              <h4>Current tags:</h4>
              <TagList
                tags={(puzzle.userTags ?? []).concat(puzzle.autoTags ?? [])}
              />
              <p>
                <Button
                  onClick={() => {
                    setEditingTags(true);
                  }}
                  text="Edit Tags"
                />
              </p>
            </>
          )}
          <h3>Post</h3>
          <h4>Constructor&apos;s Note</h4>
          <p>
            Notes are shown before a puzzle is started and should be used if you
            need a short explainer of the theme or how the puzzle works
          </p>
          <EditableText
            title="Constructor Note"
            deletable={true}
            className="marginBottom1em"
            text={puzzle.constructorNotes}
            hast={markdownToHast({ text: puzzle.constructorNotes ?? '' })}
            maxLength={MAX_STRING_LENGTH}
            handleSubmit={(notes) =>
              updateDoc(getDocRef('c', puzzle.id), { cn: notes })
            }
            handleDelete={() =>
              updateDoc(getDocRef('c', puzzle.id), { cn: deleteField() })
            }
          />
          <h4>Guest Constructor</h4>
          <EditableText
            title="Constructor's Name"
            deletable={true}
            className="marginBottom1em"
            text={puzzle.guestConstructor}
            hast={false}
            maxLength={MAX_STRING_LENGTH}
            handleSubmit={(gc) =>
              updateDoc(getDocRef('c', puzzle.id), { gc: gc })
            }
            handleDelete={() =>
              updateDoc(getDocRef('c', puzzle.id), { gc: deleteField() })
            }
          />
          <h4>Blog Post</h4>
          <p>
            Blog posts are shown before solvers are finished with your puzzle -
            describe how you came up with the puzzle, talk about your day,
            whatever you want! If you include spoilers you can hide them{' '}
            <code>||like this||</code>.
          </p>
          <EditableText
            textarea={true}
            title="Blog Post"
            deletable={true}
            className="marginBottom1em"
            text={puzzle.blogPost}
            hast={markdownToHast({ text: puzzle.blogPost ?? '' })}
            maxLength={MAX_BLOG_LENGTH}
            handleSubmit={(post) =>
              updateDoc(getDocRef('c', puzzle.id), { bp: post })
            }
            handleDelete={() =>
              updateDoc(getDocRef('c', puzzle.id), { bp: deleteField() })
            }
          />
          <h4>Cover Image</h4>
          <Button
            onClick={() => {
              setSettingCoverPic(true);
            }}
            text="Add/edit cover pic"
          />
          {settingCoverPic ? (
            <ImageCropper
              targetSize={COVER_PIC}
              isCircle={false}
              storageKey={`/users/${puzzle.authorId}/${puzzle.id}/cover.jpg`}
              cancelCrop={() => {
                setSettingCoverPic(false);
              }}
            />
          ) : (
            ''
          )}
          <h3 className="marginTop1em">Privacy</h3>
          {
            // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
            puzzle.isPrivate ? (
              <p>This puzzle is currently private.</p>
            ) : puzzle.isPrivateUntil && puzzle.isPrivateUntil > Date.now() ? (
              <p>
                This puzzle is currently private until{' '}
                {formatDistanceToNow(new Date(puzzle.isPrivateUntil))} from now.
              </p>
            ) : (
              <p>This puzzle is currently public.</p>
            )
          }
          <p>
            Private puzzles don&apos;t appear on your constructor blog and
            aren&apos;t eligible to be featured on the Crosshare homepage or in
            Crosshare&apos;s weekly email. Private puzzles are still visible to
            anybody you share the link with.
          </p>
          <p>
            <label>
              <input
                className="marginRight1em"
                type="checkbox"
                // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
                checked={isPrivate ? true : false}
                onChange={(e) => {
                  if (!e.target.checked) {
                    setIsPrivateUntil(
                      typeof puzzle.isPrivate === 'number'
                        ? puzzle.isPrivate
                        : Date.now()
                    );
                    setIsPrivate(false);
                  } else {
                    setIsPrivate(
                      puzzle.isPrivate === true ||
                        (puzzle.isPrivateUntil &&
                          puzzle.isPrivateUntil > Date.now())
                        ? true
                        : // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
                          puzzle.isPrivateUntil || puzzle.publishTime
                    );
                    setIsPrivateUntil(null);
                  }
                }}
              />{' '}
              Private
            </label>
          </p>
          {puzzle.isPrivate === true ||
          (puzzle.isPrivateUntil && puzzle.isPrivateUntil > Date.now()) ? (
            <p>
              <label>
                <input
                  className="marginRight1em"
                  type="checkbox"
                  checked={
                    isPrivateUntil !== null && isPrivateUntil > Date.now()
                  }
                  onChange={(e) => {
                    if (e.target.checked) {
                      setIsPrivate(false);
                      setIsPrivateUntil(Date.now() + 24 * 60 * 60 * 1000);
                    } else {
                      setIsPrivateUntil(Date.now() - 10);
                    }
                  }}
                />{' '}
                Private until specified date/time
              </label>
              {isPrivateUntil && isPrivateUntil > Date.now() ? (
                <p>
                  Visible after{' '}
                  {lightFormat(isPrivateUntil, "M/d/y' at 'h:mma")} (
                  {
                    new Date(isPrivateUntil)
                      .toLocaleTimeString('en-us', { timeZoneName: 'short' })
                      .split(' ')[2]
                  }
                  ):
                  <DateTimePicker
                    picked={isPrivateUntil}
                    setPicked={(d) => {
                      setIsPrivateUntil(d.getTime());
                    }}
                  />
                </p>
              ) : (
                ''
              )}
            </p>
          ) : (
            <p>Private until is unavailable if a puzzle has ever been public</p>
          )}
          <Button
            className="marginRight1em"
            text="Update Privacy Settings"
            disabled={
              isPrivate === puzzle.isPrivate &&
              isPrivateUntil === puzzle.isPrivateUntil
            }
            onClick={logAsyncErrors(async () => {
              await updateDoc(getDocRef('c', puzzle.id), {
                pv:
                  typeof isPrivate === 'number'
                    ? Timestamp.fromMillis(isPrivate)
                    : isPrivate,
                // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
                pvu: isPrivate
                  ? deleteField()
                  : isPrivateUntil
                  ? Timestamp.fromMillis(isPrivateUntil)
                  : Timestamp.now(),
              }).then(() => {
                showSnackbar(
                  'Privacy settings updated - it may take up to an hour for updates to be visible on the site.'
                );
              });
            })}
          />
          <Button
            text="Cancel"
            disabled={
              isPrivate === puzzle.isPrivate &&
              isPrivateUntil === puzzle.isPrivateUntil
            }
            onClick={() => {
              setIsPrivate(puzzle.isPrivate);
              setIsPrivateUntil(puzzle.isPrivateUntil);
            }}
          />
          <h3 className="marginTop1em">Contest / meta puzzle</h3>
          <p>
            A meta puzzle has an extra puzzle embedded in the grid for after
            solvers have finished solving. Solvers can submit their solution,
            find out if they were right or wrong, and view a leaderboard of
            those who have solved the contest correctly.
          </p>
          {puzzle.constructorNotes ? (
            <>
              {puzzle.contestAnswers?.length ? (
                <>
                  <p>Contest mode is on for this puzzle. Solutions:</p>
                  <ul>
                    {puzzle.contestAnswers.map((a) => (
                      <li key={a}>
                        {a} (
                        <ButtonAsLink
                          onClick={logAsyncErrors(async () => {
                            await updateDoc(getDocRef('c', puzzle.id), {
                              ct_ans: arrayRemove(a),
                            });
                          })}
                          text="remove"
                        />
                        )
                      </li>
                    ))}
                  </ul>
                  <p>
                    Add another solution (submissions will match regardless of
                    case, whitespace, and punctuation):
                  </p>
                </>
              ) : (
                <>
                  <p>
                    Add a solution to enable contest mode for this puzzle
                    (submissions will match regardless of case, whitespace, and
                    punctuation):
                  </p>
                </>
              )}
              <EditableText
                title="Solution"
                className="marginBottom1em"
                text={''}
                hast={false}
                maxLength={MAX_META_SUBMISSION_LENGTH}
                hasError={(sol) =>
                  puzzle.contestAnswers &&
                  isMetaSolution(sol, puzzle.contestAnswers)
                    ? 'Duplicate solution!'
                    : ''
                }
                handleSubmit={(sol) =>
                  updateDoc(getDocRef('c', puzzle.id), {
                    ct_ans: arrayUnion(sol.trim()),
                  })
                }
              />
              {puzzle.contestAnswers?.length ? (
                <>
                  {puzzle.contestHasPrize ? (
                    <>
                      <p>
                        This puzzle has a prize. Solvers will be notified and
                        can choose to include their email address in their
                        submission to be eligible to win.
                      </p>
                      <Button
                        onClick={logAsyncErrors(async () => {
                          await updateDoc(getDocRef('c', puzzle.id), {
                            ct_prz: false,
                          });
                        })}
                        text="Remove Prize"
                      />
                    </>
                  ) : (
                    <>
                      <p>
                        This puzzle does not have a prize. If a puzzle has a
                        prize, solvers will be notified and can choose to
                        include their email address in their submission to be
                        eligible to win.
                      </p>
                      <Button
                        onClick={logAsyncErrors(async () => {
                          await updateDoc(getDocRef('c', puzzle.id), {
                            ct_prz: true,
                          });
                        })}
                        text="Add a Prize"
                      />
                    </>
                  )}
                </>
              ) : (
                ''
              )}
            </>
          ) : (
            <p>
              To make this puzzle a contest puzzle, first use the notes field
              above to add a prompt for the contest.
            </p>
          )}
          <h3 className="marginTop1em">Alternate Solutions</h3>
          <p>
            Alternate solutions can be used if one or more entries in your
            puzzle have multiple valid solutions (e.g. a Schrödinger&apos;s
            puzzle or a puzzle with bi-directional rebuses).
          </p>
          {puzzle.alternateSolutions.length ? (
            <ul>
              {puzzle.alternateSolutions.map((a, i) => (
                <li key={i}>
                  {a.map(([pos, str]) => (
                    <span
                      css={{ '& + &:before': { content: '", "' } }}
                      key={pos}
                    >
                      Cell {pos}: &quot;{str}&quot;
                    </span>
                  ))}{' '}
                  (
                  <ButtonAsLink
                    onClick={logAsyncErrors(async () => {
                      const toRemove = a.reduce<Record<number, string>>(
                        (prev, [n, s]) => {
                          prev[n] = s;
                          return prev;
                        },
                        {}
                      );
                      console.log(toRemove);
                      await updateDoc(getDocRef('c', puzzle.id), {
                        alts: arrayRemove(toRemove),
                      });
                    })}
                    text="remove"
                  />
                  )
                </li>
              ))}
            </ul>
          ) : (
            ''
          )}
          <Button
            onClick={() => {
              setAddingAlternate(true);
            }}
            text="Add an alternate solution"
          />
          <h3 className="marginTop1em">Comments</h3>
          <label>
            <input
              className="marginRight1em"
              type="checkbox"
              checked={puzzle.commentsDisabled}
              onChange={logAsyncErrors(async (e) => {
                await updateDoc(getDocRef('c', puzzle.id), {
                  no_cs: e.target.checked,
                }).then(() => {
                  showSnackbar('comment setting updated');
                });
              })}
            />{' '}
            Disable comments for this puzzle
          </label>
          <h3 className="marginTop1em">Delete</h3>
          {puzzle.dailyMiniDate ? (
            <p>
              This puzzle has been selected as a daily mini - please contact us
              via <ContactLinks /> if you need to delete it.
            </p>
          ) : (
            <>
              <p>
                Puzzle deletion is <b>permanent</b>.
              </p>
              <Button
                className={styles.deleteBtn}
                text="Delete"
                onClick={() => {
                  setShowingDeleteOverlay(true);
                }}
              />
              {showingDeleteOverlay ? (
                <Overlay
                  closeCallback={() => {
                    setShowingDeleteOverlay(false);
                  }}
                >
                  <p>Type DELETE to confirm deletion</p>
                  <input
                    type="text"
                    value={deleteConfirmation}
                    onChange={(e) => {
                      setDeleteConfirmation(e.target.value);
                    }}
                  />
                  <Button
                    className={clsx(styles.deleteBtn, 'marginLeft1em')}
                    text="Confirm Delete"
                    disabled={deleteConfirmation.toLowerCase() !== 'delete'}
                    onClick={logAsyncErrors(async () => {
                      await updateDoc(getDocRef('c', puzzle.id), {
                        del: true,
                      }).then(async () => {
                        showSnackbar(
                          'Your puzzle has been deleted - it may take up to an hour to be fully removed from the site.'
                        );
                        await router.push('/');
                      });
                    })}
                  />
                </Overlay>
              ) : (
                ''
              )}
            </>
          )}
        </div>
      </GridContext.Provider>
    </>
  );
};
