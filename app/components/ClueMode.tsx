import { lightFormat } from 'date-fns/lightFormat';
import type { User } from 'firebase/auth';
import dynamic from 'next/dynamic';
import { Dispatch, useMemo, useState } from 'react';
import { FaInfoCircle, FaRegNewspaper } from 'react-icons/fa';
import { markdownToHast } from '../lib/markdown/markdown';
import { sizeTag } from '../lib/sizeTag';
import { COVER_PIC } from '../lib/style';
import { Timestamp } from '../lib/timestamp';
import {
  dbCluesToClueTArray,
  directionString,
  removeClueSpecials,
} from '../lib/types';
import { isMetaSolution } from '../lib/utils';
import { addClues } from '../lib/viewableGrid';
import {
  AddAlternateAction,
  AddEnumerationsAction,
  BuilderEntry,
  BuilderState,
  DelAlternateAction,
  PublishAction,
  RestoreCluesAction,
  SetBlogPostAction,
  SetClueAction,
  SetCommentsDisabledAction,
  SetGuestConstructorAction,
  SetNotesAction,
  SetPrivateAction,
  SetTagsAction,
  SetTitleAction,
  UpdateContestAction,
  getClueProps,
} from '../reducers/builderReducer';
import { PuzzleAction } from '../reducers/commonActions';
import { AlternateSolutionEditor } from './AlternateSolutionEditor';
import { Button, ButtonAsLink } from './Buttons';
import styles from './ClueMode.module.css';
import { DateTimePicker } from './DateTimePicker';
import { GridContext } from './GridContext';
import { SpinnerFinished } from './Icons';
import {
  LengthLimitedInput,
  LengthLimitedTextarea,
  LengthView,
} from './Inputs';
import { Markdown } from './Markdown';
import { Overlay } from './Overlay';
import { PublishOverlay } from './PublishOverlay';
import { useSnackbar } from './Snackbar';
import { TagEditor } from './TagEditor';
import { TagList } from './TagList';
import { ToolTipText } from './ToolTipText';
import { TopBar, TopBarLink } from './TopBar';

export const MAX_STRING_LENGTH = 2048;
export const MAX_BLOG_LENGTH = 20000;
export const MAX_META_SUBMISSION_LENGTH = 100;

const MarkdownPreview = dynamic(() =>
  import('./MarkdownPreview').then((mod) => mod.MarkdownPreview)
);

const ImageCropper = dynamic(
  () => import('./ImageCropper').then((mod) => mod.ImageCropper),
  { ssr: false }
);

const SuggestOverlay = dynamic(
  () => import('./ClueSuggestionOverlay').then((mod) => mod.SuggestOverlay),
  { ssr: false }
);

