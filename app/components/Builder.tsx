import {
  useState,
  useReducer,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  Dispatch,
  MouseEvent,
  FormEvent,
  MutableRefObject,
} from 'react';
import { STORAGE_KEY } from '../lib/utils';
import { ContactLinks } from './ContactLinks';
import { isRight } from 'fp-ts/lib/Either';
import { isSome } from 'fp-ts/lib/Option';
import { PathReporter } from 'io-ts/lib/PathReporter';
import {
  FaRegNewspaper,
  FaHammer,
  FaFileImport,
  FaUser,
  FaListOl,
  FaRegCircle,
  FaRegCheckCircle,
  FaSquare,
  FaEllipsisH,
  FaVolumeUp,
  FaVolumeMute,
  FaFillDrip,
  FaUserLock,
  FaRegPlusSquare,
  FaSignInAlt,
  FaKeyboard,
  FaRegFile,
} from 'react-icons/fa';
import { MdRefresh } from 'react-icons/md';
import { IoMdStats } from 'react-icons/io';
import useEventListener from '@use-it/event-listener';
import { FixedSizeList as List } from 'react-window';
import type firebase from 'firebase/app';

import {
  addAutofillFieldsToEntry,
  numMatchesForEntry,
} from '../lib/autofillGrid';
import { ViewableEntry } from '../lib/viewableGrid';
import {
  Rebus,
  SpinnerWorking,
  SpinnerFinished,
  SpinnerFailed,
  SpinnerDisabled,
  SymmetryIcon,
  SymmetryRotational,
  SymmetryVertical,
  SymmetryHorizontal,
  SymmetryNone,
  PrefillIcon,
  EscapeKey,
  BacktickKey,
  PeriodKey,
  PuzzleSizeIcon,
  EnterKey,
  ExclamationKey,
} from './Icons';
import { AuthProps } from './AuthContext';
import { Histogram } from './Histogram';
import { PublishOverlay } from './PublishOverlay';
import { TimestampClass } from '../lib/firebaseWrapper';
import { GridView } from './Grid';
import { getCrosses, valAt, entryAndCrossAtPosition } from '../lib/gridBase';
import {
  Position,
  Direction,
  PuzzleT,
  isAutofillCompleteMessage,
  isAutofillResultMessage,
  WorkerMessage,
  LoadDBMessage,
  AutofillMessage,
  CancelAutofillMessage,
  PuzzleInProgressV,
  PuzzleInProgressT,
  fromKeyString,
  KeyK,
  fromKeyboardEvent,
} from '../lib/types';
import {
  Symmetry,
  BuilderState,
  builderReducer,
  KeypressAction,
  SymmetryAction,
  ClickedFillAction,
  PuzzleAction,
  SetHighlightAction,
  PublishAction,
  NewPuzzleAction,
  initialBuilderState,
  BuilderGrid,
  ClickedEntryAction,
  PrefillSquares,
  ImportPuzAction,
  getClueProps,
  SetShowDownloadLink,
  PasteAction,
} from '../reducers/reducer';
import {
  NestedDropDown,
  TopBarLink,
  TopBar,
  TopBarDropDownLink,
  TopBarDropDownLinkA,
  TopBarDropDown,
} from './TopBar';
import { SquareAndCols } from './Page';
import { ClueMode } from './ClueMode';

import * as BA from '../lib/bitArray';
import * as WordDB from '../lib/WordDB';
import { Overlay } from './Overlay';
import { usePersistedBoolean, usePolyfilledResizeObserver } from '../lib/hooks';

import { Keyboard } from './Keyboard';
import { SMALL_AND_UP } from '../lib/style';
import { ButtonReset } from './Buttons';
import { useSnackbar } from './Snackbar';
import { importFile, exportFile, ExportProps } from '../lib/converter';
import { getAutofillWorker } from '../lib/workerLoader';

let worker: Worker;

type WithOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
type BuilderProps = WithOptional<
  Omit<
    PuzzleT,
    | 'comments'
    | 'category'
    | 'authorId'
    | 'authorName'
    | 'moderated'
    | 'publishTime'
    | 'rating'
  >,
  | 'clues'
  | 'title'
  | 'constructorNotes'
  | 'blogPost'
  | 'contestAnswers'
  | 'contestSubmissions'
  | 'contestHasPrize'
  | 'contestRevealDelay'
  | 'alternateSolutions'
  | 'guestConstructor'
  | 'isPrivate'
  | 'isPrivateUntil'
  | 'highlighted'
  | 'vBars'
  | 'hBars'
  | 'highlight'
>;

interface PotentialFillItemProps {
  entryIndex: number;
  value: [string, number];
  dispatch: Dispatch<ClickedFillAction>;
  gridRef: MutableRefObject<HTMLDivElement | null>;
}
const PotentialFillItem = (props: PotentialFillItemProps) => {
  function click(e: MouseEvent) {
    e.preventDefault();
    props.dispatch({
      type: 'CLICKEDFILL',
      entryIndex: props.entryIndex,
      value: props.value[0],
    });
    if (props.gridRef.current) {
      props.gridRef.current.focus();
    }
  }
  return (
    <ButtonReset
      css={{
        width: '100%',
        padding: '0.5em 1em',
        color: 'var(--text)',
        '&:hover': {
          backgroundColor: 'var(--bg-hover)',
        },
        alignItems: 'center',
        height: 35,
      }}
      onClick={click}
      text={props.value[0]}
    />
  );
};

