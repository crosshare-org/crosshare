import {
  useState, useReducer, useRef, useEffect, useCallback, useMemo,
  Dispatch, KeyboardEvent, MouseEvent
} from 'react';

import Link from 'next/link';
import Router from 'next/router';
import { isMobile, isTablet, isIPad13 } from "react-device-detect";
import {
  FaRegNewspaper, FaUser, FaListOl, FaRegCircle, FaRegCheckCircle, FaTabletAlt,
  FaKeyboard, FaEllipsisH, FaVolumeUp, FaVolumeMute, FaFillDrip, FaUserLock
} from 'react-icons/fa';
import { IoMdStats } from 'react-icons/io';
import useEventListener from '@use-it/event-listener';
import { FixedSizeList as List } from "react-window";

import AutoSizer from "./AutoSizer";
import {
  Rebus, SpinnerWorking, SpinnerFinished, SpinnerFailed, SpinnerDisabled,
  SymmetryIcon, SymmetryRotational, SymmetryVertical, SymmetryHorizontal, SymmetryNone,
  EscapeKey, BacktickKey
} from './Icons';
import { AuthProps } from './AuthContext';
import { App, TimestampClass } from '../lib/firebaseWrapper';
import { GridView } from './Grid';
import { getCrosses, valAt, entryAndCrossAtPosition } from '../lib/gridBase';
import { fromCells, getClueMap } from '../lib/viewableGrid';
import { TimestampedPuzzleT, AuthoredPuzzleT, AuthoredPuzzlesV } from '../lib/dbtypes'
import { updateInCache } from '../lib/dbUtils';
import { Direction, PuzzleT } from '../lib/types';
import {
  Symmetry, BuilderState, BuilderEntry, builderReducer, validateGrid,
  KeypressAction, SetClueAction, SymmetryAction, ClickedFillAction, PuzzleAction,
  SetTitleAction, SetHighlightAction, PublishAction
} from '../reducers/reducer';
import { TopBarLink, TopBar, TopBarDropDownLink, TopBarDropDown } from './TopBar';
import { SquareAndCols, TinyNav } from './Page';
import { RebusOverlay } from './Puzzle';
import AutofillWorker from 'worker-loader?name=static/[hash].worker.js!../lib/autofill.worker';
import { isAutofillCompleteMessage, isAutofillResultMessage, WorkerMessage, LoadDBMessage, AutofillMessage } from '../lib/types';
import * as WordDB from '../lib/WordDB';
import { Overlay } from './Overlay';
import { usePersistedBoolean } from '../lib/hooks';
import { buttonAsLink } from '../lib/style';

let worker: Worker;

type WithOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
type BuilderProps = WithOptional<Omit<PuzzleT, "comments" | "category" | "authorId" | "authorName" | "moderated" | "publishTime">, "clues" | "title" | "highlighted" | "highlight">

export const BuilderDBLoader = (props: BuilderProps & AuthProps) => {
  const [ready, setReady] = useState(false);
  WordDB.initializeOrBuild(setReady);
  if (ready) {
    return <Builder {...props} />;
  }
  return <div>Loading word database...</div>
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
    <div css={{
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
    </div>
  );
}

interface PotentialFillListProps {
  isGoodSuggestion: (entryIndex: number, word: string) => boolean,
  header?: string,
  entryIndex: number,
  values: Array<[string, number]>,
  dispatch: Dispatch<ClickedFillAction>,
}
const PotentialFillList = (props: PotentialFillListProps) => {
  const listRef = useRef<List>(null);
  useEffect(() => {
    if (listRef.current !== null) {
      listRef.current.scrollToItem(0);
    }
  }, [props.entryIndex, props.values]);
  return (
    <div css={{
      height: "100% !important",
      position: 'relative',
    }}>{props.header ?
      <div css={{
        fontWeight: 'bold',
        borderBottom: '1px solid #AAA',
        height: '1.5em',
        paddingLeft: '0.5em',
      }}>{props.header}</div> : ""}
      <div css={{
        height: props.header ? 'calc(100% - 1.5em)' : '100%',
      }}>
        <AutoSizer>
          {({ height, width }) => {
            return (<List
              ref={listRef}
              height={height}
              itemCount={props.values.length}
              itemSize={35}
              width={width}
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
              )}</List>)
          }}
        </AutoSizer>
      </div>
    </div>
  );
}

const ClueRow = (props: { dispatch: Dispatch<PuzzleAction>, entry: BuilderEntry, clues: Map<string, string> }) => {
  if (props.entry.completedWord === null) {
    throw new Error("shouldn't ever get here");
  }
  return (
    <tr>
      <td css={{
        paddingRight: '1em',
        paddingBottom: '1em',
        textAlign: 'right',
      }}>{props.entry.completedWord}</td>
      <td css={{ paddingBottom: '1em' }}><input placeholder="Enter a clue" value={props.clues.get(props.entry.completedWord) || ""} onChange={(e) => {
        const sca: SetClueAction = { type: "SETCLUE", word: props.entry.completedWord || "", clue: e.target.value };
        props.dispatch(sca);
      }} /></td>
    </tr>
  );
}