const ClueRow = (props: {
  idx: number;
  dispatch: Dispatch<PuzzleAction>;
  entry: BuilderEntry;
  clues: Record<string, string[]>;
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const word = props.entry.completedWord;
  if (word === null) {
    throw new Error("shouldn't ever get here");
  }
  const clueText = props.clues[word]?.[props.idx] || '';
  return (
    <>
      <tr>
        <td className={styles.fixedCell}>
          {props.entry.labelNumber}
          {directionString(props.entry.direction)}
        </td>
        <td className={styles.fixedCell}>
          <label
            className="marginBottom0"
            htmlFor={props.entry.completedWord + '-' + props.idx + '-input'}
          >
            {props.entry.completedWord}
          </label>
        </td>
        <td className={styles.clueCell}>
          <LengthLimitedInput
            id={props.entry.completedWord + '-' + props.idx + '-input'}
            spellCheck="true"
            data-testid={props.entry.completedWord + '-' + props.idx + '-input'}
            type="text"
            className="flex1"
            placeholder="Enter a clue"
            value={clueText}
            maxLength={MAX_STRING_LENGTH}
            updateValue={(s: string) => {
              const sca: SetClueAction = {
                type: 'SETCLUE',
                word: word,
                idx: props.idx,
                clue: s,
              };
              props.dispatch(sca);
            }}
          />
          <LengthView
            maxLength={MAX_STRING_LENGTH}
            value={props.clues[word]?.[props.idx] || ''}
            hideUntilWithin={30}
          />
        </td>
        <td className={styles.suggestCell}>
          <ButtonAsLink
            onClick={() => {
              setShowSuggestions(true);
            }}
            text="Suggest"
          />
          {showSuggestions ? (
            <SuggestOverlay
              word={word}
              close={() => {
                setShowSuggestions(false);
              }}
              select={(clue) => {
                const sca: SetClueAction = {
                  type: 'SETCLUE',
                  word: word,
                  idx: props.idx,
                  clue: clue.substring(0, MAX_STRING_LENGTH),
                };
                props.dispatch(sca);
                setShowSuggestions(false);
              }}
            />
          ) : (
            ''
          )}
        </td>
      </tr>
      <tr>
        <td></td>
        <td></td>
        <td className="paddingBottom1em">
          {clueText.startsWith('!#') ? (
            removeClueSpecials(clueText)
          ) : (
            <Markdown
              hast={markdownToHast({
                text: clueText,
                inline: true,
              })}
              noRefs={clueText.startsWith('!@')}
              inline={true}
            />
          )}
        </td>
        <td></td>
      </tr>
    </>
  );
};

function autoTag(state: BuilderState): string[] {
  const auto = [
    sizeTag(state.grid.width * state.grid.height - state.grid.hidden.size),
  ];
  if (state.contestAnswers?.length) {
    auto.push('meta');
  }
  return auto;
}

interface ClueModeProps {
  title: string | null;
  notes: string | null;
  blogPost: string | null;
  guestConstructor: string | null;
  exitClueMode: () => void;
  authorId: string;
  puzzleId: string;
  completedEntries: BuilderEntry[];
  clues: Record<string, string[]>;
  state: BuilderState;
  dispatch: Dispatch<PuzzleAction>;
  user: User;
}
export const ClueMode = ({ state, ...props }: ClueModeProps) => {
  const [settingCoverPic, setSettingCoverPic] = useState(false);
  const [contestAnswerInProg, setContestAnswerInProg] = useState('');
  const [addingAlternate, setAddingAlternate] = useState(false);
  const [editingTags, setEditingTags] = useState(false);
  const privateUntil = state.isPrivateUntil?.toDate();
  const autoTags = autoTag(state);

  const { showSnackbar } = useSnackbar();

  const cluedGrid = useMemo(() => {
    const clueProps = getClueProps(
      state.grid.sortedEntries,
      state.grid.entries,
      state.clues,
      false
    );
    const clueArray = dbCluesToClueTArray(
      clueProps.ac,
      clueProps.an,
      clueProps.dc,
      clueProps.dn
    );
    return addClues(state.grid, clueArray, (c: string) =>
      markdownToHast({ text: c })
    );
  }, [state.grid, state.clues]);

  const contestAnswerError =
    state.contestAnswers &&
    isMetaSolution(contestAnswerInProg, state.contestAnswers)
      ? 'Duplicate solution!'
      : '';

  const count: Record<string, number> = {};

  const clueRows = props.completedEntries
    .sort((e1, e2) =>
      e1.direction === e2.direction
        ? e1.labelNumber - e2.labelNumber
        : e1.direction - e2.direction
    )
    .map((e) => {
      const clueIdx = count[e.completedWord || ''] || 0;
      count[e.completedWord || ''] = clueIdx + 1;
      return (
        <ClueRow
          idx={clueIdx}
          key={(e.completedWord || '') + clueIdx}
          dispatch={props.dispatch}
          entry={e}
          clues={props.clues}
        />
      );
    });

  if (addingAlternate) {
    return (
      <>
        <AlternateSolutionEditor
          grid={state.grid.cells}
          save={(alt) => {
            const act: AddAlternateAction = {
              type: 'ADDALT',
              alternate: alt,
            };
            props.dispatch(act);
            return Promise.resolve();
          }}
          cancel={() => {
            setAddingAlternate(false);
          }}
          width={state.grid.width}
          height={state.grid.height}
          highlight={state.grid.highlight}
          highlighted={state.grid.highlighted}
          hidden={state.grid.hidden}
          vBars={state.grid.vBars}
          hBars={state.grid.hBars}
        />
      </>
    );
  }
  return (
    <>
      <GridContext.Provider value={cluedGrid}>
        <TopBar>
          <TopBarLink
            icon={<FaRegNewspaper />}
            text="Publish"
            onClick={() => {
              const a: PublishAction = {
                type: 'PUBLISH',
                publishTimestamp: Timestamp.now(),
              };
              props.dispatch(a);
            }}
          />
          <TopBarLink
            icon={<SpinnerFinished />}
            text="Back to Grid"
            onClick={props.exitClueMode}
          />
        </TopBar>
        {state.toPublish ? (
          <PublishOverlay
            id={state.id}
            toPublish={state.toPublish}
            warnings={state.publishWarnings}
            cancelPublish={() => {
              props.dispatch({ type: 'CANCELPUBLISH' });
            }}
          />
        ) : (
          ''
        )}
        {state.publishErrors.length ? (
          <Overlay
            closeCallback={() => {
              props.dispatch({ type: 'CLEARPUBLISHERRORS' });
            }}
          >
            <>
              <div>
                Please fix the following errors and try publishing again:
              </div>
              <ul>
                {state.publishErrors.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
              {state.publishWarnings.length ? (
                <>
                  <div>Warnings:</div>
                  <ul>
                    {state.publishWarnings.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </>
              ) : (
                ''
              )}
            </>
          </Overlay>
        ) : (
          ''
        )}

        <div className={styles.metadata}>
          {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
          <label className="width100">
            <h2>Title</h2>
            <LengthLimitedInput
              type="text"
              className="width100"
              placeholder="Give your puzzle a title"
              value={props.title || ''}
              maxLength={MAX_STRING_LENGTH}
              updateValue={(s: string) => {
                const sta: SetTitleAction = {
                  type: 'SETTITLE',
                  value: s,
                };
                props.dispatch(sta);
              }}
            />
            <div className="textAlignRight">
              <LengthView
                maxLength={MAX_STRING_LENGTH}
                value={props.title || ''}
                hideUntilWithin={30}
              />
            </div>
          </label>
          <h2 className="marginTop1em">Metadata</h2>
          <div>
            <ButtonAsLink
              onClick={() => {
                setSettingCoverPic(true);
              }}
              text="Add/edit cover pic"
            />
          </div>
          {settingCoverPic ? (
            <ImageCropper
              targetSize={COVER_PIC}
              isCircle={false}
              storageKey={`/users/${props.authorId}/${props.puzzleId}/cover.jpg`}
              cancelCrop={() => {
                setSettingCoverPic(false);
              }}
            />
          ) : (
            ''
          )}
          {props.notes !== null ? (
            <>
              <h3>Note:</h3>
              <LengthLimitedInput
                type="text"
                className="width100"
                placeholder="Add a note"
                value={props.notes}
                maxLength={MAX_STRING_LENGTH}
                updateValue={(s: string) => {
                  const sta: SetNotesAction = {
                    type: 'SETNOTES',
                    value: s,
                  };
                  props.dispatch(sta);
                }}
              />
              <div className="textAlignRight">
                <LengthView
                  maxLength={MAX_STRING_LENGTH}
                  value={props.notes}
                  hideUntilWithin={30}
                />
              </div>
              <p>
                <ButtonAsLink
                  text="Remove note"
                  onClick={() => {
                    const sna: SetNotesAction = {
                      type: 'SETNOTES',
                      value: null,
                    };
                    props.dispatch(sna);
                  }}
                />
              </p>
            </>
          ) : (
            <div>
              <ButtonAsLink
                text="Add a note"
                onClick={() => {
                  const sna: SetNotesAction = { type: 'SETNOTES', value: '' };
                  props.dispatch(sna);
                }}
              />
              <ToolTipText
                className="marginLeft0-5em"
                text={<FaInfoCircle />}
                tooltip="Notes are shown before a puzzle is started and should be used if you need a short explainer of the theme or how the puzzle works"
              />
            </div>
          )}
          {props.blogPost !== null ? (
            <>
              <h3>Blog Post:</h3>
              <p>
                Blog posts are shown before solvers are finished with your
                puzzle. If you include spoilers you can hide them{' '}
                <code>||like this||</code>.
              </p>
              <LengthLimitedTextarea
                className="width100 displayBlock"
                placeholder="Your post text (markdown format)"
                value={props.blogPost}
                maxLength={MAX_BLOG_LENGTH}
                updateValue={(s: string) => {
                  const sta: SetBlogPostAction = {
                    type: 'SETBLOGPOST',
                    value: s,
                  };
                  props.dispatch(sta);
                }}
              />
              <div className="textAlignRight">
                <LengthView
                  maxLength={MAX_BLOG_LENGTH}
                  value={props.blogPost || ''}
                  hideUntilWithin={30}
                />
              </div>
              <p>
                <MarkdownPreview markdown={props.blogPost} />
                <ButtonAsLink
                  text="Remove blog post"
                  onClick={() => {
                    const sna: SetBlogPostAction = {
                      type: 'SETBLOGPOST',
                      value: null,
                    };
                    props.dispatch(sna);
                  }}
                />
              </p>
            </>
          ) : (
            <div>
              <ButtonAsLink
                text="Add a blog post"
                onClick={() => {
                  const sna: SetBlogPostAction = {
                    type: 'SETBLOGPOST',
                    value: '',
                  };
                  props.dispatch(sna);
                }}
              />
              <ToolTipText
                className="marginLeft0-5em"
                text={<FaInfoCircle />}
                tooltip="Blog posts are shown before and after the puzzle is solved - describe how you came up with the puzzle, talk about your day, whatever you want!"
              />
            </div>
          )}
          <div className="marginTop1em">
            <label>
              <input
                className="marginRight1em"
                type="checkbox"
                checked={props.guestConstructor !== null}
                onChange={(e) => {
                  const spa: SetGuestConstructorAction = {
                    type: 'SETGC',
                    value: e.target.checked ? '' : null,
                  };
                  props.dispatch(spa);
                }}
              />{' '}
              This puzzle is by a guest constructor
            </label>
          </div>
          {props.guestConstructor !== null ? (
            <div className="marginLeft1-5em marginBottom1em">
              <LengthLimitedInput
                type="text"
                className="width100"
                placeholder="Guest constructor's name"
                value={props.guestConstructor}
                maxLength={MAX_STRING_LENGTH}
                updateValue={(s: string) => {
                  const sta: SetGuestConstructorAction = {
                    type: 'SETGC',
                    value: s,
                  };
                  props.dispatch(sta);
                }}
              />
              <div className="textAlignRight">
                <LengthView
                  maxLength={MAX_STRING_LENGTH}
                  value={props.guestConstructor}
                  hideUntilWithin={30}
                />
              </div>
            </div>
          ) : (
            ''
          )}
          <div>
            <label>
              <input
                className="marginRight1em"
                type="checkbox"
                checked={state.isContestPuzzle}
                onChange={(e) => {
                  const spa: UpdateContestAction = {
                    type: 'CONTEST',
                    enabled: e.target.checked,
                  };
                  props.dispatch(spa);
                }}
              />{' '}
              This is a meta/contest puzzle{' '}
              <ToolTipText
                className="marginLeft0-5em"
                text={<FaInfoCircle />}
                tooltip="A meta puzzle has an extra puzzle embedded in the grid for after solvers have finished solving. Solvers can submit their solution, find out if they were right or wrong, and view a leaderboard of those who've solved the contest correctly."
              />
            </label>
          </div>
          {state.isContestPuzzle ? (
            <div className="marginLeft1-5em marginBottom1em">
              <h4>Contest prompt (required):</h4>
              <p>
                Use the notes field above to give solvers a prompt for the
                contest.
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const spa: UpdateContestAction = {
                    type: 'CONTEST',
                    addAnswer: contestAnswerInProg,
                  };
                  props.dispatch(spa);
                  setContestAnswerInProg('');
                }}
              >
                <h4>
                  Contest solution(s) - must specify at least one valid
                  solution:
                </h4>
                <p>
                  Submissions will match regardless of case, whitespace, and
                  punctuation.
                </p>
                {state.contestAnswers?.length ? (
                  <ul>
                    {state.contestAnswers.map((a) => (
                      <li key={a}>
                        {a} (
                        <ButtonAsLink
                          onClick={() => {
                            const spa: UpdateContestAction = {
                              type: 'CONTEST',
                              removeAnswer: a,
                            };
                            props.dispatch(spa);
                          }}
                          text="remove"
                        />
                        )
                      </li>
                    ))}
                  </ul>
                ) : (
                  ''
                )}
                <LengthLimitedInput
                  type="text"
                  placeholder="Solution"
                  value={contestAnswerInProg}
                  updateValue={setContestAnswerInProg}
                  maxLength={MAX_META_SUBMISSION_LENGTH}
                />
                <LengthView
                  maxLength={MAX_META_SUBMISSION_LENGTH}
                  value={contestAnswerInProg}
                  hideUntilWithin={30}
                />
                {contestAnswerError ? (
                  <span className={styles.contestError}>
                    {contestAnswerError}
                  </span>
                ) : (
                  ''
                )}
                <Button
                  type="submit"
                  className="marginLeft0-5em"
                  disabled={
                    contestAnswerError !== '' ||
                    contestAnswerInProg.trim().length === 0
                  }
                  text="Add Solution"
                />
              </form>
              <h4 className="marginTop1em">Contest explanation</h4>
              <p>
                After publishing, you can use a comment to explain how the
                meta/contest works - comments are only visible to solvers who
                have submitted or revealed the correct solution.
              </p>
              <h4 className="marginTop1em">Delay before allowing reveal</h4>
              <p>
                Solvers get unlimited submission attempts and can optionally
                reveal the answer if they aren&apos;t able to figure it out. You
                can set a delay so that the reveal function will not be
                available until 1 week after the publish date.
              </p>
              <div>
                <label>
                  <input
                    className="marginRight1em"
                    type="checkbox"
                    checked={
                      state.contestRevealDelay
                        ? state.contestRevealDelay > 0
                        : false
                    }
                    onChange={(e) => {
                      const spa: UpdateContestAction = {
                        type: 'CONTEST',
                        revealDelay: e.target.checked
                          ? 1000 * 60 * 60 * 24 * 7
                          : null,
                      };
                      props.dispatch(spa);
                    }}
                  />{' '}
                  Delay one week from publish date before allowing reveals
                </label>
              </div>

              <h4 className="marginTop1em">Contest prize</h4>
              <p>
                If the contest has a prize solvers can choose to include their
                email address in their submission to be eligible to win.
              </p>
              <div>
                <label>
                  <input
                    className="marginRight1em"
                    type="checkbox"
                    checked={state.contestHasPrize}
                    onChange={(e) => {
                      const spa: UpdateContestAction = {
                        type: 'CONTEST',
                        hasPrize: e.target.checked,
                      };
                      props.dispatch(spa);
                    }}
                  />{' '}
                  This contest has a prize
                </label>
              </div>
            </div>
          ) : (
            ''
          )}
          <div>
            <label>
              <input
                className="marginRight1em"
                type="checkbox"
                checked={state.isPrivate}
                onChange={(e) => {
                  const spa: SetPrivateAction = {
                    type: 'SETPRIVATE',
                    value: e.target.checked,
                  };
                  props.dispatch(spa);
                }}
              />{' '}
              This puzzle is private
              <ToolTipText
                className="marginLeft0-5em"
                text={<FaInfoCircle />}
                tooltip="Private puzzles are still visible to anybody you share the link with. They do not appear on your constructor blog, they aren't eligible to be featured on the Crosshare homepage, and your followers won't be notified when they are published."
              />
            </label>
          </div>
          <div>
            <label>
              <input
                className="marginRight1em"
                type="checkbox"
                checked={state.isPrivateUntil !== null}
                onChange={(e) => {
                  const spa: SetPrivateAction = {
                    type: 'SETPRIVATE',
                    value: e.target.checked && Timestamp.now(),
                  };
                  props.dispatch(spa);
                }}
              />{' '}
              This puzzle should be private until a specified date/time
              <ToolTipText
                className="marginLeft0-5em"
                text={<FaInfoCircle />}
                tooltip="The puzzle won't appear on your constructor blog and your followers won't be notified until after the specified time."
              />
            </label>
            {privateUntil ? (
              <p className="marginLeft1-5em">
                Visible after {lightFormat(privateUntil, "M/d/y' at 'h:mma")} (
                {
                  privateUntil
                    .toLocaleTimeString('en-us', { timeZoneName: 'short' })
                    .split(' ')[2]
                }
                ):
                <DateTimePicker
                  picked={privateUntil}
                  setPicked={(d) => {
                    const spa: SetPrivateAction = {
                      type: 'SETPRIVATE',
                      value: Timestamp.fromDate(d),
                    };
                    props.dispatch(spa);
                  }}
                />
              </p>
            ) : (
              ''
            )}
          </div>
          <h3>Tags</h3>
          <p>
            Tags are shown any time a puzzle is displayed on the site, and help
            solvers quickly find puzzles with a particular attribute or theme.
          </p>
          {editingTags ? (
            <div className="marginBottom1-5em">
              <TagEditor
                userTags={state.userTags}
                autoTags={autoTags}
                cancel={() => {
                  setEditingTags(false);
                }}
                save={(newTags) => {
                  const st: SetTagsAction = {
                    type: 'SETTAGS',
                    tags: newTags,
                  };
                  props.dispatch(st);
                  setEditingTags(false);
                  return Promise.resolve();
                }}
              />
            </div>
          ) : (
            <>
              <h4>Current tags:</h4>
              <TagList tags={state.userTags.concat(autoTags)} />
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

          <h2 className="marginTop1em">Clues (use markdown for formatting):</h2>
          {props.completedEntries.length ? (
            <table className="width100">
              <tbody>{clueRows}</tbody>
            </table>
          ) : (
            <>
              <p>
                This where you come to set clues for your puzzle, but you
                don&apos;t have any completed fill words yet!
              </p>
              <p>
                Go back to{' '}
                <ButtonAsLink
                  text="the grid"
                  onClick={(e) => {
                    props.exitClueMode();
                    e.preventDefault();
                  }}
                />{' '}
                and fill in one or more words completely. Then come back here
                and make some clues.
              </p>
            </>
          )}
          <h2 className="marginTop1em">Advanced</h2>
          <div>
            <h3>Alternate Solutions</h3>
            {state.alternates.length ? (
              <>
                <ul>
                  {state.alternates.map((a, i) => (
                    <li key={i}>
                      {Object.entries(a).map(([pos, str]) => (
                        <span className={styles.alternate} key={pos}>
                          Cell {pos}: &quot;{str}&quot;
                        </span>
                      ))}{' '}
                      (
                      <ButtonAsLink
                        onClick={() => {
                          const delAlt: DelAlternateAction = {
                            type: 'DELALT',
                            alternate: a,
                          };
                          props.dispatch(delAlt);
                        }}
                        text="remove"
                      />
                      )
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              ''
            )}
            <ButtonAsLink
              disabled={!state.gridIsComplete}
              text="Add an alternate solution"
              onClick={() => {
                setAddingAlternate(true);
              }}
            />
            <ToolTipText
              className="marginLeft0-5em"
              text={<FaInfoCircle />}
              tooltip={
                <>
                  <p>
                    Alternate solutions can be used if one or more entries in
                    your puzzle have multiple valid solutions (e.g. a
                    Schrödinger&apos;s puzzle or a puzzle with bi-directional
                    rebuses).
                  </p>
                  <p>
                    Alternates can only be added once the grid is completely
                    filled. Once an alternate has been added the grid cannot be
                    further edited unless all alternates are deleted.
                  </p>
                </>
              }
            />
          </div>
          <div>
            <h3>Enumerations</h3>
            <div>
              <ButtonAsLink
                text="Add Enumerations"
                onClick={() => {
                  props.dispatch({
                    type: 'ADDENUMERATIONS',
                  } as AddEnumerationsAction);
                  showSnackbar(
                    <>
                      Enumerations added!&nbsp;&nbsp;
                      <ButtonAsLink
                        text="Undo"
                        onClick={() => {
                          props.dispatch({
                            type: 'RESTORECLUES',
                          } as RestoreCluesAction);
                        }}
                      />
                    </>,
                    8000
                  );
                }}
              />
              <ToolTipText
                className="marginLeft0-5em"
                text={<FaInfoCircle />}
                tooltip={
                  <>
                    <p>
                      An enumeration is a section of a clue that indicates how
                      long each word of the answer is. Enumerations usually
                      appear in parentheses at the end of the clue, and
                      sometimes include information about punctuation,
                      abbreviation, and more.
                    </p>
                    <p>
                      When enumerations are added automatically, they will
                      assume each answer is one single word. Don&apos;t forget
                      to update them if necessary before publishing!
                    </p>
                  </>
                }
              />
            </div>
          </div>
          <div className="marginTop1em">
            <h3>Comments</h3>
            <label>
              <input
                className="marginRight1em"
                type="checkbox"
                checked={state.commentsDisabled}
                onChange={(e) => {
                  const scd: SetCommentsDisabledAction = {
                    type: 'SETCD',
                    value: e.target.checked,
                  };
                  props.dispatch(scd);
                }}
              />{' '}
              Disable comments for this puzzle (not recommended)
            </label>
          </div>
        </div>
      </GridContext.Provider>
    </>
  );
};
