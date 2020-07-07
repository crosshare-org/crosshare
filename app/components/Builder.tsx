import {
  useState, useReducer, useRef, useEffect, useCallback, useMemo,
  Dispatch, KeyboardEvent, MouseEvent, FormEvent
} from 'react';
import { isRight } from 'fp-ts/lib/Either';
import { PathReporter } from 'io-ts/lib/PathReporter';
import {
  FaRegNewspaper, FaUser, FaListOl, FaRegCircle, FaRegCheckCircle, FaSquare,
  FaEllipsisH, FaVolumeUp, FaVolumeMute, FaFillDrip, FaUserLock, FaRegPlusSquare
} from 'react-icons/fa';
import { MdRefresh } from 'react-icons/md';
import { IoMdStats } from 'react-icons/io';
import useEventListener from '@use-it/event-listener';
import { FixedSizeList as List } from 'react-window';
import { toast, Slide } from 'react-toastify';

import { ViewableEntry } from '../lib/viewableGrid';
import {
  Rebus, SpinnerWorking, SpinnerFinished, SpinnerFailed, SpinnerDisabled, SymmetryIcon,
  SymmetryRotational, SymmetryVertical, SymmetryHorizontal, SymmetryNone,
  EscapeKey, BacktickKey, PeriodKey, PuzzleSizeIcon, EnterKey
} from './Icons';
import { AuthProps } from './AuthContext';
import { LoadButton } from './DBLoader';
import { Histogram } from './Histogram';
import { PublishOverlay } from './PublishOverlay';
import { TimestampClass } from '../lib/firebaseWrapper';
import { GridView } from './Grid';
import { getCrosses, valAt, entryAndCrossAtPosition } from '../lib/gridBase';
import {
  Position, Direction, PuzzleT, isAutofillCompleteMessage, isAutofillResultMessage,
  WorkerMessage, LoadDBMessage, AutofillMessage, PuzzleInProgressV, PuzzleInProgressT
} from '../lib/types';
import {
  Symmetry, BuilderState, builderReducer, KeypressAction,
  SymmetryAction, ClickedFillAction, PuzzleAction, SetHighlightAction, PublishAction,
  NewPuzzleAction, initialBuilderState, BuilderGrid
} from '../reducers/reducer';
import {
  NestedDropDown, TopBarLink, TopBar, DefaultTopBar, TopBarDropDownLink,
  TopBarDropDownLinkA, TopBarDropDown
} from './TopBar';
import { SquareAndCols, TinyNav } from './Page';
import { RebusOverlay } from './Puzzle';
import { ClueMode } from './ClueMode';
// eslint-disable-next-line import/no-unresolved
import AutofillWorker from 'worker-loader?name=static/[hash].worker.js!../lib/autofill.worker';

import * as BA from '../lib/bitArray';
import * as WordDB from '../lib/WordDB';
import { Overlay } from './Overlay';
import { usePersistedBoolean } from '../lib/hooks';

import useResizeObserver from 'use-resize-observer';
import { ResizeObserver as Polyfill } from '@juggle/resize-observer';
// TODO conditional import only when we need the polyfill?
if (typeof window !== 'undefined') {
  window.ResizeObserver = window.ResizeObserver || Polyfill;
}

let worker: Worker;

type WithOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
type BuilderProps = WithOptional<Omit<PuzzleT, 'comments' | 'category' | 'authorId' | 'authorName' | 'moderated' | 'publishTime'>, 'clues' | 'title' | 'highlighted' | 'highlight'>

export const BuilderDBLoader = (props: BuilderProps & AuthProps): JSX.Element => {
  const [ready, setReady] = useState(false);
  const [triedInit, setTriedInit] = useState(false);

  useEffect(() => {
    if (WordDB.dbStatus === WordDB.DBStatus.uninitialized) {
      WordDB.initialize().then(succeeded => {
        setTriedInit(true);
        if (succeeded) {
          setReady(true);
        }
      });
    } else if (WordDB.dbStatus === WordDB.DBStatus.present) {
      setReady(true);
    }
  }, []);

  if (ready) {
    return <Builder {...props} />;
  } else if (!triedInit) {
    return <div></div>;
  }
  return <>
    <DefaultTopBar />
    <div css={{ margin: '1em' }}>
      <h2>Crosshare Constructor</h2>
      <p>The first time you use the constructor on a new browser Crosshare needs
      to download and build a word database. This can take a minute. Please let us
      know if you have any issues!</p>
      <LoadButton buttonText='Build Database' onComplete={() => setReady(true)} />
    </div>
  </>;
};

