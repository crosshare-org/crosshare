import {
  useState, useReducer, useRef, useEffect, useCallback, useMemo,
  Dispatch, KeyboardEvent, MouseEvent
} from 'react';
import * as t from 'io-ts';
import { isRight } from 'fp-ts/lib/Either';
import { PathReporter } from 'io-ts/lib/PathReporter';
import NextJSRouter from 'next/router';
import {
  FaRegNewspaper, FaUser, FaListOl, FaRegCircle, FaRegCheckCircle,
  FaEllipsisH, FaVolumeUp, FaVolumeMute, FaFillDrip, FaUserLock
} from 'react-icons/fa';
import { IoMdStats } from 'react-icons/io';
import useEventListener from '@use-it/event-listener';
import { FixedSizeList as List } from 'react-window';

import {
  Rebus, SpinnerWorking, SpinnerFinished, SpinnerFailed, SpinnerDisabled, SymmetryIcon,
  SymmetryRotational, SymmetryVertical, SymmetryHorizontal, SymmetryNone,
  EscapeKey, BacktickKey
} from './Icons';
import { AuthProps } from './AuthContext';
import { App, TimestampClass } from '../lib/firebaseWrapper';
import { GridView } from './Grid';
import { getCrosses, valAt, entryAndCrossAtPosition } from '../lib/gridBase';
import { fromCells, getClueMap } from '../lib/viewableGrid';
import { AuthoredPuzzleT, AuthoredPuzzlesV } from '../lib/dbtypes';
import { updateInCache } from '../lib/dbUtils';
import { Direction, PuzzleT, isAutofillCompleteMessage, isAutofillResultMessage, WorkerMessage, LoadDBMessage, AutofillMessage } from '../lib/types';
import {
  Symmetry, BuilderState, builderReducer, validateGrid, KeypressAction,
  SymmetryAction, ClickedFillAction, PuzzleAction, SetHighlightAction, PublishAction
} from '../reducers/reducer';
import { NestedDropDown, TopBarLink, TopBar, TopBarDropDownLink, TopBarDropDownLinkA, TopBarDropDown } from './TopBar';
import { SquareAndCols, TinyNav } from './Page';
import { RebusOverlay } from './Puzzle';
import { ClueMode } from './ClueMode';
// eslint-disable-next-line import/no-unresolved
import AutofillWorker from 'worker-loader?name=static/[hash].worker.js!../lib/autofill.worker';

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
  if (!ready) {
    WordDB.initializeOrBuild(setReady);
  }
  if (ready) {
    return <Builder {...props} />;
  }
  return <div>Loading word database...</div>;
};

interface PotentialFillItemProps {
  isGoodSuggestion: (entryIndex: number, word: string) => boolean,
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
      color: 'var(--text)',
      width: '100%',
      padding: '0.5em 1em',
      cursor: 'pointer',
      '&:hover': {
        backgroundColor: 'var(--clue-bg)',
      },
      alignItems: 'center',
      height: 35,
      fontWeight: props.isGoodSuggestion(props.entryIndex, props.value[0]) ? 'bold' : 'normal',
    }} onClick={click}>
      {props.value[0]}
    </button>
  );
};

interface PotentialFillListProps {
  isGoodSuggestion: (entryIndex: number, word: string) => boolean,
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
                isGoodSuggestion={props.isGoodSuggestion}
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

const STORAGE_KEY = 'puzzleInProgress';

const PuzzleInProgressV = t.type({
  width: t.number,
  height: t.number,
  grid: t.array(t.string),
  highlighted: t.array(t.number),
  highlight: t.keyof({ circle: null, shade: null }),
  title: t.union([t.string, t.null]),
  clues: t.record(t.string, t.string)
});
type PuzzleInProgressT = t.TypeOf<typeof PuzzleInProgressV>;


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

  const initialGrid = fromCells({
    mapper: (e) => e,
    width: saved ?.width || props.size.cols,
    height: saved ?.height || props.size.rows,
    cells: saved ?.grid || props.grid,
    allowBlockEditing: true,
    highlighted: new Set(saved ?.highlighted || props.highlighted),
    highlight: saved ?.highlight || props.highlight || 'circle',
  });
  return validateGrid({
    type: 'builder',
    title: saved ?.title || props.title || null,
    active: { col: 0, row: 0, dir: Direction.Across },
    grid: initialGrid,
    showExtraKeyLayout: false,
    isEnteringRebus: false,
    rebusValue: '',
    gridIsComplete: false,
    repeats: new Set<string>(),
    hasNoShortWords: false,
    isEditable: () => true,
    symmetry: Symmetry.Rotational,
    clues: saved ?.clues || getClueMap(initialGrid, props.clues || []),
    publishErrors: [],
    toPublish: null,
    authorId: props.user.uid,
    authorName: props.user.displayName || 'Anonymous',
    postEdit(_cellIndex) {
      return validateGrid(this);
    }
  });
};