interface PotentialFillListProps {
  header: string;
  entryIndex: number;
  selected: boolean;
  values: Array<[string, number]>;
  dispatch: Dispatch<ClickedFillAction>;
  gridRef: MutableRefObject<HTMLDivElement | null>;
}
const PotentialFillList = (props: PotentialFillListProps) => {
  const listRef = useRef<List>(null);
  const listParent = useRef<HTMLDivElement>(null);
  const { height = 320 } = usePolyfilledResizeObserver(listParent);
  useEffect(() => {
    if (listRef.current !== null) {
      listRef.current.scrollToItem(0);
    }
  }, [props.entryIndex, props.values]);
  return (
    <div
      css={{
        height: '100% !important',
        position: 'relative',
        display: props.selected ? 'block' : 'none',
        [SMALL_AND_UP]: {
          display: 'block',
        },
      }}
    >
      <div
        css={{
          fontWeight: 'bold',
          borderBottom: '1px solid #AAA',
          height: '1.5em',
          paddingLeft: '0.5em',
          display: 'none',
          [SMALL_AND_UP]: {
            display: 'block',
          },
        }}
      >
        {props.header}
      </div>
      <div
        ref={listParent}
        css={{
          height: '100%',
          [SMALL_AND_UP]: {
            height: 'calc(100% - 1.5em)',
          },
        }}
      >
        <List
          ref={listRef}
          height={height}
          itemCount={props.values.length}
          itemSize={35}
          width="100%"
        >
          {({ index, style }) => {
            const value = props.values[index];
            if (value === undefined) {
              return null;
            }
            return (
              <div style={style}>
                <PotentialFillItem
                  gridRef={props.gridRef}
                  key={index}
                  entryIndex={props.entryIndex}
                  dispatch={props.dispatch}
                  value={value}
                />
              </div>
            );
          }}
        </List>
      </div>
    </div>
  );
};

const initializeState = (props: BuilderProps & AuthProps): BuilderState => {
  const inStorage = localStorage.getItem(STORAGE_KEY);
  let saved: PuzzleInProgressT | null = null;
  if (inStorage) {
    const validationResult = PuzzleInProgressV.decode(JSON.parse(inStorage));
    if (isRight(validationResult)) {
      console.log('loaded puzzle in progress from local storage');
      saved = validationResult.right;
    } else {
      console.error('failed to load puzzle in progress!');
      console.error(PathReporter.report(validationResult).join(','));
    }
  }

  return initialBuilderState({
    id: saved?.id || null,
    width: saved?.width || props.size.cols,
    height: saved?.height || props.size.rows,
    grid: saved?.grid || props.grid,
    vBars: saved?.vBars || props.vBars || [],
    hBars: saved?.hBars || props.hBars || [],
    highlighted: saved?.highlighted || props.highlighted || [],
    highlight: saved?.highlight || props.highlight || 'circle',
    title: saved?.title || props.title || null,
    notes: saved?.notes || props.constructorNotes || null,
    clues: saved?.clues || {},
    authorId: props.user.uid,
    authorName: props.user.displayName || 'Anonymous',
    editable: true,
    isPrivate: saved?.isPrivate || false,
    isPrivateUntil: saved?.isPrivateUntil || null,
    blogPost: saved?.blogPost || null,
    guestConstructor: saved?.guestConstructor || null,
    contestAnswers: saved?.contestAnswers || null,
    contestHasPrize: saved?.contestHasPrize || false,
    contestRevealDelay: saved?.contestRevealDelay || null,
    alternates: saved?.alternates || null,
  });
};

interface SizeSelectProps {
  cols: number | null;
  rows: number | null;
  current: string;
  setCols: (s: number) => void;
  setRows: (s: number) => void;
  setCurrent: (s: string) => void;
  label: string;
}

const SizeSelectInput = (props: SizeSelectProps) => {
  return (
    <div css={{ fontSize: '1.5em' }}>
      <label>
        <input
          css={{ marginRight: '1em' }}
          type="radio"
          name="size"
          value={props.label}
          checked={props.current === props.label}
          onChange={(e) => {
            if (e.currentTarget.value !== props.label) return;
            props.setCols(props.cols || 0);
            props.setRows(props.rows || 0);
            props.setCurrent(props.label);
          }}
        />
        <span
          css={{
            verticalAlign: 'top !important',
            fontSize: '2em',
            marginRight: '0.3em',
          }}
        >
          <PuzzleSizeIcon
            width={props.cols || undefined}
            height={props.rows || undefined}
          />
        </span>
        {props.label}
        {props.label === 'Custom' && props.current === props.label ? (
          <>
            <input
              type="text"
              css={{ fontSize: '0.75em', marginLeft: '1em', width: '5em' }}
              value={props.cols || ''}
              placeholder="Columns"
              onChange={(e) => props.setCols(parseInt(e.target.value))}
            />
            <span css={{ marginLeft: '0.5em', marginRight: '0.5em' }}>x</span>
            <input
              type="text"
              css={{ fontSize: '0.75em', width: '5em' }}
              width="3em"
              value={props.rows || ''}
              placeholder="Rows"
              onChange={(e) => props.setRows(parseInt(e.target.value))}
            />
          </>
        ) : (
          ''
        )}
      </label>
    </div>
  );
};

interface PrefillSelectProps {
  current: PrefillSquares;
  option: PrefillSquares;
  setCurrent: (s: PrefillSquares) => void;
}

const labelForPrefill = (p: PrefillSquares) => {
  switch (p) {
    case PrefillSquares.OddOdd:
      return 'Odd/Odd';
    case PrefillSquares.EvenEven:
      return 'Even/Even';
    case PrefillSquares.OddEven:
      return 'Odd/Even';
    case PrefillSquares.EvenOdd:
      return 'Even/Odd';
  }
};

const PrefillSelectInput = (props: PrefillSelectProps) => {
  return (
    <div css={{ fontSize: '1.5em' }}>
      <label>
        <input
          css={{ marginRight: '1em' }}
          type="radio"
          name="prefill"
          value={props.option}
          checked={props.current === props.option}
          onChange={(e) => {
            if (parseInt(e.currentTarget.value) !== props.option) return;
            props.setCurrent(props.option);
          }}
        />
        <span
          css={{
            verticalAlign: 'top !important',
            fontSize: '2em',
            marginRight: '0.3em',
          }}
        >
          <PrefillIcon type={props.option} />
        </span>
        {labelForPrefill(props.option)}
      </label>
    </div>
  );
};