interface PotentialFillItemProps {
  entryIndex: number,
  value: [string, number],
  dispatch: Dispatch<ClickedFillAction>,
}
const PotentialFillItem = (props: PotentialFillItemProps) => {
  function click(e: MouseEvent) {
    e.preventDefault();
    props.dispatch({ type: 'CLICKEDFILL', entryIndex: props.entryIndex, value: props.value[0] });
  }
  return (
    <button css={{
      background: 'none',
      border: 'none',
      textDecoration: 'none',
      width: '100%',
      padding: '0.5em 1em',
      color: 'var(--text)',
      cursor: 'pointer',
      '&:hover': {
        backgroundColor: 'var(--clue-bg)',
      },
      alignItems: 'center',
      height: 35,
    }} onClick={click}>
      {props.value[0]}
    </button>
  );
};

interface PotentialFillListProps {
  header?: string,
  entryIndex: number,
  values: Array<[string, number]>,
  dispatch: Dispatch<ClickedFillAction>,
}
const PotentialFillList = (props: PotentialFillListProps) => {
  const listRef = useRef<List>(null);
  const listParent = useRef<HTMLDivElement>(null);
  const { height = 200 } = useResizeObserver({ ref: listParent });
  useEffect(() => {
    if (listRef.current !== null) {
      listRef.current.scrollToItem(0);
    }
  }, [props.entryIndex, props.values]);
  return (
    <div css={{
      height: '100% !important',
      position: 'relative',
    }}>{props.header ?
        <div css={{
          fontWeight: 'bold',
          borderBottom: '1px solid #AAA',
          height: '1.5em',
          paddingLeft: '0.5em',
        }}>{props.header}</div> : ''}
      <div ref={listParent} css={{
        height: props.header ? 'calc(100% - 1.5em)' : '100%',
      }}>
        <List
          ref={listRef}
          height={height}
          itemCount={props.values.length}
          itemSize={35}
          width='100%'
        >
          {({ index, style }) => (
            <div style={style}>
              <PotentialFillItem
                key={index}
                entryIndex={props.entryIndex}
                dispatch={props.dispatch}
                value={props.values[index]}
              />
            </div>
          )}</List>
      </div>
    </div >
  );
};

export const STORAGE_KEY = 'puzzleInProgress';

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
    width: saved ?.width || props.size.cols,
    height: saved ?.height || props.size.rows,
    grid: saved ?.grid || props.grid,
    highlighted: saved ?.highlighted || props.highlighted || [],
    highlight: saved ?.highlight || props.highlight || 'circle',
    title: saved ?.title || props.title || null,
    clues: saved ?.clues || {},
    authorId: props.user.uid,
    authorName: props.user.displayName || 'Anonymous',
  });
};

interface SizeSelectProps {
  cols: number | null,
  rows: number | null,
  current: string,
  setCols: (s: number) => void,
  setRows: (s: number) => void,
  setCurrent: (s: string) => void,
  label: string,
}

const SizeSelectInput = (props: SizeSelectProps) => {
  return <div css={{ fontSize: '1.5em' }}>
    <label>
      <input css={{ marginRight: '1em' }} type='radio' name='size' value={props.label} checked={props.current === props.label} onChange={(e) => { if (e.currentTarget.value !== props.label) return; props.setCols(props.cols || 0); props.setRows(props.rows || 0); props.setCurrent(props.label); }} />
      <span css={{ verticalAlign: 'top !important', fontSize: '2em', marginRight: '0.3em' }} >
        <PuzzleSizeIcon width={props.cols || undefined} height={props.rows || undefined} />
      </span>
      {props.label}
      {props.label === 'Custom' && props.current === props.label ?
        <>
          <input type='text' css={{ fontSize: '0.75em', marginLeft: '1em', width: '5em' }} value={props.cols || ''} placeholder='Columns' onChange={(e) => props.setCols(parseInt(e.target.value))} />
          <span css={{ marginLeft: '0.5em', marginRight: '0.5em' }}>x</span>
          <input type='text' css={{ fontSize: '0.75em', width: '5em' }} width='3em' value={props.rows || ''} placeholder='Rows' onChange={(e) => props.setRows(parseInt(e.target.value))} />
        </>
        : ''}
    </label>
  </div>;
};