export const Builder = (props: BuilderProps & AuthProps): JSX.Element => {
  const [state, dispatch] = useReducer(builderReducer, props, initializeState);

  const [autofilledGrid, setAutofilledGrid] = useState<string[]>([]);
  const [autofillInProgress, setAutofillInProgress] = useState(false);

  // TODO should we actually disable autofill? Right now it just turns off display
  const [autofillEnabled, setAutofillEnabled] = useState(true);

  // We need a ref to the current grid so we can verify it in worker.onmessage
  const currentCells = useRef(state.grid.cells);
  useEffect(() => {
    if (!WordDB.dbEncoded) {
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
      const loaddb: LoadDBMessage = { type: 'loaddb', db: WordDB.dbEncoded };
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
  return <GridMode user={props.user} isAdmin={props.isAdmin} autofillEnabled={autofillEnabled} setAutofillEnabled={setAutofillEnabled} autofilledGrid={autofilledGrid} autofillInProgress={autofillInProgress} state={state} dispatch={dispatch} setClueMode={setClueMode} />;
};

interface GridModeProps {
  user: firebase.User,
  isAdmin: boolean,
  autofillEnabled: boolean,
  setAutofillEnabled: (val: boolean) => void,
  autofilledGrid: string[],
  autofillInProgress: boolean,
  state: BuilderState,
  dispatch: Dispatch<PuzzleAction>,
  setClueMode: (val: boolean) => void,
}
const GridMode = ({ state, dispatch, setClueMode, ...props }: GridModeProps) => {
  const [muted, setMuted] = usePersistedBoolean('muted', false);

  const physicalKeyboardHandler = useCallback((e: KeyboardEvent) => {
    if (e.metaKey || e.altKey || e.ctrlKey) {
      return;  // This way you can still do apple-R and such
    }
    const kpa: KeypressAction = { type: 'KEYPRESS', key: e.key, shift: e.shiftKey };
    dispatch(kpa);
    e.preventDefault();
  }, [dispatch]);
  useEventListener('keydown', physicalKeyboardHandler);

  let left = <></>;
  let right = <></>;
  let tiny = <></>;
  const doCrossesWork = useCallback((entryIndex: number, word: string) => {
    const successFailureEntries = new Map<number, Map<number, [string, string]>>();
    const entry = state.grid.entries[entryIndex];
    let successFailure = successFailureEntries.get(entryIndex);
    if (successFailure === undefined) {
      successFailure = new Map<number, [string, string]>();
      successFailureEntries.set(entryIndex, successFailure);
    }
    const crosses = getCrosses(state.grid, entry);
    let j = -1;
    for (let i = 0; i < entry.cells.length; i += 1) {
      j += 1;
      const cell = valAt(state.grid, entry.cells[i]);
      if (cell.length > 1) {
        // Handle rebuses
        j += cell.length - 1;
        continue;
      }
      if (!entry.completedWord && cell !== ' ') {
        continue;
      }
      const crossIndex = crosses[i].entryIndex;
      if (crossIndex === null) {
        continue;
      }
      const cross = state.grid.entries[crossIndex];
      if (cross.completedWord) {
        continue;
      }
      let crossSuccessFailure = successFailure.get(i);
      if (crossSuccessFailure === undefined) {
        crossSuccessFailure = ['', ''];
      }
      const [succeeding, failing] = crossSuccessFailure;
      if (failing.indexOf(word[j]) !== -1) {
        return false;
      }
      if (succeeding.indexOf(word[j]) !== -1) {
        continue;
      }
      let crossPattern = '';
      for (const crossCell of cross.cells) {
        if (crossCell.row === entry.cells[i].row && crossCell.col === entry.cells[i].col) {
          crossPattern += word[j];
        } else {
          crossPattern += valAt(state.grid, crossCell);
        }
      }
      const newBitmap = WordDB.matchingBitmap(crossPattern);
      if (newBitmap ?.isZero()) {
        successFailure.set(i, [succeeding, failing + word[j]]);
        return false;
      } else {
        successFailure.set(i, [succeeding + word[j], failing]);
      }
    }
    return true;
  }, [state.grid]);
  for (const entry of entryAndCrossAtPosition(state.grid, state.active)) {
    if (entry !== null) {
      let pattern = '';
      const crosses = getCrosses(state.grid, entry);
      for (let index = 0; index < entry.cells.length; index += 1) {
        const cell = entry.cells[index];
        const val = valAt(state.grid, cell);
        const cross = crosses[index];
        // If complete, remove any cells whose crosses aren't complete and show that
        if (entry.completedWord &&
          val.length === 1 &&
          cross.entryIndex !== null &&
          !state.grid.entries[cross.entryIndex].completedWord) {
          pattern += ' ';
        } else {
          pattern += val;
        }
      }
      const matches: Array<[string, number]> = WordDB.matchingWords(pattern.length, WordDB.matchingBitmap(pattern));
      if (entry.direction === state.active.dir) {
        tiny = <PotentialFillList isGoodSuggestion={doCrossesWork} values={matches} entryIndex={entry.index} dispatch={dispatch} />;
      }
      if (entry.direction === Direction.Across) {
        left = <PotentialFillList isGoodSuggestion={doCrossesWork} header="Across" values={matches} entryIndex={entry.index} dispatch={dispatch} />;
      } else {
        right = <PotentialFillList isGoodSuggestion={doCrossesWork} header="Down" values={matches} entryIndex={entry.index} dispatch={dispatch} />;
      }
    }
  }

  const { autofillEnabled, setAutofillEnabled } = props;
  const toggleAutofillEnabled = useCallback(() => {
    setAutofillEnabled(!autofillEnabled);
  }, [autofillEnabled, setAutofillEnabled]);


  let totalLength = 0;
  state.grid.entries.forEach((e) => totalLength += e.cells.length);
  const numEntries = state.grid.entries.length;
  const averageLength = totalLength / numEntries;

  const publishInProgress = useRef<boolean>(false);
  useEffect(() => {
    if (state.toPublish === null || publishInProgress.current) {
      return;
    }
    const dbpuzzle = state.toPublish;
    publishInProgress.current = true;
    console.log('Uploading');
    console.log(dbpuzzle);
    const db = App.firestore();
    db.collection('c').add(dbpuzzle).then(async (ref) => {
      console.log('Uploaded', ref.id);

      const authoredPuzzle: AuthoredPuzzleT = [dbpuzzle.ca, dbpuzzle.t];
      await updateInCache({
        collection: 'uc',
        docId: props.user.uid,
        update: { [ref.id]: authoredPuzzle },
        validator: AuthoredPuzzlesV,
        sendToDB: true
      });

      localStorage.removeItem(STORAGE_KEY);
      NextJSRouter.push('/pending/' + ref.id);
    });
  }, [state.toPublish, props.user.uid]);

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
      <TopBarLink icon={autofillIcon} hoverText={autofillText} onClick={toggleAutofillEnabled} />
      <TopBarLink icon={<FaListOl />} text="Clues" onClick={() => setClueMode(true)} />
      <TopBarLink icon={<FaRegNewspaper />} text="Publish" onClick={() => {
        const a: PublishAction = { type: 'PUBLISH', publishTimestamp: TimestampClass.now() };
        dispatch(a);
      }} />
      <TopBarDropDown icon={<FaEllipsisH />} text="More">
        {(closeDropdown) => <>
          <NestedDropDown closeParent={closeDropdown} icon={<IoMdStats />} text="Stats">
            {() => <>
              <h4>Grid</h4>
              <div>{state.gridIsComplete ? <FaRegCheckCircle /> : <FaRegCircle />} All cells should be filled</div>
              <div>{state.hasNoShortWords ? <FaRegCheckCircle /> : <FaRegCircle />} All words should be at least three letters</div>
              <div>{state.repeats.size > 0 ? <><FaRegCircle /> ({Array.from(state.repeats).sort().join(', ')})</> : <FaRegCheckCircle />} No words should be repeated</div>
              <h4 css={{ marginTop: '1.5em' }}>Fill</h4>
              <div>Number of words: {numEntries}</div>
              <div>Mean word length: {averageLength.toPrecision(3)}</div>
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
            </>
            }
          </NestedDropDown>
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
  }, [props.autofillEnabled, props.autofillInProgress, props.autofilledGrid.length, averageLength, dispatch, muted, numEntries, props.isAdmin, setClueMode, setMuted, state.grid.highlight, state.gridIsComplete, state.hasNoShortWords, state.repeats, state.symmetry, toggleAutofillEnabled]);

  return (
    <>
      {topBar}

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
        muted={muted}
        keyboardHandler={keyboardHandler}
        showExtraKeyLayout={state.showExtraKeyLayout}
        includeBlockKey={true}
        square={
          (size: number) => {
            return <GridView
              squareSize={size}
              grid={state.grid}
              active={state.active}
              dispatch={dispatch}
              allowBlockEditing={true}
              autofill={props.autofillEnabled ? props.autofilledGrid : []}
            />;
          }
        }
        left={left}
        right={right}
        tinyColumn={<TinyNav dispatch={dispatch}>{tiny}</TinyNav>}
      />
    </>
  );
};