const ImportPuzForm = (props: { dispatch: Dispatch<ImportPuzAction> }) => {
  const [error, setError] = useState<string | null>(null);

  function handleFile(f: FileList | null) {
    if (!f || !f[0]) {
      setError('No file selected');
      return;
    }
    const fileReader = new FileReader();
    fileReader.onloadend = () => {
      if (!fileReader.result) {
        setError('No file result');
      } else if (typeof fileReader.result === 'string') {
        setError('Failed to read as binary');
      } else {
        try {
          const puzzle = importFile(new Uint8Array(fileReader.result));
          if (!puzzle) {
            setError('Failed to parse file');
          } else {
            props.dispatch({
              type: 'IMPORTPUZ',
              puz: puzzle,
            });
          }
        } catch (error) {
          if (error instanceof Error) {
            setError(error.message);
          } else {
            setError('Could not import file');
          }
          console.error(error);
        }
      }
    };
    fileReader.readAsArrayBuffer(f[0]);
  }

  return (
    <>
      {error ? (
        <>
          <p>Error: {error}</p>
          <p>
            If your puzzle isn&apos;t uploading correctly please get in touch
            via <ContactLinks /> so we can help!
          </p>
        </>
      ) : (
        ''
      )}
      <label>
        <p>
          Select a .puz file to import - any existing progress on your current
          construction will be overwritten!
        </p>
        <input
          css={{ overflow: 'hidden', maxWidth: '70vw' }}
          type="file"
          accept=".puz"
          onChange={(e) => handleFile(e.target.files)}
        />
      </label>
    </>
  );
};

const NewPuzzleForm = (props: { dispatch: Dispatch<NewPuzzleAction> }) => {
  const [cols, setCols] = useState(5);
  const [rows, setRows] = useState(5);
  const [current, setCurrent] = useState('Mini');
  const [customRows, setCustomRows] = useState<number | null>(null);
  const [customCols, setCustomCols] = useState<number | null>(null);
  const [prefill, setPrefill] = useState<PrefillSquares | undefined>(undefined);

  let errorMsg = '';
  if (!customRows || !customCols) {
    errorMsg = 'Both a width and a height must be specified for custom sizes';
  } else if (customRows < 2 || customCols < 2) {
    errorMsg = 'Must have at least two rows and columns';
  } else if (customRows > 25 || customCols > 25) {
    errorMsg = 'Cannot have more than 25 rows or columns';
  }

  function startPuzzle(event: FormEvent) {
    event.preventDefault();

    // Clear current puzzle
    localStorage.removeItem(STORAGE_KEY);

    props.dispatch({ type: 'NEWPUZZLE', cols, rows, prefill });
  }

  return (
    <>
      <h2>Start a new puzzle</h2>
      <p css={{ color: 'var(--error)' }}>
        WARNING: all progress on your current puzzle will be permanently lost.
        If you want to keep it, please publish the current puzzle or export a
        .puz file first.
      </p>
      <form onSubmit={startPuzzle}>
        <div /* eslint-disable-line */
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <SizeSelectInput
            cols={5}
            rows={5}
            label="Mini"
            current={current}
            setCols={setCols}
            setRows={setRows}
            setCurrent={setCurrent}
          />
          <SizeSelectInput
            cols={11}
            rows={11}
            label="Midi"
            current={current}
            setCols={setCols}
            setRows={setRows}
            setCurrent={setCurrent}
          />
          <SizeSelectInput
            cols={15}
            rows={15}
            label="Full"
            current={current}
            setCols={setCols}
            setRows={setRows}
            setCurrent={setCurrent}
          />
          <SizeSelectInput
            cols={customCols}
            rows={customRows}
            label="Custom"
            current={current}
            setCols={(n) => {
              setCols(n);
              setCustomCols(n);
            }}
            setRows={(n) => {
              setRows(n);
              setCustomRows(n);
            }}
            setCurrent={setCurrent}
          />
          {current === 'Custom' && errorMsg ? (
            <p css={{ color: 'var(--error)' }}>{errorMsg}</p>
          ) : (
            ''
          )}
          <div>
            <label>
              <input
                css={{ marginRight: '1em' }}
                type="checkbox"
                checked={prefill !== undefined}
                onChange={(e) => {
                  if (e.target.checked) {
                    setPrefill(PrefillSquares.OddOdd);
                  } else {
                    setPrefill(undefined);
                  }
                }}
              />{' '}
              Prefill black squares for UK/cryptic style
            </label>
            {prefill !== undefined ? (
              <>
                <PrefillSelectInput
                  current={prefill}
                  option={PrefillSquares.OddOdd}
                  setCurrent={setPrefill}
                />
                <PrefillSelectInput
                  current={prefill}
                  option={PrefillSquares.EvenEven}
                  setCurrent={setPrefill}
                />
                <PrefillSelectInput
                  current={prefill}
                  option={PrefillSquares.OddEven}
                  setCurrent={setPrefill}
                />
                <PrefillSelectInput
                  current={prefill}
                  option={PrefillSquares.EvenOdd}
                  setCurrent={setPrefill}
                />
              </>
            ) : (
              ''
            )}
          </div>
        </div>

        <input
          type="submit"
          value="Create New Puzzle"
          disabled={current === 'Custom' && errorMsg !== ''}
        />
      </form>
    </>
  );
};

