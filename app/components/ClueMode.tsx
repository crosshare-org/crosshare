import { Dispatch, useState } from 'react';

import { SpinnerFinished } from './Icons';
import {
  BuilderEntry,
  SetClueAction,
  SetTitleAction,
  SetNotesAction,
  PuzzleAction,
  SetBlogPostAction,
  BuilderState,
  SetPrivateAction,
  SetGuestConstructorAction,
  UpdateContestAction,
} from '../reducers/reducer';
import { TopBarLink, TopBar } from './TopBar';
import { Direction } from '../lib/types';
import { ButtonAsLink, Button } from './Buttons';
import { COVER_PIC } from '../lib/style';
import { TimestampClass } from '../lib/firebaseWrapper';
import { ToolTipText } from './ToolTipText';
import { FaInfoCircle } from 'react-icons/fa';
import lightFormat from 'date-fns/lightFormat';

import dynamic from 'next/dynamic';
import type { ImageCropper as ImageCropperType } from './ImageCropper';
import type { SuggestOverlay as SuggestOverlayType } from './ClueSuggestionOverlay';
import { DateTimePicker } from './DateTimePicker';
import { MarkdownPreview } from './MarkdownPreview';

const ImageCropper = dynamic(
  () => import('./ImageCropper').then((mod) => mod.ImageCropper as any), // eslint-disable-line @typescript-eslint/no-explicit-any
  { ssr: false }
) as typeof ImageCropperType;

const SuggestOverlay = dynamic(
  () =>
    import('./ClueSuggestionOverlay').then((mod) => mod.SuggestOverlay as any), // eslint-disable-line @typescript-eslint/no-explicit-any
  { ssr: false }
) as typeof SuggestOverlayType;

export function sanitizeClue(input: string) {
  return input.substring(0, 140);
}
export function sanitizeTitle(input: string) {
  return input.substring(0, 140);
}
export function sanitizeGuestConstructor(input: string) {
  return input.substring(0, 140);
}
export function sanitizeConstructorNotes(input: string) {
  return input.substring(0, 200);
}
export function sanitizeBlogPost(input: string) {
  return input.substring(0, 20000);
}