interface ClueModeProps {
  title: string | null,
  exitClueMode: () => void,
  completedEntries: Array<BuilderEntry>,
  clues: Map<string, string>,
  dispatch: Dispatch<PuzzleAction>,
}
const ClueMode = (props: ClueModeProps) => {
  const topbar = (
    <>
      <TopBarLink icon={<SpinnerFinished />} text="Back to Grid" onClick={props.exitClueMode} />
    </>
  );
  const clueRows = props.completedEntries.map(e => <ClueRow key={e.completedWord || ""} dispatch={props.dispatch} entry={e} clues={props.clues} />);
  return (
    <>
      {topbar}
      <div css={{ padding: '1em' }}>
        <h4>Title</h4>
        <input placeholder="Give your puzzle a title" value={props.title || ""} onChange={(e) => {
          const sta: SetTitleAction = { type: "SETTITLE", value: e.target.value };
          props.dispatch(sta);
        }} />
        <h4>Clues</h4>
        {props.completedEntries.length ?
          <table css={{ margin: 'auto', }}>
            <tbody>
              {clueRows}
            </tbody>
          </table>
          :
          <>
            <p>This where you come to set clues for your puzzle, but you don't have any completed fill words yet!</p>
            <p>Go back to <button css={buttonAsLink} onClick={(e) => { props.exitClueMode(); e.preventDefault(); }}>the grid</button> and fill in one or more words completely. Then come back here and make some clues.</p>
          </>
        }
      </div>
    </>
  )
}