export const Builder = (props: BuilderProps & AuthProps): JSX.Element => {
  const [state, dispatch] = useReducer(builderReducer, props, initializeState);

  const [autofilledGrid, setAutofilledGrid] = useState<string[]>([]);
  const [autofillInProgress, setAutofillInProgress] = useState(false);

  const getMostConstrainedEntry: () => number | null = useCallback(() => {
    if (!WordDB.wordDB) {
      throw new Error('missing db!');
    }
    const openEntries = state.grid.entries
      .filter((e) => e.completedWord === null)
      .map((e): [ViewableEntry, number] => [
        e,
        numMatchesForEntry(
          addAutofillFieldsToEntry({
            ...e,
            pattern: e.cells.map((p) => valAt(state.grid, p)).join(''),
          })
        ),
      ])
      .sort(([_a, aMatches], [_b, bMatches]) => aMatches - bMatches);
    if (openEntries.length) {
      return openEntries[0]?.[0]?.index ?? null;
    }
    return null;
  }, [state.grid]);

  const [autofillEnabled, setAutofillEnabled] = useState(true);

  // We need a ref to the current grid so we can verify it in worker.onmessage
  const currentCells = useRef(state.grid.cells);
  const priorSolves = useRef<Array<Array<string>>>([]);
  const priorWidth = useRef(state.grid.width);
  const priorHeight = useRef(state.grid.height);
  const runAutofill = useCallback(() => {
    if (!autofillEnabled) {
      if (worker) {
        const msg: CancelAutofillMessage = { type: 'cancel' };
        setAutofillInProgress(false);
        worker.postMessage(msg);
      }
      return;
    }
    if (!WordDB.wordDB) {
      throw new Error('missing db!');
    }
    currentCells.current = state.grid.cells;
    if (
      priorWidth.current !== state.grid.width ||
      priorHeight.current !== state.grid.height
    ) {
      priorWidth.current = state.grid.width;
      priorHeight.current = state.grid.height;
      priorSolves.current = [];
    }
    for (const priorSolve of priorSolves.current) {
      let match = true;
      for (const [i, cell] of state.grid.cells.entries()) {
        if (priorSolve[i] === '.' && cell !== '.') {
          match = false;
          break;
        }
        if (cell.trim() && priorSolve[i] !== cell) {
          match = false;
          break;
        }
      }
      if (match) {
        if (worker) {
          const msg: CancelAutofillMessage = { type: 'cancel' };
          setAutofillInProgress(false);
          worker.postMessage(msg);
        }
        setAutofilledGrid(priorSolve);
        return;
      }
    }
    setAutofilledGrid([]);
    if (!worker) {
      console.log('initializing worker');

      worker = getAutofillWorker();

      worker.onmessage = (e) => {
        const data = e.data as WorkerMessage;
        if (isAutofillResultMessage(data)) {
          priorSolves.current.unshift(data.result);
          if (
            currentCells.current.length === data.input.length &&
            currentCells.current.every((c, i) => c === data.input[i])
          ) {
            setAutofilledGrid(data.result);
          }
        } else if (isAutofillCompleteMessage(data)) {
          setAutofillInProgress(false);
        } else {
          console.error('unhandled msg in builder: ', e.data);
        }
      };
      const loaddb: LoadDBMessage = { type: 'loaddb', db: WordDB.wordDB };
      worker.postMessage(loaddb);
    }
    const autofill: AutofillMessage = {
      type: 'autofill',
      grid: state.grid.cells,
      width: state.grid.width,
      height: state.grid.height,
      vBars: state.grid.vBars,
      hBars: state.grid.hBars,
    };
    setAutofillInProgress(true);
    worker.postMessage(autofill);
  }, [state.grid, autofillEnabled]);
  useEffect(() => {
    runAutofill();
  }, [runAutofill]);

  useEffect(() => {
    const inProgress: PuzzleInProgressT = {
      id: state.id,
      width: state.grid.width,
      height: state.grid.height,
      grid: state.grid.cells,
      vBars: Array.from(state.grid.vBars),
      hBars: Array.from(state.grid.hBars),
      highlight: state.grid.highlight,
      highlighted: Array.from(state.grid.highlighted),
      clues: state.clues,
      title: state.title,
      notes: state.notes,
      blogPost: state.blogPost,
      guestConstructor: state.guestConstructor,
      isPrivate: state.isPrivate,
      isPrivateUntil: state.isPrivateUntil?.toMillis(),
      alternates: state.alternates,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(inProgress));
  }, [
    state.id,
    state.clues,
    state.grid.cells,
    state.grid.width,
    state.grid.height,
    state.grid.highlight,
    state.grid.highlighted,
    state.title,
    state.notes,
    state.blogPost,
    state.guestConstructor,
    state.isPrivate,
    state.isPrivateUntil,
    state.alternates,
    state.grid.vBars,
    state.grid.hBars,
  ]);

  const reRunAutofill = useCallback(() => {
    priorSolves.current = [];
    runAutofill();
  }, [runAutofill]);

  const [clueMode, setClueMode] = useState(false);
  if (clueMode) {
    return (
      <ClueMode
        user={props.user}
        state={state}
        puzzleId={state.id}
        authorId={state.authorId}
        dispatch={dispatch}
        blogPost={state.blogPost}
        guestConstructor={state.guestConstructor}
        title={state.title}
        notes={state.notes}
        clues={state.clues}
        completedEntries={state.grid.entries.filter((e) => e.completedWord)}
        exitClueMode={() => setClueMode(false)}
      />
    );
  }
  return (
    <GridMode
      getMostConstrainedEntry={getMostConstrainedEntry}
      reRunAutofill={reRunAutofill}
      user={props.user}
      isAdmin={props.isAdmin}
      autofillEnabled={autofillEnabled}
      setAutofillEnabled={setAutofillEnabled}
      autofilledGrid={autofilledGrid}
      autofillInProgress={autofillInProgress}
      state={state}
      dispatch={dispatch}
      setClueMode={setClueMode}
    />
  );
};

/* Returns the index within a word string of the start of the `active` cell,
 * if that word were used as fill for `entry`. */
const activeIndex = (
  grid: BuilderGrid,
  active: Position,
  entry: ViewableEntry
): number => {
  let j = -1;
  for (const cell of entry.cells) {
    j += 1;
    if (active.row === cell.row && active.col === cell.col) {
      return j;
    }
    // add extra for rebus:
    j = j + valAt(grid, cell).length - 1;
  }
  console.error('active not in entry', active, entry);
  throw new Error('active not in entry');
};

const lettersAtIndex = (
  fill: Array<[string, number]>,
  index: number
): string => {
  let seen = '';
  for (const [word] of fill) {
    const char = word[index];
    if (char === undefined) {
      continue;
    }
    if (seen.indexOf(char) === -1) {
      seen += word[index];
    }
  }
  return seen;
};

