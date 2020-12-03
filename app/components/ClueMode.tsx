import { Dispatch, useEffect, useState, useMemo } from 'react';

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
} from '../reducers/reducer';
import { TopBarLink, TopBar } from './TopBar';
import { Direction } from '../lib/types';
import { ButtonAsLink } from './Buttons';
import { Overlay } from './Overlay';
import { Markdown } from './Markdown';
import { COVER_PIC } from '../lib/style';
import { TimestampClass } from '../lib/firebaseWrapper';
import { ToolTipText } from './ToolTipText';
import { FaInfoCircle, FaCheck } from 'react-icons/fa';
import lightFormat from 'date-fns/lightFormat';
import set from 'date-fns/set';
import { Table } from 'react-fluid-table';
import orderBy from 'lodash/orderBy';

import dynamic from 'next/dynamic';
import type { ImageCropper as ImageCropperType } from './ImageCropper';
import { ClueListT, parseClueList } from '../lib/ginsbergCommon';

const ImageCropper = dynamic(
  () => import('./ImageCropper').then((mod) => mod.ImageCropper as any), // eslint-disable-line @typescript-eslint/no-explicit-any
  { ssr: false }
) as typeof ImageCropperType;

export function sanitizeClue(input: string) {
  return input.substring(0, 140);
}
export function sanitizeTitle(input: string) {
  return input.substring(0, 140);
}
export function sanitizeConstructorNotes(input: string) {
  return input.substring(0, 200);
}
export function sanitizeBlogPost(input: string) {
  return input.substring(0, 20000);
}