const ClueRow = (props: {
  idx: number;
  dispatch: Dispatch<PuzzleAction>;
  entry: BuilderEntry;
  clues: Record<string, Array<string>>;
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const word = props.entry.completedWord;
  if (word === null) {
    throw new Error('shouldn\'t ever get here');
  }
  return (
    <tr>
      <td
        css={{
          paddingRight: '1em',
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
          paddingRight: '1em',
          paddingBottom: '1em',
          textAlign: 'right',
          width: '1px',
        }}
      >
        <label
          css={{ marginBottom: 0 }}
          htmlFor={props.entry.completedWord + '-input'}
        >
          {props.entry.completedWord}
        </label>
      </td>
      <td css={{ paddingBottom: '1em' }}>
        <input
          id={props.entry.completedWord + '-input'}
          type="text"
          css={{ width: '100%' }}
          placeholder="Enter a clue"
          value={props.clues[word]?.[props.idx] || ''}
          onChange={(e) => {
            const sca: SetClueAction = {
              type: 'SETCLUE',
              word: word,
              idx: props.idx,
              clue: sanitizeClue(e.target.value),
            };
            props.dispatch(sca);
          }}
        />
      </td>
      <td css={{ width: '1px', paddingLeft: '1em', paddingBottom: '1em' }}>
        <ButtonAsLink onClick={() => setShowSuggestions(true)} text="Suggest" />
        {showSuggestions ? (
          <SuggestOverlay
            word={word}
            close={() => setShowSuggestions(false)}
            select={(clue) => {
              const sca: SetClueAction = {
                type: 'SETCLUE',
                word: word,
                idx: props.idx,
                clue: sanitizeClue(clue),
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
  );
};

interface ClueModeProps {
  title: string | null;
  notes: string | null;
  blogPost: string | null;
  guestConstructor: string | null;
  exitClueMode: () => void;
  authorId: string;
  puzzleId: string;
  completedEntries: Array<BuilderEntry>;
  clues: Record<string, Array<string>>;
  state: BuilderState;
  dispatch: Dispatch<PuzzleAction>;
  isAdmin: boolean;
}
export const ClueMode = (props: ClueModeProps) => {
  const [settingCoverPic, setSettingCoverPic] = useState(false);
  const [contestAnswerInProg, setContestAnswerInProg] = useState('');
  const privateUntil = props.state.isPrivateUntil?.toDate();

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
          key={e.completedWord || ''}
          dispatch={props.dispatch}
          entry={e}
          clues={props.clues}
        />
      );
    });
  return (
    <>
      <TopBar>
        <TopBarLink
          icon={<SpinnerFinished />}
          text="Back to Grid"
          onClick={props.exitClueMode}
        />
      </TopBar>
      <div css={{ padding: '1em' }}>
        <label css={{ width: '100%' }}>
          <h2>Title</h2>
          <input
            type="text"
            css={{ width: '100%' }}
            placeholder="Give your puzzle a title"
            value={props.title || ''}
            onChange={(e) => {
              const sta: SetTitleAction = {
                type: 'SETTITLE',
                value: sanitizeTitle(e.target.value),
              };
              props.dispatch(sta);
            }}
          />
        </label>
        <h2 css={{ marginTop: '1em' }}>Metadata</h2>
        <div>
          <ButtonAsLink
            onClick={() => setSettingCoverPic(true)}
            text="Add/edit cover pic"
          />
        </div>
        {settingCoverPic ? (
          <ImageCropper
            targetSize={COVER_PIC}
            isCircle={false}
            storageKey={`/users/${props.authorId}/${props.puzzleId}/cover.jpg`}
            cancelCrop={() => setSettingCoverPic(false)}
          />
        ) : (
          ''
        )}
        {props.notes !== null ? (
          <>
            <h3>Note:</h3>
            <input
              type="text"
              css={{ width: '100%' }}
              placeholder="Add a note"
              value={props.notes}
              onChange={(e) => {
                const sta: SetNotesAction = {
                  type: 'SETNOTES',
                  value: sanitizeConstructorNotes(e.target.value),
                };
                props.dispatch(sta);
              }}
            />
            <p>
              <ButtonAsLink
                text="Remove note"
                onClick={() => {
                  const sna: SetNotesAction = { type: 'SETNOTES', value: null };
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
              css={{ marginLeft: '0.5em' }}
              text={<FaInfoCircle />}
              tooltip="Notes are shown before a puzzle is started and should be used if you need a short explainer of the theme or how the puzzle works"
            />
          </div>
        )}
        {props.blogPost !== null ? (
          <>
            <h3>Blog Post:</h3>
            <p>
              Blog posts are shown before solvers are finished with your puzzle.
              If you include spoilers you can hide them{' '}
              <code>||like this||</code>.
            </p>
            <textarea
              css={{ width: '100%', display: 'block' }}
              placeholder="Your post text (markdown format)"
              value={props.blogPost}
              onChange={(e) => {
                const sta: SetBlogPostAction = {
                  type: 'SETBLOGPOST',
                  value: sanitizeBlogPost(e.target.value),
                };
                props.dispatch(sta);
              }}
            />
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
              css={{ marginLeft: '0.5em' }}
              text={<FaInfoCircle />}
              tooltip="Blog posts are shown before and after the puzzle is solved - describe how you came up with the puzzle, talk about your day, whatever you want!"
            />
          </div>
        )}
        <div css={{ marginTop: '1em' }}>
          <label>
            <input
              css={{ marginRight: '1em' }}
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
          <p css={{ marginLeft: '1.5em' }}>
            <input
              type="text"
              css={{ width: '100%' }}
              placeholder="Guest constructor's name"
              value={props.guestConstructor}
              onChange={(e) => {
                const sta: SetGuestConstructorAction = {
                  type: 'SETGC',
                  value: sanitizeGuestConstructor(e.target.value),
                };
                props.dispatch(sta);
              }}
            />
          </p>
        ) : (
          ''
        )}
        {props.isAdmin ? (
          <>
            <div>
              <label>
                <input
                  css={{ marginRight: '1em' }}
                  type="checkbox"
                  checked={props.state.isContestPuzzle}
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
                  css={{ marginLeft: '0.5em' }}
                  text={<FaInfoCircle />}
                  tooltip="A meta puzzle has an extra puzzle embedded in the grid for after solvers have finished solving. Solvers can submit their solution, find out if they were right or wrong, and view a leaderboard of those who've solved the contest correctly."
                />
              </label>
            </div>
            {props.state.isContestPuzzle ? (
              <p css={{ marginLeft: '1.5em' }}>
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
                  {props.state.contestAnswers?.length ? (
                    <ul>
                      {props.state.contestAnswers.map((a) => (
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
                  <input
                    type="text"
                    placeholder="Solution (case insensitive)"
                    value={contestAnswerInProg}
                    onChange={(e) => {
                      setContestAnswerInProg(e.target.value);
                    }}
                  />
                  <Button
                    type="submit"
                    css={{ marginLeft: '0.5em' }}
                    disabled={contestAnswerInProg.trim().length === 0}
                    text="Add Solution"
                  />
                </form>
                <h4 css={{ marginTop: '1em' }}>
                  Contest explanation (optional):
                </h4>
                <p>
                  If specified, the explainer for the contest solution is shown
                  after a user submits their contest answer.
                </p>
                <textarea
                  css={{ width: '100%', display: 'block' }}
                  placeholder="Your explainer text (markdown format)"
                  value={props.state.contestExplanation || ''}
                  onChange={(e) => {
                    const sta: UpdateContestAction = {
                      type: 'CONTEST',
                      explanation: sanitizeBlogPost(e.target.value),
                    };
                    props.dispatch(sta);
                  }}
                />
                <MarkdownPreview markdown={props.state.contestExplanation} />
                <h4 css={{ marginTop: '1em' }}>Contest prize</h4>
                <p>
                  If the contest has a prize solvers can choose to include their
                  email address in their submission to be eligible to win.
                </p>
                <div>
                  <label>
                    <input
                      css={{ marginRight: '1em' }}
                      type="checkbox"
                      checked={props.state.contestHasPrize}
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
              </p>
            ) : (
              ''
            )}
          </>
        ) : (
          ''
        )}
        <div>
          <label>
            <input
              css={{ marginRight: '1em' }}
              type="checkbox"
              checked={props.state.isPrivate}
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
              css={{ marginLeft: '0.5em' }}
              text={<FaInfoCircle />}
              tooltip="Private puzzles are still visible to anybody you share the link with. They do not appear on your constructor blog, they aren't eligible to be featured on the Crosshare homepage, and your followers won't be notified when they are published."
            />
          </label>
        </div>
        <div>
          <label>
            <input
              css={{ marginRight: '1em' }}
              type="checkbox"
              checked={props.state.isPrivateUntil !== null}
              onChange={(e) => {
                const spa: SetPrivateAction = {
                  type: 'SETPRIVATE',
                  value: e.target.checked && TimestampClass.now(),
                };
                props.dispatch(spa);
              }}
            />{' '}
            This puzzle should be private until a specified date/time
            <ToolTipText
              css={{ marginLeft: '0.5em' }}
              text={<FaInfoCircle />}
              tooltip="The puzzle won't appear on your constructor blog and your followers won't be notified until after the specified time."
            />
          </label>
          {privateUntil ? (
            <p css={{ marginLeft: '1.5em' }}>
              Visible after {lightFormat(privateUntil, 'M/d/y\' at \'h:mma')}:
              <DateTimePicker
                picked={privateUntil}
                setPicked={(d) => {
                  const spa: SetPrivateAction = {
                    type: 'SETPRIVATE',
                    value: TimestampClass.fromDate(d),
                  };
                  props.dispatch(spa);
                }}
              />
            </p>
          ) : (
            ''
          )}
        </div>
        <h2 css={{ marginTop: '1em' }}>Clues</h2>
        {props.completedEntries.length ? (
          <table css={{ width: '100%' }}>
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
              and fill in one or more words completely. Then come back here and
              make some clues.
            </p>
          </>
        )}
      </div>
    </>
  );
};