const potentialFill = (
  entry: ViewableEntry,
  grid: BuilderGrid
): Array<[string, number]> => {
  let pattern = '';
  const crosses = getCrosses(grid, entry);
  for (const [index, cell] of entry.cells.entries()) {
    const val = valAt(grid, cell);
    const cross = crosses[index];
    if (cross === undefined) {
      throw new Error('bad cross');
    }
    // If complete, remove any cells whose crosses aren't complete and show that
    if (
      entry.completedWord &&
      val.length === 1 &&
      cross.entryIndex !== null &&
      !grid.entries[cross.entryIndex]?.completedWord
    ) {
      pattern += ' ';
    } else {
      pattern += val;
    }
  }
  const successLetters = new Array<string>(entry.cells.length).fill('');
  const failLetters = new Array<string>(entry.cells.length).fill('');
  const matches = WordDB.matchingWords(
    pattern.length,
    WordDB.matchingBitmap(pattern)
  );
  return matches.filter(([word]) => {
    let j = -1;
    for (const [i, cellPos] of entry.cells.entries()) {
      j += 1;
      const cell = valAt(grid, cellPos);
      if (cell.length > 1) {
        // Handle rebuses
        j += cell.length - 1;
        continue;
      }
      if (!entry.completedWord && cell !== ' ') {
        continue;
      }
      const letter = word[j];
      if (letter === undefined) {
        throw new Error('out of bounds on ' + word);
      }
      if (successLetters[i]?.indexOf(letter) !== -1) {
        continue;
      }
      if (failLetters[i]?.indexOf(letter) !== -1) {
        return false;
      }
      const crossObj = crosses[i];
      if (crossObj === undefined) {
        throw new Error('bad crosses');
      }
      const crossIndex = crossObj.entryIndex;
      if (crossIndex === null) {
        successLetters[i] += letter;
        continue;
      }
      const cross = grid.entries[crossIndex];
      if (cross === undefined) {
        throw new Error('bad cross index');
      }
      if (cross.completedWord) {
        successLetters[i] += letter;
        continue;
      }

      let crossPattern = '';
      for (const crossCell of cross.cells) {
        if (crossCell.row === cellPos.row && crossCell.col === cellPos.col) {
          crossPattern += word[j];
        } else {
          crossPattern += valAt(grid, crossCell);
        }
      }
      const newBitmap = WordDB.matchingBitmap(crossPattern);
      if (!newBitmap || BA.isZero(newBitmap)) {
        failLetters[i] += letter;
        return false;
      } else {
        successLetters[i] += letter;
      }
    }
    return true;
  });
};

const PuzDownloadLink = (props: ExportProps) => {
  const [dataURI, setDataURI] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    const data = exportFile(props);
    const reader = new FileReader();
    reader.addEventListener(
      'load',
      function () {
        if (typeof reader.result === 'string') {
          setDataURI(reader.result);
        } else {
          setError('Bad result, please try again');
        }
      },
      false
    );
    reader.readAsDataURL(new Blob([data]));
  }, [props]);
  if (error) {
    return <>{error}</>;
  }
  if (!dataURI) {
    return <>Generating file...</>;
  }
  return (
    <a href={dataURI} download={props.t + '.puz'}>
      Download
    </a>
  );
};

const PuzDownloadOverlay = (props: {
  state: BuilderState;
  cancel: () => void;
}) => {
  if (props.state.grid.vBars.size || props.state.grid.hBars.size) {
    return (
      <Overlay closeCallback={props.cancel}>
        <h2>Export unsupported</h2>
        <p>
          Barred grids currently cannot be exported (.puz does not support
          bars).
        </p>
      </Overlay>
    );
  }
  return (
    <Overlay closeCallback={props.cancel}>
      <h2>Exporting .puz</h2>
      <p>
        <PuzDownloadLink
          w={props.state.grid.width}
          h={props.state.grid.height}
          g={props.state.grid.cells}
          n={props.state.authorName}
          t={props.state.title || 'Crosshare puzzle'}
          hs={Array.from(props.state.grid.highlighted)}
          cn={props.state.notes || undefined}
          gc={props.state.guestConstructor || undefined}
          {...getClueProps(
            props.state.grid.sortedEntries,
            props.state.grid.entries,
            props.state.clues,
            false
          )}
        />
      </p>
    </Overlay>
  );
};