const NewPuzzleForm = (props: { dispatch: Dispatch<NewPuzzleAction> }) => {
  const [cols, setCols] = useState(5);
  const [rows, setRows] = useState(5);
  const [current, setCurrent] = useState('Mini');
  const [customRows, setCustomRows] = useState<number | null>(null);
  const [customCols, setCustomCols] = useState<number | null>(null);

  let errorMsg = '';
  if (!customRows || !customCols) {
    errorMsg = 'Both a width and a height must be specified for custom sizes';
  } else if (customRows < 4 || customCols < 4) {
    errorMsg = 'Cannot have fewer than 4 rows or columns';
  } else if (customRows > 25 || customCols > 25) {
    errorMsg = 'Cannot have more than 25 rows or columns';
  }

  function startPuzzle(event: FormEvent) {
    event.preventDefault();

    // Clear current puzzle
    localStorage.removeItem(STORAGE_KEY);

    props.dispatch({ type: 'NEWPUZZLE', cols: cols, rows: rows });
  }

  return <>
    <h2>Start a new puzzle</h2>
    <p css={{ color: 'var(--error)' }}>WARNING: all progress on your current puzzle will be permanently lost. If you want to keep it, please publish the current puzzle first.</p>
    <form onSubmit={startPuzzle}>
      <div onClick={/* eslint-disable-line */ (e) => { e.stopPropagation(); }}>
        <SizeSelectInput cols={5} rows={5} label='Mini' current={current} setCols={setCols} setRows={setRows} setCurrent={setCurrent} />
        <SizeSelectInput cols={11} rows={11} label='Midi' current={current} setCols={setCols} setRows={setRows} setCurrent={setCurrent} />
        <SizeSelectInput cols={15} rows={15} label='Full' current={current} setCols={setCols} setRows={setRows} setCurrent={setCurrent} />
        <SizeSelectInput cols={customCols} rows={customRows} label='Custom' current={current} setCols={(n) => { setCols(n); setCustomCols(n); }} setRows={(n) => { setRows(n); setCustomRows(n); }} setCurrent={setCurrent} />
      </div>
      {current === 'Custom' && errorMsg ?
        <p css={{ color: 'var(--error)' }}>{errorMsg}</p>
        : ''}
      <input type='submit' value='Create New Puzzle' disabled={current === 'Custom' && errorMsg !== ''} />
    </form>
  </>;
};