export const Builder = (props: BuilderProps & AuthProps) => {
  const initialGrid = fromCells({
    mapper: (e) => e,
    width: props.size.cols,
    height: props.size.rows,
    cells: props.grid,
    allowBlockEditing: true,
    highlighted: new Set(props.highlighted),
    highlight: props.highlight || "circle",
  });
  const [state, dispatch] = useReducer(builderReducer, {
    type: 'builder',
    title: props.title || null,
    active: { col: 0, row: 0, dir: Direction.Across },
    grid: initialGrid,
    showKeyboard: isMobile || isIPad13,
    isTablet: isTablet || isIPad13,
    showExtraKeyLayout: false,
    isEnteringRebus: false,
    rebusValue: '',
    gridIsComplete: false,
    repeats: new Set<string>(),
    hasNoShortWords: false,
    isEditable: () => true,
    symmetry: Symmetry.Rotational,
    clues: getClueMap(initialGrid, props.clues || []),
    publishErrors: [],
    toPublish: null,
    authorId: props.user.uid,
    authorName: props.user.displayName || "Anonymous",
    postEdit(_cellIndex) {
      return validateGrid(this);
    }
  }, validateGrid);

  const [autofilledGrid, setAutofilledGrid] = useState<string[]>([]);
  const [autofillInProgress, setAutofillInProgress] = useState(false);

  // TODO should we actually disable autofill? Right now it just turns off display
  const [autofillEnabled, setAutofillEnabled] = useState(true);

  // We need a ref to the current grid so we can verify it in worker.onmessage
  const currentCells = useRef(state.grid.cells);
  useEffect(() => {
    if (!WordDB.dbEncoded) {
      throw new Error("missing db!");
    }
    currentCells.current = state.grid.cells;
    setAutofilledGrid([]);
    if (!worker) {
      console.log("initializing worker");
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
          console.error("unhandled msg in builder: ", e.data);
        }
      };
      let loaddb: LoadDBMessage = { type: 'loaddb', db: WordDB.dbEncoded };
      worker.postMessage(loaddb);
    }
    let autofill: AutofillMessage = {
      type: 'autofill',
      grid: state.grid.cells,
      width: state.grid.width,
      height: state.grid.height
    };
    setAutofillInProgress(true);
    worker.postMessage(autofill);
  }, [state.grid.cells, state.grid.width, state.grid.height]);

  const [clueMode, setClueMode] = useState(false);
  if (clueMode) {
    return <ClueMode dispatch={dispatch} title={state.title} clues={state.clues} completedEntries={state.grid.entries.filter(e => e.completedWord)} exitClueMode={() => setClueMode(false)} />
  }
  return <GridMode user={props.user} isAdmin={props.isAdmin} autofillEnabled={autofillEnabled} setAutofillEnabled={setAutofillEnabled} autofilledGrid={autofilledGrid} autofillInProgress={autofillInProgress} state={state} dispatch={dispatch} setClueMode={setClueMode} />
}

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
  const [muted, setMuted] = usePersistedBoolean("muted", false);

  const physicalKeyboardHandler = useCallback((e: KeyboardEvent) => {
    if (e.metaKey || e.altKey || e.ctrlKey) {
      return;  // This way you can still do apple-R and such
    }
    const kpa: KeypressAction = { type: "KEYPRESS", key: e.key, shift: e.shiftKey };
    dispatch(kpa);
    e.preventDefault();
  }, [dispatch]);
  useEventListener('keydown', physicalKeyboardHandler);

  let left = <></>;
  let right = <></>;
  let tiny = <></>;
  const doCrossesWork = useCallback((entryIndex: number, word: string) => {
    let successFailureEntries = new Map<number, Map<number, [string, string]>>();
    const entry = state.grid.entries[entryIndex];
    let successFailure = successFailureEntries.get(entryIndex);
    if (successFailure === undefined) {
      successFailure = new Map<number, [string, string]>();
      successFailureEntries.set(entryIndex, successFailure);
    }
    const crosses = getCrosses(state.grid, entry)
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
        crossSuccessFailure = ["", ""];
      }
      const [succeeding, failing] = crossSuccessFailure;
      if (failing.indexOf(word[j]) !== -1) {
        return false;
      }
      if (succeeding.indexOf(word[j]) !== -1) {
        continue;
      }
      let crossPattern = '';
      for (let crossCell of cross.cells) {
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
  for (let entry of entryAndCrossAtPosition(state.grid, state.active)) {
    if (entry !== null) {
      let matches: Array<[string, number]>;
      let pattern = "";
      let crosses = getCrosses(state.grid, entry);
      for (let index = 0; index < entry.cells.length; index += 1) {
        const cell = entry.cells[index];
        const val = valAt(state.grid, cell);
        const cross = crosses[index];
        // If complete, remove any cells whose crosses aren't complete and show that
        if (entry.completedWord &&
          val.length === 1 &&
          cross.entryIndex !== null &&
          !state.grid.entries[cross.entryIndex].completedWord) {
          pattern += " ";
        } else {
          pattern += val;
        }
      }
      matches = WordDB.matchingWords(pattern.length, WordDB.matchingBitmap(pattern));
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
    console.log("Uploading");
    console.log(dbpuzzle);
    const db = App.firestore();
    db.collection("c").add(dbpuzzle).then(async (ref) => {
      console.log("Uploaded", ref.id);

      const authoredPuzzle: AuthoredPuzzleT = [dbpuzzle.ca, dbpuzzle.t];
      await updateInCache({
        collection: 'uc',
        docId: props.user.uid,
        update: { [ref.id]: authoredPuzzle },
        validator: AuthoredPuzzlesV,
        sendToDB: true
      });

      const forStorage: TimestampedPuzzleT = { downloadedAt: TimestampClass.now(), data: dbpuzzle }
      sessionStorage.setItem('c/' + ref.id, JSON.stringify(forStorage));
      Router.push("/preview/" + ref.id);
    });
  }, [state.toPublish, props.user.uid]);

  const keyboardHandler = useCallback((key: string) => {
    const kpa: KeypressAction = { type: "KEYPRESS", key: key, shift: false };
    dispatch(kpa);
  }, [dispatch]);

  const topBar = useMemo(() => {
    let autofillIcon = <SpinnerDisabled />;
    let autofillText = "Autofill disabled";
    if (props.autofillEnabled) {
      if (props.autofillInProgress) {
        autofillIcon = <SpinnerWorking />;
        autofillText = "Autofill in progress";
      } else if (props.autofilledGrid.length) {
        autofillIcon = <SpinnerFinished />;
        autofillText = "Autofill complete";
      } else {
        autofillIcon = <SpinnerFailed />;
        autofillText = "Couldn't autofill this grid";
      }
    }
    return <TopBar>
      <TopBarLink icon={autofillIcon} text="Autofill" hoverText={autofillText} onClick={toggleAutofillEnabled} />
      <TopBarLink icon={<FaListOl />} text="Clues" onClick={() => setClueMode(true)} />
      <TopBarDropDown icon={<IoMdStats />} text="Stats">
        <h4>Grid status</h4>
        <div>{state.gridIsComplete ? <FaRegCheckCircle /> : <FaRegCircle />} All cells should be filled</div>
        <div>{state.hasNoShortWords ? <FaRegCheckCircle /> : <FaRegCircle />} All words should be at least three letters</div>
        <div>{state.repeats.size > 0 ? <><FaRegCircle /> ({Array.from(state.repeats).sort().join(", ")})</> : <FaRegCheckCircle />} No words should be repeated</div>
        <h4>Fill</h4>
        <div>Number of words: {numEntries}</div>
        <div>Mean word length: {averageLength.toPrecision(3)}</div>
      </TopBarDropDown>
      <TopBarDropDown icon={<SymmetryIcon type={state.symmetry} />} text="Symmetry">
        <TopBarDropDownLink icon={<SymmetryRotational />} text="Rotational Symmetry" onClick={() => {
          const a: SymmetryAction = { type: "CHANGESYMMETRY", symmetry: Symmetry.Rotational };
          dispatch(a);
        }} />
        <TopBarDropDownLink icon={<SymmetryHorizontal />} text="Horizontal Symmetry" onClick={() => {
          const a: SymmetryAction = { type: "CHANGESYMMETRY", symmetry: Symmetry.Horizontal };
          dispatch(a);
        }} />
        <TopBarDropDownLink icon={<SymmetryVertical />} text="Vertical Symmetry" onClick={() => {
          const a: SymmetryAction = { type: "CHANGESYMMETRY", symmetry: Symmetry.Vertical };
          dispatch(a);
        }} />
        <TopBarDropDownLink icon={<SymmetryNone />} text="No Symmetry" onClick={() => {
          const a: SymmetryAction = { type: "CHANGESYMMETRY", symmetry: Symmetry.None };
          dispatch(a);
        }} />
      </TopBarDropDown>
      <TopBarDropDown icon={<FaEllipsisH />} text="More">
        <TopBarDropDownLink icon={<FaRegNewspaper />} text="Publish Puzzle" onClick={() => {
          const a: PublishAction = { type: 'PUBLISH', publishTimestamp: TimestampClass.now() };
          dispatch(a);
        }} />
        <TopBarDropDownLink icon={<Rebus />} text="Enter Rebus" shortcutHint={<EscapeKey />} onClick={() => {
          const a: KeypressAction = { type: "KEYPRESS", key: 'Escape', shift: false };
          dispatch(a);
        }} />
        <TopBarDropDownLink icon={state.grid.highlight === "circle" ? <FaRegCircle /> : <FaFillDrip />} text="Toggle Square Highlight" shortcutHint={<BacktickKey />} onClick={() => {
          const a: KeypressAction = { type: "KEYPRESS", key: '`', shift: false };
          dispatch(a);
        }} />
        <TopBarDropDownLink icon={state.grid.highlight === "circle" ? <FaFillDrip /> : <FaRegCircle />} text={state.grid.highlight === "circle" ? "Use Shade for Highlights" : "Use Circle for Highlights"} onClick={() => {
          const a: SetHighlightAction = { type: "SETHIGHLIGHT", highlight: state.grid.highlight === "circle" ? "shade" : "circle" };
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
              <TopBarDropDownLink icon={<FaKeyboard />} text="Toggle Keyboard" onClick={() => dispatch({ type: "TOGGLEKEYBOARD" })} />
              <TopBarDropDownLink icon={<FaTabletAlt />} text="Toggle Tablet" onClick={() => dispatch({ type: "TOGGLETABLET" })} />
              <Link href='/admin'><TopBarDropDownLink icon={<FaUserLock />} text="Admin" /></Link>
            </>
            :
            ""
        }
        <Link href='/account'><TopBarDropDownLink icon={<FaUser />} text="Account" /></Link>
      </TopBarDropDown>
    </TopBar>
  }, [props.autofillEnabled, props.autofillInProgress, props.autofilledGrid.length, averageLength, dispatch, muted, numEntries, props.isAdmin, setClueMode, setMuted, state.grid.highlight, state.gridIsComplete, state.hasNoShortWords, state.repeats, state.symmetry, toggleAutofillEnabled]);

  return (
    <>
      {topBar}

      {state.isEnteringRebus ?
        <RebusOverlay showingKeyboard={state.showKeyboard} dispatch={dispatch} value={state.rebusValue} /> : ""}
      {state.publishErrors.length ?
        <Overlay showingKeyboard={false} closeCallback={() => dispatch({ type: "CLEARPUBLISHERRORS" })}>
          <>
            <div>Please fix the following errors and try publishing again:</div>
            <ul>
              {state.publishErrors.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </>
        </Overlay> : ""}
      <SquareAndCols
        muted={muted}
        showKeyboard={state.showKeyboard}
        keyboardHandler={keyboardHandler}
        showExtraKeyLayout={state.showExtraKeyLayout}
        isTablet={state.isTablet}
        includeBlockKey={true}
        square={
          (size: number) => {
            return <GridView
              squareSize={size}
              showingKeyboard={state.showKeyboard}
              grid={state.grid}
              active={state.active}
              dispatch={dispatch}
              allowBlockEditing={true}
              autofill={props.autofillEnabled ? props.autofilledGrid : []}
            />
          }
        }
        left={left}
        right={right}
        tinyColumn={<TinyNav dispatch={dispatch}>{tiny}</TinyNav>}
      />
    </>
  )
}