interface GridModeProps {
  user: firebase.User;
  isAdmin: boolean;
  reRunAutofill: () => void;
  autofillEnabled: boolean;
  setAutofillEnabled: (val: boolean) => void;
  autofilledGrid: string[];
  autofillInProgress: boolean;
  state: BuilderState;
  dispatch: Dispatch<PuzzleAction>;
  setClueMode: (val: boolean) => void;
  getMostConstrainedEntry: () => number | null;
}
const GridMode = ({
  getMostConstrainedEntry,
  reRunAutofill,
  state,
  dispatch,
  setClueMode,
  ...props
}: GridModeProps) => {
  const [muted, setMuted] = usePersistedBoolean('muted', false);
  const [toggleKeyboard, setToggleKeyboard] = usePersistedBoolean(
    'keyboard',
    false
  );
  const { showSnackbar } = useSnackbar();

  const gridRef = useRef<HTMLDivElement | null>(null);

  const focusGrid = useCallback(() => {
    if (gridRef.current) {
      gridRef.current.focus();
    }
  }, []);

  const physicalKeyboardHandler = useCallback(
    (e: KeyboardEvent) => {
      const mkey = fromKeyboardEvent(e);
      if (isSome(mkey)) {
        /* TODO this logic belongs in the reducer */
        if (mkey.value.k === KeyK.Enter && !state.isEnteringRebus) {
          reRunAutofill();
          e.preventDefault();
          return;
        }
        if (mkey.value.k === KeyK.Exclamation) {
          const entry = getMostConstrainedEntry();
          if (entry !== null) {
            const ca: ClickedEntryAction = {
              type: 'CLICKEDENTRY',
              entryIndex: entry,
            };
            dispatch(ca);
          }
          e.preventDefault();
          return;
        }

        const kpa: KeypressAction = { type: 'KEYPRESS', key: mkey.value };
        dispatch(kpa);
        e.preventDefault();
      }
    },
    [dispatch, reRunAutofill, state.isEnteringRebus, getMostConstrainedEntry]
  );
  useEventListener(
    'keydown',
    physicalKeyboardHandler,
    gridRef.current || undefined
  );

  const pasteHandler = useCallback(
    (e: ClipboardEvent) => {
      const tagName = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tagName === 'textarea' || tagName === 'input') {
        return;
      }
      const pa: PasteAction = {
        type: 'PASTE',
        content: e.clipboardData?.getData('Text') || '',
      };
      dispatch(pa);
      e.preventDefault();
    },
    [dispatch]
  );
  useEventListener('paste', pasteHandler);

  const fillLists = useMemo(() => {
    let left = <></>;
    let right = <></>;
    const [entry, cross] = entryAndCrossAtPosition(state.grid, state.active);
    let crossMatches = cross && potentialFill(cross, state.grid);
    let entryMatches = entry && potentialFill(entry, state.grid);

    if (
      crossMatches !== null &&
      entryMatches !== null &&
      entry !== null &&
      cross !== null
    ) {
      /* If we have both entry + cross we now filter for only matches that'd work for both. */
      const entryActiveIndex = activeIndex(state.grid, state.active, entry);
      const crossActiveIndex = activeIndex(state.grid, state.active, cross);
      const entryValidLetters = lettersAtIndex(entryMatches, entryActiveIndex);
      const crossValidLetters = lettersAtIndex(crossMatches, crossActiveIndex);
      const validLetters = (
        entryValidLetters.match(
          new RegExp('[' + crossValidLetters + ']', 'g')
        ) || []
      ).join('');
      entryMatches = entryMatches.filter(([word]) => {
        const l = word[entryActiveIndex];
        return l && validLetters.indexOf(l) !== -1;
      });
      crossMatches = crossMatches.filter(([word]) => {
        const l = word[crossActiveIndex];
        return l && validLetters.indexOf(l) !== -1;
      });
    }

    if (cross && crossMatches !== null) {
      if (cross.direction === Direction.Across) {
        left = (
          <PotentialFillList
            selected={false}
            gridRef={gridRef}
            header="Across"
            values={crossMatches}
            entryIndex={cross.index}
            dispatch={dispatch}
          />
        );
      } else {
        right = (
          <PotentialFillList
            selected={false}
            gridRef={gridRef}
            header="Down"
            values={crossMatches}
            entryIndex={cross.index}
            dispatch={dispatch}
          />
        );
      }
    }
    if (entry && entryMatches !== null) {
      if (entry.direction === Direction.Across) {
        left = (
          <PotentialFillList
            selected={true}
            gridRef={gridRef}
            header="Across"
            values={entryMatches}
            entryIndex={entry.index}
            dispatch={dispatch}
          />
        );
      } else {
        right = (
          <PotentialFillList
            selected={true}
            gridRef={gridRef}
            header="Down"
            values={entryMatches}
            entryIndex={entry.index}
            dispatch={dispatch}
          />
        );
      }
    }
    return { left, right };
  }, [state.grid, state.active, dispatch]);

  const { autofillEnabled, setAutofillEnabled } = props;
  const toggleAutofillEnabled = useCallback(() => {
    if (autofillEnabled) {
      showSnackbar('Autofill Disabled');
    }
    setAutofillEnabled(!autofillEnabled);
  }, [autofillEnabled, setAutofillEnabled, showSnackbar]);

  const stats = useMemo(() => {
    let totalLength = 0;
    const lengthHistogram: Array<number> = new Array(
      Math.max(state.grid.width, state.grid.height) - 1
    ).fill(0);
    const lengthHistogramNames = lengthHistogram.map((_, i) =>
      (i + 2).toString()
    );

    state.grid.entries.forEach((e) => {
      totalLength += e.cells.length;
      lengthHistogram[e.cells.length - 2] += 1;
    });
    const numEntries = state.grid.entries.length;
    const averageLength = totalLength / numEntries;
    const lettersHistogram: Array<number> = new Array(26).fill(0);
    const lettersHistogramNames = lettersHistogram.map((_, i) =>
      String.fromCharCode(i + 65)
    );
    let numBlocks = 0;
    const numTotal = state.grid.width * state.grid.height;
    state.grid.cells.forEach((s) => {
      if (s === '.') {
        numBlocks += 1;
      } else {
        const index = lettersHistogramNames.indexOf(s);
        if (index !== -1) {
          lettersHistogram[index] += 1;
        }
      }
    });
    return {
      numBlocks,
      numTotal,
      lengthHistogram,
      lengthHistogramNames,
      numEntries,
      averageLength,
      lettersHistogram,
      lettersHistogramNames,
    };
  }, [
    state.grid.entries,
    state.grid.height,
    state.grid.width,
    state.grid.cells,
  ]);

  const keyboardHandler = useCallback(
    (key: string) => {
      const mkey = fromKeyString(key);
      if (isSome(mkey)) {
        const kpa: KeypressAction = { type: 'KEYPRESS', key: mkey.value };
        dispatch(kpa);
      }
    },
    [dispatch]
  );

  const topBarChildren = useMemo(() => {
    let autofillIcon = <SpinnerDisabled />;
    let autofillReverseIcon = <SpinnerWorking />;
    let autofillReverseText = 'Enable Autofill';
    let autofillText = 'Autofill disabled';
    if (props.autofillEnabled) {
      autofillReverseIcon = <SpinnerDisabled />;
      autofillReverseText = 'Disable Autofill';
      if (props.autofillInProgress) {
        autofillIcon = <SpinnerWorking />;
        autofillText = 'Autofill in progress';
      } else if (props.autofilledGrid.length) {
        autofillIcon = <SpinnerFinished />;
        autofillText = 'Autofill complete';
      } else {
        autofillIcon = <SpinnerFailed />;
        autofillText = "Couldn't autofill this grid";
      }
    }
    return (
      <>
        <TopBarDropDown
          onClose={focusGrid}
          icon={autofillIcon}
          text="Autofill"
          hoverText={autofillText}
        >
          {() => (
            <>
              <TopBarDropDownLink
                icon={autofillReverseIcon}
                text={autofillReverseText}
                onClick={toggleAutofillEnabled}
              />
              <TopBarDropDownLink
                icon={<FaSignInAlt />}
                text="Jump to Most Constrained"
                shortcutHint={<ExclamationKey />}
                onClick={() => {
                  const entry = getMostConstrainedEntry();
                  if (entry !== null) {
                    const ca: ClickedEntryAction = {
                      type: 'CLICKEDENTRY',
                      entryIndex: entry,
                    };
                    dispatch(ca);
                  }
                }}
              />
              <TopBarDropDownLink
                icon={<MdRefresh />}
                text="Rerun Autofiller"
                shortcutHint={<EnterKey />}
                onClick={() => {
                  reRunAutofill();
                }}
              />
            </>
          )}
        </TopBarDropDown>
        <TopBarLink
          icon={<FaListOl />}
          text="Clues"
          onClick={() => setClueMode(true)}
        />
        <TopBarLink
          icon={<FaRegNewspaper />}
          text="Publish"
          onClick={() => {
            const a: PublishAction = {
              type: 'PUBLISH',
              publishTimestamp: TimestampClass.now(),
            };
            dispatch(a);
          }}
        />
        <TopBarDropDown onClose={focusGrid} icon={<FaEllipsisH />} text="More">
          {(closeDropdown) => (
            <>
              <NestedDropDown
                onClose={focusGrid}
                closeParent={closeDropdown}
                icon={<FaRegPlusSquare />}
                text="New Puzzle"
              >
                {() => <NewPuzzleForm dispatch={dispatch} />}
              </NestedDropDown>
              <NestedDropDown
                onClose={focusGrid}
                closeParent={closeDropdown}
                icon={<FaFileImport />}
                text="Import .puz File"
              >
                {() => <ImportPuzForm dispatch={dispatch} />}
              </NestedDropDown>
              <TopBarDropDownLink
                icon={<FaRegFile />}
                text="Export .puz File"
                onClick={() => {
                  const a: SetShowDownloadLink = {
                    type: 'SETSHOWDOWNLOAD',
                    value: true,
                  };
                  dispatch(a);
                }}
              />
              <NestedDropDown
                onClose={focusGrid}
                closeParent={closeDropdown}
                icon={<IoMdStats />}
                text="Stats"
              >
                {() => (
                  <>
                    <h2>Grid</h2>
                    <div>
                      {state.gridIsComplete ? (
                        <FaRegCheckCircle />
                      ) : (
                        <FaRegCircle />
                      )}{' '}
                      All cells should be filled
                    </div>
                    <div>
                      {state.hasNoShortWords ? (
                        <FaRegCheckCircle />
                      ) : (
                        <FaRegCircle />
                      )}{' '}
                      All words should be at least three letters
                    </div>
                    <div>
                      {state.repeats.size > 0 ? (
                        <>
                          <FaRegCircle /> (
                          {Array.from(state.repeats).sort().join(', ')})
                        </>
                      ) : (
                        <FaRegCheckCircle />
                      )}{' '}
                      No words should be repeated
                    </div>
                    <h2 css={{ marginTop: '1.5em' }}>Fill</h2>
                    <div>Number of words: {stats.numEntries}</div>
                    <div>
                      Mean word length: {stats.averageLength.toPrecision(3)}
                    </div>
                    <div>
                      Number of blocks: {stats.numBlocks} (
                      {((100 * stats.numBlocks) / stats.numTotal).toFixed(1)}%)
                    </div>
                    <div
                      css={{
                        marginTop: '1em',
                        textDecoration: 'underline',
                        textAlign: 'center',
                      }}
                    >
                      Word Lengths
                    </div>
                    <Histogram
                      data={stats.lengthHistogram}
                      names={stats.lengthHistogramNames}
                    />
                    <div
                      css={{
                        marginTop: '1em',
                        textDecoration: 'underline',
                        textAlign: 'center',
                      }}
                    >
                      Letter Counts
                    </div>
                    <Histogram
                      data={stats.lettersHistogram}
                      names={stats.lettersHistogramNames}
                    />
                  </>
                )}
              </NestedDropDown>
              <NestedDropDown
                onClose={focusGrid}
                closeParent={closeDropdown}
                icon={<SymmetryIcon type={state.symmetry} />}
                text="Change Symmetry"
              >
                {() => (
                  <>
                    <TopBarDropDownLink
                      icon={<SymmetryRotational />}
                      text="Use Rotational Symmetry"
                      onClick={() => {
                        const a: SymmetryAction = {
                          type: 'CHANGESYMMETRY',
                          symmetry: Symmetry.Rotational,
                        };
                        dispatch(a);
                      }}
                    />
                    <TopBarDropDownLink
                      icon={<SymmetryHorizontal />}
                      text="Use Horizontal Symmetry"
                      onClick={() => {
                        const a: SymmetryAction = {
                          type: 'CHANGESYMMETRY',
                          symmetry: Symmetry.Horizontal,
                        };
                        dispatch(a);
                      }}
                    />
                    <TopBarDropDownLink
                      icon={<SymmetryVertical />}
                      text="Use Vertical Symmetry"
                      onClick={() => {
                        const a: SymmetryAction = {
                          type: 'CHANGESYMMETRY',
                          symmetry: Symmetry.Vertical,
                        };
                        dispatch(a);
                      }}
                    />
                    <TopBarDropDownLink
                      icon={<SymmetryNone />}
                      text="Use No Symmetry"
                      onClick={() => {
                        const a: SymmetryAction = {
                          type: 'CHANGESYMMETRY',
                          symmetry: Symmetry.None,
                        };
                        dispatch(a);
                      }}
                    />
                    {state.grid.width === state.grid.height ? (
                      <>
                        <TopBarDropDownLink
                          icon={<SymmetryIcon type={Symmetry.DiagonalNESW} />}
                          text="Use NE/SW Diagonal Symmetry"
                          onClick={() => {
                            const a: SymmetryAction = {
                              type: 'CHANGESYMMETRY',
                              symmetry: Symmetry.DiagonalNESW,
                            };
                            dispatch(a);
                          }}
                        />
                        <TopBarDropDownLink
                          icon={<SymmetryIcon type={Symmetry.DiagonalNWSE} />}
                          text="Use NW/SE Diagonal Symmetry"
                          onClick={() => {
                            const a: SymmetryAction = {
                              type: 'CHANGESYMMETRY',
                              symmetry: Symmetry.DiagonalNWSE,
                            };
                            dispatch(a);
                          }}
                        />
                      </>
                    ) : (
                      ''
                    )}
                  </>
                )}
              </NestedDropDown>
              <TopBarDropDownLink
                icon={<FaSquare />}
                text="Toggle Block"
                shortcutHint={<PeriodKey />}
                onClick={() => {
                  const a: KeypressAction = {
                    type: 'KEYPRESS',
                    key: { k: KeyK.Dot },
                  };
                  dispatch(a);
                }}
              />
              <TopBarDropDownLink
                icon={<Rebus />}
                text="Enter Rebus"
                shortcutHint={<EscapeKey />}
                onClick={() => {
                  const a: KeypressAction = {
                    type: 'KEYPRESS',
                    key: { k: KeyK.Escape },
                  };
                  dispatch(a);
                }}
              />
              <TopBarDropDownLink
                icon={
                  state.grid.highlight === 'circle' ? (
                    <FaRegCircle />
                  ) : (
                    <FaFillDrip />
                  )
                }
                text="Toggle Square Highlight"
                shortcutHint={<BacktickKey />}
                onClick={() => {
                  const a: KeypressAction = {
                    type: 'KEYPRESS',
                    key: { k: KeyK.Backtick },
                  };
                  dispatch(a);
                }}
              />
              <TopBarDropDownLink
                icon={
                  state.grid.highlight === 'circle' ? (
                    <FaFillDrip />
                  ) : (
                    <FaRegCircle />
                  )
                }
                text={
                  state.grid.highlight === 'circle'
                    ? 'Use Shade for Highlights'
                    : 'Use Circle for Highlights'
                }
                onClick={() => {
                  const a: SetHighlightAction = {
                    type: 'SETHIGHLIGHT',
                    highlight:
                      state.grid.highlight === 'circle' ? 'shade' : 'circle',
                  };
                  dispatch(a);
                }}
              />
              {muted ? (
                <TopBarDropDownLink
                  icon={<FaVolumeUp />}
                  text="Unmute"
                  onClick={() => setMuted(false)}
                />
              ) : (
                <TopBarDropDownLink
                  icon={<FaVolumeMute />}
                  text="Mute"
                  onClick={() => setMuted(true)}
                />
              )}
              <TopBarDropDownLink
                icon={<FaKeyboard />}
                text="Toggle Keyboard"
                onClick={() => setToggleKeyboard(!toggleKeyboard)}
              />
              {props.isAdmin ? (
                <>
                  <TopBarDropDownLinkA
                    href="/admin"
                    icon={<FaUserLock />}
                    text="Admin"
                  />
                </>
              ) : (
                ''
              )}
              <TopBarDropDownLinkA
                href="/dashboard"
                icon={<FaHammer />}
                text="Constructor Dashboard"
              />
              <TopBarDropDownLinkA
                href="/account"
                icon={<FaUser />}
                text="Account"
              />
            </>
          )}
        </TopBarDropDown>
      </>
    );
  }, [
    focusGrid,
    getMostConstrainedEntry,
    props.autofillEnabled,
    props.autofillInProgress,
    props.autofilledGrid.length,
    stats,
    props.isAdmin,
    setClueMode,
    setMuted,
    state.grid.highlight,
    state.grid.width,
    state.grid.height,
    state.gridIsComplete,
    state.hasNoShortWords,
    state.repeats,
    state.symmetry,
    toggleAutofillEnabled,
    reRunAutofill,
    dispatch,
    muted,
    toggleKeyboard,
    setToggleKeyboard,
  ]);

  return (
    <>
      <div
        css={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
        }}
      >
        <div css={{ flex: 'none' }}>
          <TopBar>{topBarChildren}</TopBar>
        </div>
        {state.showDownloadLink ? (
          <PuzDownloadOverlay
            state={state}
            cancel={() => {
              const a: SetShowDownloadLink = {
                type: 'SETSHOWDOWNLOAD',
                value: false,
              };
              dispatch(a);
            }}
          />
        ) : (
          ''
        )}
        {state.toPublish ? (
          <PublishOverlay
            id={state.id}
            toPublish={state.toPublish}
            warnings={state.publishWarnings}
            user={props.user}
            cancelPublish={() => dispatch({ type: 'CANCELPUBLISH' })}
          />
        ) : (
          ''
        )}
        {state.publishErrors.length ? (
          <Overlay
            closeCallback={() => dispatch({ type: 'CLEARPUBLISHERRORS' })}
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
        <div
          css={{ flex: '1 1 auto', overflow: 'scroll', position: 'relative' }}
        >
          <SquareAndCols
            leftIsActive={state.active.dir === Direction.Across}
            ref={gridRef}
            aspectRatio={state.grid.width / state.grid.height}
            square={(width: number, _height: number) => {
              return (
                <GridView
                  isEnteringRebus={state.isEnteringRebus}
                  rebusValue={state.rebusValue}
                  squareWidth={width}
                  grid={state.grid}
                  active={state.active}
                  dispatch={dispatch}
                  allowBlockEditing={true}
                  autofill={props.autofillEnabled ? props.autofilledGrid : []}
                />
              );
            }}
            left={fillLists.left}
            right={fillLists.right}
            dispatch={dispatch}
          />
        </div>
        <div css={{ flex: 'none', width: '100%' }}>
          <Keyboard
            toggleKeyboard={toggleKeyboard}
            keyboardHandler={keyboardHandler}
            muted={muted}
            showExtraKeyLayout={state.showExtraKeyLayout}
            includeBlockKey={true}
          />
        </div>
      </div>
    </>
  );
};