export const Builder = (props: BuilderProps & AuthProps): JSX.Element => {
  const [state, dispatch] = useReducer(builderReducer, props, initializeState);

  const [autofilledGrid, setAutofilledGrid] = useState<string[]>([]);
  const [autofillInProgress, setAutofillInProgress] = useState(false);

  // TODO should we actually disable autofill? Right now it just turns off display
  const [autofillEnabled, setAutofillEnabled] = useState(true);

  // We need a ref to the current grid so we can verify it in worker.onmessage
  const currentCells = useRef(state.grid.cells);
  const runAutofill = useCallback(() => {
    if (!WordDB.wordDB) {
      throw new Error('missing db!');
    }
    currentCells.current = state.grid.cells;
    setAutofilledGrid([]);
    if (!worker) {
      console.log('initializing worker');
      worker = new AutofillWorker();
      worker.onmessage = e => {
        const data = e.data as WorkerMessage;
        if (isAutofillResultMessage(data)) {
          if (currentCells.current.every((c, i) => c === data.input[i])) {
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
      height: state.grid.height
    };
    setAutofillInProgress(true);
    worker.postMessage(autofill);
  }, [state.grid]);
  useEffect(() => { runAutofill(); }, [runAutofill]);

  useEffect(() => {
    const inProgress: PuzzleInProgressT = {
      width: state.grid.width,
      height: state.grid.height,
      grid: state.grid.cells,
      highlight: state.grid.highlight,
      highlighted: Array.from(state.grid.highlighted),
      clues: state.clues,
      title: state.title
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(inProgress));
  }, [state.clues, state.grid.cells, state.grid.width, state.grid.height,
    state.grid.highlight, state.grid.highlighted, state.title]);

  const [clueMode, setClueMode] = useState(false);
  if (clueMode) {
    return <ClueMode dispatch={dispatch} title={state.title} clues={state.clues} completedEntries={state.grid.entries.filter(e => e.completedWord)} exitClueMode={() => setClueMode(false)} />;
  }
  return <GridMode runAutofill={runAutofill} user={props.user} isAdmin={props.isAdmin} autofillEnabled={autofillEnabled} setAutofillEnabled={setAutofillEnabled} autofilledGrid={autofilledGrid} autofillInProgress={autofillInProgress} state={state} dispatch={dispatch} setClueMode={setClueMode} />;
};

/* Returns the index within a word string of the start of the `active` cell,
 * if that word were used as fill for `entry`. */
const activeIndex = (grid: BuilderGrid, active: Position, entry: ViewableEntry): number => {
  let j = -1;
  for (let i = 0; i <= entry.cells.length; i += 1) {
    j += 1;
    if (active.row === entry.cells[i].row && active.col === entry.cells[i].col) {
      return j;
    }
    // add extra for rebus:
    j = j + valAt(grid, entry.cells[i]).length - 1;
  }
  console.error('active not in entry', active, entry);
  throw new Error('active not in entry');
};

const lettersAtIndex = (fill: Array<[string, number]>, index: number): string => {
  let seen = '';
  for (const [word] of fill) {
    if (seen.indexOf(word[index]) === -1) {
      seen += word[index];
    }
  }
  return seen;
};

const potentialFill = (entry: ViewableEntry, grid: BuilderGrid): Array<[string, number]> => {
  let pattern = '';
  const crosses = getCrosses(grid, entry);
  for (let index = 0; index < entry.cells.length; index += 1) {
    const cell = entry.cells[index];
    const val = valAt(grid, cell);
    const cross = crosses[index];
    // If complete, remove any cells whose crosses aren't complete and show that
    if (entry.completedWord &&
      val.length === 1 &&
      cross.entryIndex !== null &&
      !grid.entries[cross.entryIndex].completedWord) {
      pattern += ' ';
    } else {
      pattern += val;
    }
  }
  const successLetters = new Array<string>(entry.cells.length).fill('');
  const failLetters = new Array<string>(entry.cells.length).fill('');
  const matches = WordDB.matchingWords(pattern.length, WordDB.matchingBitmap(pattern));
  return matches.filter(([word]) => {
    let j = -1;
    for (let i = 0; i < entry.cells.length; i += 1) {
      j += 1;
      const cell = valAt(grid, entry.cells[i]);
      if (cell.length > 1) {
        // Handle rebuses
        j += cell.length - 1;
        continue;
      }
      if (!entry.completedWord && cell !== ' ') {
        continue;
      }
      const letter = word[j];
      if (successLetters[i].indexOf(letter) !== -1) {
        continue;
      }
      if (failLetters[i].indexOf(letter) !== -1) {
        return false;
      }
      const crossIndex = crosses[i].entryIndex;
      if (crossIndex === null) {
        successLetters[i] += letter;
        continue;
      }
      const cross = grid.entries[crossIndex];
      if (cross.completedWord) {
        successLetters[i] += letter;
        continue;
      }

      let crossPattern = '';
      for (const crossCell of cross.cells) {
        if (crossCell.row === entry.cells[i].row && crossCell.col === entry.cells[i].col) {
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

interface GridModeProps {
  user: firebase.User,
  isAdmin: boolean,
  runAutofill: () => void,
  autofillEnabled: boolean,
  setAutofillEnabled: (val: boolean) => void,
  autofilledGrid: string[],
  autofillInProgress: boolean,
  state: BuilderState,
  dispatch: Dispatch<PuzzleAction>,
  setClueMode: (val: boolean) => void,
}
const GridMode = ({ runAutofill, state, dispatch, setClueMode, ...props }: GridModeProps) => {
  const [muted, setMuted] = usePersistedBoolean('muted', false);

  const gridRef = useRef<HTMLDivElement | null>(null);

  const physicalKeyboardHandler = useCallback((e: KeyboardEvent) => {
    if (e.metaKey || e.altKey || e.ctrlKey) {
      return;  // This way you can still do apple-R and such
    }
    if (e.key === 'Enter') {
      runAutofill();
      return;
    }
    const kpa: KeypressAction = { type: 'KEYPRESS', key: e.key, shift: e.shiftKey };
    dispatch(kpa);
    e.preventDefault();
  }, [dispatch, runAutofill]);
  useEventListener('keydown', physicalKeyboardHandler, gridRef.current || undefined);

  const fillLists = useMemo(() => {
    let left = <></>;
    let right = <></>;
    let tiny = <></>;
    const [entry, cross] = entryAndCrossAtPosition(state.grid, state.active);
    let crossMatches = cross && potentialFill(cross, state.grid);
    let entryMatches = entry && potentialFill(entry, state.grid);

    if (crossMatches !== null && entryMatches !== null && entry !== null && cross !== null) {
      /* If we have both entry + cross we now filter for only matches that'd work for both. */
      const entryActiveIndex = activeIndex(state.grid, state.active, entry);
      const crossActiveIndex = activeIndex(state.grid, state.active, cross);
      const entryValidLetters = lettersAtIndex(entryMatches, entryActiveIndex);
      const crossValidLetters = lettersAtIndex(crossMatches, crossActiveIndex);
      const validLetters = (entryValidLetters.match(new RegExp('[' + crossValidLetters + ']', 'g')) || []).join('');
      entryMatches = entryMatches.filter(([word]) => validLetters.indexOf(word[entryActiveIndex]) !== -1);
      crossMatches = crossMatches.filter(([word]) => validLetters.indexOf(word[crossActiveIndex]) !== -1);
    }

    if (cross && crossMatches !== null) {
      if (cross.direction === Direction.Across) {
        left = <PotentialFillList header="Across" values={crossMatches} entryIndex={cross.index} dispatch={dispatch} />;
      } else {
        right = <PotentialFillList header="Down" values={crossMatches} entryIndex={cross.index} dispatch={dispatch} />;
      }
    }
    if (entry && entryMatches !== null) {
      tiny = <PotentialFillList values={entryMatches} entryIndex={entry.index} dispatch={dispatch} />;
      if (entry.direction === Direction.Across) {
        left = <PotentialFillList header="Across" values={entryMatches} entryIndex={entry.index} dispatch={dispatch} />;
      } else {
        right = <PotentialFillList header="Down" values={entryMatches} entryIndex={entry.index} dispatch={dispatch} />;
      }
    }
    return { left, right, tiny };
  }, [state.grid, state.active, dispatch]);

  const { autofillEnabled, setAutofillEnabled } = props;
  const toggleAutofillEnabled = useCallback(() => {
    if (autofillEnabled) {
      // Show toast for disabling
      toast(<div>Autofill Disabled</div>,
        {
          className: 'snack-bar',
          position: 'bottom-left',
          autoClose: 4000,
          closeButton: false,
          hideProgressBar: true,
          closeOnClick: true,
          pauseOnHover: false,
          draggable: true,
          progress: undefined,
          transition: Slide
        });
    }
    setAutofillEnabled(!autofillEnabled);
  }, [autofillEnabled, setAutofillEnabled]);

  const stats = useMemo(() => {
    let totalLength = 0;
    const lengthHistogram: Array<number> = new Array(Math.max(state.grid.width, state.grid.height) - 1).fill(0);
    const lengthHistogramNames = lengthHistogram.map((_, i) => (i + 2).toString());

    state.grid.entries.forEach((e) => { totalLength += e.cells.length; lengthHistogram[e.cells.length - 2] += 1; });
    const numEntries = state.grid.entries.length;
    const averageLength = totalLength / numEntries;
    const lettersHistogram: Array<number> = new Array(26).fill(0);
    const lettersHistogramNames = lettersHistogram.map((_, i) => String.fromCharCode(i + 65));
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
    return { numBlocks, numTotal, lengthHistogram, lengthHistogramNames, numEntries, averageLength, lettersHistogram, lettersHistogramNames };
  }, [state.grid.entries, state.grid.height, state.grid.width, state.grid.cells]);

  const keyboardHandler = useCallback((key: string) => {
    const kpa: KeypressAction = { type: 'KEYPRESS', key: key, shift: false };
    dispatch(kpa);
  }, [dispatch]);

  const topBar = useMemo(() => {
    let autofillIcon = <SpinnerDisabled />;
    let autofillText = 'Autofill disabled';
    if (props.autofillEnabled) {
      if (props.autofillInProgress) {
        autofillIcon = <SpinnerWorking />;
        autofillText = 'Autofill in progress';
      } else if (props.autofilledGrid.length) {
        autofillIcon = <SpinnerFinished />;
        autofillText = 'Autofill complete';
      } else {
        autofillIcon = <SpinnerFailed />;
        autofillText = 'Couldn\'t autofill this grid';
      }
    }
    return <TopBar>
      <TopBarLink icon={autofillIcon} text="Autofill" hoverText={autofillText} onClick={toggleAutofillEnabled} />
      <TopBarLink icon={<FaListOl />} text="Clues" onClick={() => setClueMode(true)} />
      <TopBarLink icon={<FaRegNewspaper />} text="Publish" onClick={() => {
        const a: PublishAction = { type: 'PUBLISH', publishTimestamp: TimestampClass.now() };
        dispatch(a);
      }} />
      <TopBarDropDown icon={<FaEllipsisH />} text="More">
        {(closeDropdown) => <>
          <NestedDropDown closeParent={closeDropdown} icon={<FaRegPlusSquare />} text="New Puzzle">
            {() => <NewPuzzleForm dispatch={dispatch} />}
          </NestedDropDown>
          <NestedDropDown closeParent={closeDropdown} icon={<IoMdStats />} text="Stats">
            {() => <>
              <h2>Grid</h2>
              <div>{state.gridIsComplete ? <FaRegCheckCircle /> : <FaRegCircle />} All cells should be filled</div>
              <div>{state.hasNoShortWords ? <FaRegCheckCircle /> : <FaRegCircle />} All words should be at least three letters</div>
              <div>{state.repeats.size > 0 ? <><FaRegCircle /> ({Array.from(state.repeats).sort().join(', ')})</> : <FaRegCheckCircle />} No words should be repeated</div>
              <h2 css={{ marginTop: '1.5em' }}>Fill</h2>
              <div>Number of words: {stats.numEntries}</div>
              <div>Mean word length: {stats.averageLength.toPrecision(3)}</div>
              <div>Number of blocks: {stats.numBlocks} ({(100 * stats.numBlocks / stats.numTotal).toFixed(1)}%)</div>
              <div css={{ marginTop: '1em', textDecoration: 'underline', textAlign: 'center' }}>Word Lengths</div>
              <Histogram data={stats.lengthHistogram} names={stats.lengthHistogramNames} />
              <div css={{ marginTop: '1em', textDecoration: 'underline', textAlign: 'center' }}>Letter Counts</div>
              <Histogram data={stats.lettersHistogram} names={stats.lettersHistogramNames} />
            </>
            }
          </NestedDropDown>
          <NestedDropDown closeParent={closeDropdown} icon={<SymmetryIcon type={state.symmetry} />} text="Change Symmetry">
            {() => <>
              <TopBarDropDownLink icon={<SymmetryRotational />} text="Use Rotational Symmetry" onClick={() => {
                const a: SymmetryAction = { type: 'CHANGESYMMETRY', symmetry: Symmetry.Rotational };
                dispatch(a);
              }} />
              <TopBarDropDownLink icon={<SymmetryHorizontal />} text="Use Horizontal Symmetry" onClick={() => {
                const a: SymmetryAction = { type: 'CHANGESYMMETRY', symmetry: Symmetry.Horizontal };
                dispatch(a);
              }} />
              <TopBarDropDownLink icon={<SymmetryVertical />} text="Use Vertical Symmetry" onClick={() => {
                const a: SymmetryAction = { type: 'CHANGESYMMETRY', symmetry: Symmetry.Vertical };
                dispatch(a);
              }} />
              <TopBarDropDownLink icon={<SymmetryNone />} text="Use No Symmetry" onClick={() => {
                const a: SymmetryAction = { type: 'CHANGESYMMETRY', symmetry: Symmetry.None };
                dispatch(a);
              }} />
              {state.grid.width === state.grid.height ?
                <>
                  <TopBarDropDownLink icon={<SymmetryIcon type={Symmetry.DiagonalNESW} />} text="Use NE/SW Diagonal Symmetry" onClick={() => {
                    const a: SymmetryAction = { type: 'CHANGESYMMETRY', symmetry: Symmetry.DiagonalNESW };
                    dispatch(a);
                  }} />
                  <TopBarDropDownLink icon={<SymmetryIcon type={Symmetry.DiagonalNWSE} />} text="Use NW/SE Diagonal Symmetry" onClick={() => {
                    const a: SymmetryAction = { type: 'CHANGESYMMETRY', symmetry: Symmetry.DiagonalNWSE };
                    dispatch(a);
                  }} />
                </>
                : ''}
            </>
            }
          </NestedDropDown>
          <TopBarDropDownLink icon={<FaSquare />} text="Toggle Block" shortcutHint={<PeriodKey />} onClick={() => {
            const a: KeypressAction = { type: 'KEYPRESS', key: '.', shift: false };
            dispatch(a);
          }} />
          <TopBarDropDownLink icon={<Rebus />} text="Enter Rebus" shortcutHint={<EscapeKey />} onClick={() => {
            const a: KeypressAction = { type: 'KEYPRESS', key: 'Escape', shift: false };
            dispatch(a);
          }} />
          <TopBarDropDownLink icon={state.grid.highlight === 'circle' ? <FaRegCircle /> : <FaFillDrip />} text="Toggle Square Highlight" shortcutHint={<BacktickKey />} onClick={() => {
            const a: KeypressAction = { type: 'KEYPRESS', key: '`', shift: false };
            dispatch(a);
          }} />
          <TopBarDropDownLink icon={state.grid.highlight === 'circle' ? <FaFillDrip /> : <FaRegCircle />} text={state.grid.highlight === 'circle' ? 'Use Shade for Highlights' : 'Use Circle for Highlights'} onClick={() => {
            const a: SetHighlightAction = { type: 'SETHIGHLIGHT', highlight: state.grid.highlight === 'circle' ? 'shade' : 'circle' };
            dispatch(a);
          }} />
          <TopBarDropDownLink icon={<MdRefresh />} text='Rerun Autofiller' shortcutHint={<EnterKey />} onClick={() => {
            runAutofill();
          }} />
          {
            muted ?
              <TopBarDropDownLink icon={<FaVolumeUp />} text="Unmute" onClick={() => setMuted(false)} />
              :
              <TopBarDropDownLink icon={<FaVolumeMute />} text="Mute" onClick={() => setMuted(true)} />
          }
          {
            props.isAdmin ?
              <>
                <TopBarDropDownLinkA href='/admin' icon={<FaUserLock />} text="Admin" />
              </>
              :
              ''
          }
          <TopBarDropDownLinkA href='/account' icon={<FaUser />} text="Account" />
        </>
        }
      </TopBarDropDown>
    </TopBar >;
  }, [props.autofillEnabled, props.autofillInProgress, props.autofilledGrid.length, stats, props.isAdmin, setClueMode, setMuted, state.grid.highlight, state.grid.width, state.grid.height, state.gridIsComplete, state.hasNoShortWords, state.repeats, state.symmetry, toggleAutofillEnabled, runAutofill, dispatch, muted]);

  return (
    <>
      {topBar}
      {state.toPublish ?
        <PublishOverlay toPublish={state.toPublish} user={props.user} cancelPublish={() => dispatch({ type: 'CANCELPUBLISH' })} /> : ''}
      {state.isEnteringRebus ?
        <RebusOverlay dispatch={dispatch} value={state.rebusValue} /> : ''}
      {state.publishErrors.length ?
        <Overlay closeCallback={() => dispatch({ type: 'CLEARPUBLISHERRORS' })}>
          <>
            <div>Please fix the following errors and try publishing again:</div>
            <ul>
              {state.publishErrors.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </>
        </Overlay> : ''}
      <SquareAndCols
        ref={gridRef}
        muted={muted}
        keyboardHandler={keyboardHandler}
        showExtraKeyLayout={state.showExtraKeyLayout}
        includeBlockKey={true}
        aspectRatio={state.grid.width / state.grid.height}
        square={
          (width: number, _height: number) => {
            return <GridView
              squareWidth={width}
              grid={state.grid}
              active={state.active}
              dispatch={dispatch}
              allowBlockEditing={true}
              autofill={props.autofillEnabled ? props.autofilledGrid : []}
            />;
          }
        }
        left={fillLists.left}
        right={fillLists.right}
        tinyColumn={<TinyNav dispatch={dispatch}>{fillLists.tiny}</TinyNav>}
      />
    </>
  );
};