const ClueRow = (props: {
  dispatch: Dispatch<PuzzleAction>;
  entry: BuilderEntry;
  clues: Record<string, string>;
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
          value={props.clues[word] || ''}
          onChange={(e) => {
            const sca: SetClueAction = {
              type: 'SETCLUE',
              word: word,
              clue: sanitizeClue(e.target.value),
            };
            props.dispatch(sca);
          }}
        />
      </td>
      <td>
        <ButtonAsLink onClick={() => setShowSuggestions(true)} text="Suggest" />
        {showSuggestions ? (
          <SuggestOverlay
            word={word}
            close={() => setShowSuggestions(false)}
            select={(clue) => {
              const sca: SetClueAction = {
                type: 'SETCLUE',
                word: word,
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const NYTIcon = ({ row }: { row: any }) => {
  if (row?.n) {
    return <FaCheck />;
  }
  return <></>;
};

const Weekday = ['Mon', 'Tue', 'Wed', 'Thur', 'Fri', 'Sat'];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Difficulty = ({ row }: { row: any }) => {
  return <>{Weekday[Math.round(row.d)] || '-'}</>;
};

interface SuggestOverlayProps {
  word: string;
  close: () => void;
  select: (clue: string) => void;
}
export const SuggestOverlay = (props: SuggestOverlayProps) => {
  const [clueList, setClueList] = useState<ClueListT | null>(null);
  const [error, setError] = useState(false);
  const [onlyNYT, setOnlyNYT] = useState(false);
  const loading = clueList === null && error === false;

  const onSort = (col: string | null, dir: string | null) => {
    if (!clueList || !col || !dir) {
      return;
    }
    setClueList(
      orderBy(clueList, [col], [dir.toLowerCase() === 'asc' ? 'asc' : 'desc'])
    );
  };

  const displayList = useMemo(
    () => (onlyNYT && clueList ? clueList.filter((c) => c.n) : clueList),
    [clueList, onlyNYT]
  );

  useEffect(() => {
    let didCancel = false;
    async function getClues() {
      const res = await (await fetch(`/api/clues/${props.word}`))
        .json()
        .catch((e) => {
          console.log(e);
          setError(true);
        });
      if (!didCancel && res) {
        const clues = orderBy(
          parseClueList(res).map((c) => {
            return { ...c, d: c.d / c.f - 1 };
          }),
          ['f'],
          ['desc']
        );
        const nytOnly = clues.filter((c) => c.n);
        if (nytOnly.length > 5) {
          setOnlyNYT(true);
        }
        setClueList(clues);
      }
    }
    getClues();
    return () => {
      didCancel = true;
    };
  }, [props.word]);
  const columns = [
    { key: 'c', header: 'Clue', sortable: false },
    { key: 'y', header: 'Last Seen', sortable: true },
    { key: 'f', header: 'Uses', sortable: true },
    { key: 'd', header: 'Difficulty', sortable: true, content: Difficulty },
    { key: 'n', header: 'NYT?', sortable: false, content: NYTIcon },
  ];
  return (
    <Overlay closeCallback={props.close}>
      {error ? 'Something went wrong, please try again' : ''}
      {loading ? 'Loading clues...' : ''}
      {displayList !== null && clueList !== null ? (
        <>
          <h2>Found {clueList.length} Clue Suggestions</h2>
          <div>
            <label>
              <input
                css={{ marginRight: '1em' }}
                type="checkbox"
                checked={onlyNYT}
                onChange={(e) => setOnlyNYT(e.target.checked)}
              />
              Only show clues that have appeared in the NYT
            </label>
          </div>
          <Table
            data={displayList}
            columns={columns}
            tableHeight={400}
            onSort={onSort}
            sortColumn={'f'}
            sortDirection={'DESC'}
            onRowClick={(_e, data) => {
              const clicked = displayList[data.index];
              if (clicked) {
                props.select(clicked.c);
              }
            }}
            css={{
              '& .row-container': {
                cursor: 'pointer',
              },
              '& .row-container:hover': {
                backgroundColor: '#EEE',
              },
            }}
          />
        </>
      ) : (
        ''
      )}
    </Overlay>
  );
};

interface ClueModeProps {
  title: string | null;
  notes: string | null;
  blogPost: string | null;
  exitClueMode: () => void;
  authorId: string;
  puzzleId: string;
  completedEntries: Array<BuilderEntry>;
  clues: Record<string, string>;
  state: BuilderState;
  dispatch: Dispatch<PuzzleAction>;
}
export const ClueMode = (props: ClueModeProps) => {
  const [showPostPreview, setShowPostPreview] = useState(false);
  const [settingCoverPic, setSettingCoverPic] = useState(false);
  const privateUntil = props.state.isPrivateUntil?.toDate();

  const clueRows = props.completedEntries
    .sort((e1, e2) =>
      e1.direction === e2.direction
        ? e1.labelNumber - e2.labelNumber
        : e1.direction - e2.direction
    )
    .map((e) => (
      <ClueRow
        key={e.completedWord || ''}
        dispatch={props.dispatch}
        entry={e}
        clues={props.clues}
      />
    ));
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
            css={{ width: '100%', marginBottom: '1.5em' }}
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
        <h2>Metadata</h2>
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
            <p>
              Visible after {lightFormat(privateUntil, 'M/d/y\' at \'h:mma')}:
              <input
                css={{
                  marginLeft: '0.5em',
                  '&:invalid': {
                    borderColor: 'var(--error)',
                  },
                }}
                type="date"
                defaultValue={lightFormat(privateUntil, 'yyyy-MM-dd')}
                required
                pattern="\d{4}-\d{1,2}-\d{1,2}"
                onBlur={(e) => {
                  if (!e.target.checkValidity()) {
                    return;
                  }
                  const split = e.target.value.split('-');
                  if (
                    split[0] === undefined ||
                    split[1] === undefined ||
                    split[2] === undefined
                  ) {
                    throw new Error('bad date ' + e.target.value);
                  }
                  const newDate = set(privateUntil, {
                    year: parseInt(split[0]),
                    month: parseInt(split[1]) - 1,
                    date: parseInt(split[2]),
                  });
                  const spa: SetPrivateAction = {
                    type: 'SETPRIVATE',
                    value: TimestampClass.fromDate(newDate),
                  };
                  props.dispatch(spa);
                }}
              />
              <input
                css={{ marginLeft: '0.5em' }}
                type="time"
                defaultValue={lightFormat(privateUntil, 'HH:mm')}
                required
                pattern="[0-9]{1,2}:[0-9]{2}"
                onBlur={(e) => {
                  if (!e.target.checkValidity()) {
                    return;
                  }
                  const split = e.target.value.split(':');
                  if (split[0] === undefined || split[1] === undefined) {
                    throw new Error('bad time ' + e.target.value);
                  }
                  const newDate = set(privateUntil, {
                    hours: parseInt(split[0]),
                    minutes: parseInt(split[1]),
                  });
                  const spa: SetPrivateAction = {
                    type: 'SETPRIVATE',
                    value: TimestampClass.fromDate(newDate),
                  };
                  props.dispatch(spa);
                }}
              />
            </p>
          ) : (
            ''
          )}
        </div>
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
              css={{ width: '100%', marginBottom: '1.5em' }}
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
              css={{ width: '100%', display: 'block', marginBottom: '1em' }}
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
              {props.blogPost ? (
                <ButtonAsLink
                  css={{ marginRight: '1em' }}
                  text="Preview"
                  onClick={() => setShowPostPreview(true)}
                />
              ) : (
                ''
              )}
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
        <h2>Clues</h2>
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
      {showPostPreview && props.blogPost ? (
        <Overlay closeCallback={() => setShowPostPreview(false)}>
          <Markdown text={props.blogPost} />
        </Overlay>
      ) : (
        ''
      )}
    </>
  );
};
