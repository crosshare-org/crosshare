/** @jsx jsx */
import { jsx } from '@emotion/core';

import * as React from 'react';

import { isMobile, isTablet } from "react-device-detect";
import { FaListOl, FaRegCircle, FaRegCheckCircle, FaTabletAlt, FaKeyboard, FaEllipsisH, } from 'react-icons/fa';
import { IoMdStats } from 'react-icons/io';
import useEventListener from '@use-it/event-listener';
import { Helmet } from "react-helmet-async";
import { FixedSizeList as List } from "react-window";
import AutoSizer from "react-virtualized-auto-sizer";

import {
  Rebus, SpinnerWorking, SpinnerFinished, SpinnerFailed, SpinnerDisabled,
  SymmetryIcon, SymmetryRotational, SymmetryVertical, SymmetryHorizontal, SymmetryNone,
  EscapeKey,
} from './Icons';
import { requiresAdmin } from './App';
import { GridView } from './Grid';
import { getCrosses, valAt, entryAndCrossAtPosition } from './gridBase';
import { fromCells, getClueMap } from './viewableGrid';
import { PosAndDir, Direction, PuzzleJson } from './types';
import {
  Symmetry, BuilderState, BuilderEntry, builderReducer, validateGrid,
  KeypressAction, SetClueAction, SymmetryAction, ClickedFillAction, PuzzleAction,
  SetTitleAction,
} from './reducer';
import { TopBarLink, TopBar, TopBarDropDownLink, TopBarDropDown } from './TopBar';
import { SquareAndCols, TinyNav, Page } from './Page';
import { RebusOverlay, getKeyboardHandler, getPhysicalKeyboardHandler } from './Puzzle';
import AutofillWorker from 'worker-loader!./autofill.worker.ts'; // eslint-disable-line import/no-webpack-loader-syntax
import { isAutofillCompleteMessage, isAutofillResultMessage, WorkerMessage, LoadDBMessage, AutofillMessage } from './types';
import * as WordDB from './WordDB';

let worker: Worker;

export const BuilderDBLoader = requiresAdmin((props: PuzzleJson) => {
  const [ready, setReady] = React.useState(false);
  WordDB.initializeOrBuild(setReady);
  if (ready) {
    return <Builder {...props}/>;
  }
  return <Page title={null}>Loading word database...</Page>
});

interface PotentialFillItemProps {
  isGoodSuggestion: (entryIndex: number, word: string) => boolean,
  entryIndex: number,
  value: [string, number],
  dispatch: React.Dispatch<ClickedFillAction>,
}
const PotentialFillItem = (props: PotentialFillItemProps) => {
  function click(e: React.MouseEvent) {
    e.preventDefault();
    props.dispatch({ type: 'CLICKEDFILL', entryIndex: props.entryIndex, value: props.value[0] });
  }
  return (
    <div css={{
      padding: '0.5em 1em',
      cursor: 'pointer',
      '&:hover': {
        backgroundColor: '#EEE',
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
  dispatch: React.Dispatch<ClickedFillAction>,
}
const PotentialFillList = (props: PotentialFillListProps) => {
  const listRef = React.useRef<List>(null);
  React.useEffect(() => {
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
        height:  props.header ? 'calc(100% - 1.5em)' : '100%',
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

const ClueRow = (props: {dispatch: React.Dispatch<PuzzleAction>, entry: BuilderEntry, clues: Map<string,string>}) => {
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
    <td css={{ paddingBottom: '1em'}}><input placeholder="Enter a clue" value={props.clues.get(props.entry.completedWord)||""} onChange={(e) => props.dispatch({ type: "SETCLUE", word: props.entry.completedWord, clue: e.target.value } as SetClueAction)}/></td>
    </tr>
  );
}

interface ClueModeProps {
  title: string,
  exitClueMode: () => void,
  completedEntries: Array<BuilderEntry>,
  clues: Map<string, string>,
  dispatch: React.Dispatch<PuzzleAction>,
}
const ClueMode = (props: ClueModeProps) => {
  const topbar = (
    <React.Fragment>
      <TopBarLink icon={<SpinnerFinished/>} text="Back to Grid" onClick={props.exitClueMode}/>
    </React.Fragment>
  );
  const clueRows = props.completedEntries.map(e => <ClueRow dispatch={props.dispatch} entry={e} clues={props.clues}/>);
  return (
    <Page title="Constructor" topBarElements={topbar}>
      <div css={{ padding: '1em'}}>
      <h4>Title</h4>
      <input placeholder="Give your puzzle a title" value={props.title} onChange={(e) => props.dispatch({ type: "SETTITLE", value: e.target.value } as SetTitleAction)}/>
      <h4>Clues</h4>
      {props.completedEntries.length ?
        <table css={{ margin: 'auto', }}>
        {clueRows}
        </table>
        :
        <React.Fragment>
          <p>This where you come to set clues for your puzzle, but you don't have any completed entries yet!</p>
          <p>Go back to <a href="#" onClick={(e) => {props.exitClueMode(); e.preventDefault();}}>the grid</a> and fill in one or more entries completly. Then come back here and make some clues.</p>
        </React.Fragment>
      }
      </div>
    </Page>
  )
}

export const Builder = (props: PuzzleJson) => {
  const initialGrid = fromCells({
    mapper: (e) => e,
    width: props.size.cols,
    height: props.size.rows,
    cells: props.grid,
    allowBlockEditing: true,
    highlighted: new Set(props.highlighted),
    highlight: props.highlight,
  });
  const [state, dispatch] = React.useReducer(builderReducer, {
    title: props.title,
    active: { col: 0, row: 0, dir: Direction.Across } as PosAndDir,
    grid: initialGrid,
    showKeyboard: isMobile,
    isTablet: isTablet,
    showExtraKeyLayout: false,
    isEnteringRebus: false,
    rebusValue: '',
    wrongCells: new Set<number>(),
    gridIsComplete: false,
    repeats: new Set<string>(),
    hasNoShortWords: false,
    isEditable: () => true,
    symmetry: Symmetry.Rotational,
    clues: getClueMap(initialGrid, props.clues.across, props.clues.down),
    postEdit(_cellIndex) {
      return validateGrid(this);
    }
  }, validateGrid);

  const [autofilledGrid, setAutofilledGrid] = React.useState<string[]>([]);
  const [autofillInProgress, setAutofillInProgress] = React.useState(false);

  // TODO should we actually disable autofill? Right now it just turns off display
  const [autofillEnabled, setAutofillEnabled] = React.useState(true);

  React.useEffect(() => {
    if (!WordDB.dbEncoded) {
      throw new Error("missing db!");
    }
    setAutofilledGrid([]);
    if (!worker) {
      console.log("initializing worker");
      worker = new AutofillWorker();
      worker.onmessage = e => {
        const data = e.data as WorkerMessage;
        if (isAutofillResultMessage(data)) {
          setAutofilledGrid(data.result);
        } else if (isAutofillCompleteMessage(data)) {
          setAutofillInProgress(false);
        } else {
          console.error("unhandled msg in builder: ", e.data);
        }
      };
      let loaddb: LoadDBMessage = {type: 'loaddb', db: WordDB.dbEncoded};
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

  const [clueMode, setClueMode] = React.useState(false);
  if (clueMode) {
    return <ClueMode dispatch={dispatch} title={state.title} clues={state.clues} completedEntries={state.grid.entries.filter(e => e.completedWord)} exitClueMode={()=>setClueMode(false)}/>
  }
  return <GridMode autofillEnabled={autofillEnabled} setAutofillEnabled={setAutofillEnabled} autofilledGrid={autofilledGrid} autofillInProgress={autofillInProgress} state={state} dispatch={dispatch} setClueMode={setClueMode}/>
}

interface GridModeProps {
  autofillEnabled: boolean,
  setAutofillEnabled: (val:boolean) => void,
  autofilledGrid: string[],
  autofillInProgress: boolean,
  state: BuilderState,
  dispatch: React.Dispatch<PuzzleAction>,
  setClueMode: (val: boolean) => void,
}
const GridMode = ({state, dispatch, setClueMode, ...props}: GridModeProps) => {
  useEventListener('keydown', getPhysicalKeyboardHandler(dispatch));
  let left = <React.Fragment></React.Fragment>;
  let right = <React.Fragment></React.Fragment>;
  let tiny = <React.Fragment></React.Fragment>;
  let successFailureEntries = new Map<number, Map<number, [string,string]>>();
  function doCrossesWork(entryIndex: number, word: string) {
    const entry = state.grid.entries[entryIndex];
    let successFailure = successFailureEntries.get(entryIndex);
    if (successFailure === undefined) {
      successFailure = new Map<number, [string,string]>();
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
      if (newBitmap && newBitmap.equals(WordDB.ZERO)) {
        successFailure.set(i, [succeeding, failing + word[j]]);
        return false;
      } else {
        successFailure.set(i, [succeeding + word[j], failing]);
      }
    }
    return true;
  }
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

  function toggleAutofillEnabled() {
    props.setAutofillEnabled(!props.autofillEnabled);
  }

  let autofillIcon = <SpinnerDisabled/>;
  let autofillText = "Autofill disabled";
  if (props.autofillEnabled) {
    if (props.autofillInProgress) {
      autofillIcon = <SpinnerWorking/>;
      autofillText = "Autofill in progress";
    } else if (props.autofilledGrid.length) {
      autofillIcon = <SpinnerFinished/>;
      autofillText = "Autofill complete";
    } else {
      autofillIcon = <SpinnerFailed/>;
      autofillText = "Couldn't autofill this grid";
    }
  }
  let totalLength = 0;
  state.grid.entries.forEach((e) => totalLength += e.cells.length);
  const numEntries = state.grid.entries.length;
  const averageLength = totalLength / numEntries;
  return (
    <React.Fragment>
      <Helmet>
        <title>Constructor</title>
      </Helmet>
      <TopBar>
        <TopBarLink icon={autofillIcon} text="Autofill" hoverText={autofillText} onClick={toggleAutofillEnabled} />
        <TopBarLink icon={<FaListOl/>} text="Clues" onClick={() => setClueMode(true)}/>
        <TopBarDropDown icon={<IoMdStats/>} text="Stats">
          <h4 css={{width: '100%'}}>Grid status</h4>
          <div css={{
            width: '80%',
            margin: 'auto',
            textAlign: 'left',
          }}>
          <div>{ state.gridIsComplete ? <FaRegCheckCircle/> : <FaRegCircle/> } All cells should be filled</div>
          <div>{ state.hasNoShortWords ? <FaRegCheckCircle/> : <FaRegCircle/> } All entries should be at least three letters</div>
          <div>{ state.repeats.size > 0 ? <React.Fragment><FaRegCircle/> ({Array.from(state.repeats).sort().join(", ")})</React.Fragment>: <FaRegCheckCircle/> } No entries should be repeated</div>
          <h4 css={{width: '100%'}}>Entries</h4>
          <div>Number of entries: { numEntries }</div>
          <div>Mean entry length: { averageLength.toPrecision(3) }</div>
          </div>
        </TopBarDropDown>
        <TopBarDropDown icon={<SymmetryIcon type={state.symmetry}/>} text="Symmetry">
          <TopBarDropDownLink icon={<SymmetryRotational />} text="Rotational Symmetry" onClick={() => dispatch({ type: "CHANGESYMMETRY", symmetry: Symmetry.Rotational } as SymmetryAction)} />
          <TopBarDropDownLink icon={<SymmetryHorizontal />} text="Horizontal Symmetry" onClick={() => dispatch({ type: "CHANGESYMMETRY", symmetry: Symmetry.Horizontal } as SymmetryAction)} />
          <TopBarDropDownLink icon={<SymmetryVertical />} text="Vertical Symmetry" onClick={() => dispatch({ type: "CHANGESYMMETRY", symmetry: Symmetry.Vertical } as SymmetryAction)} />
          <TopBarDropDownLink icon={<SymmetryNone />} text="No Symmetry" onClick={() => dispatch({ type: "CHANGESYMMETRY", symmetry: Symmetry.None } as SymmetryAction)} />
        </TopBarDropDown>
        <TopBarDropDown icon={<FaEllipsisH />} text="More">
          <TopBarDropDownLink icon={<Rebus />} text="Enter Rebus" shortcutHint={<EscapeKey/>} onClick={() => dispatch({ type: "KEYPRESS", key: 'Escape', shift: false } as KeypressAction)} />
          <TopBarDropDownLink icon={<FaKeyboard />} text="Toggle Keyboard" onClick={() => dispatch({ type: "TOGGLEKEYBOARD" })} />
          <TopBarDropDownLink icon={<FaTabletAlt />} text="Toggle Tablet" onClick={() => dispatch({ type: "TOGGLETABLET" })} />
        </TopBarDropDown>
      </TopBar>
      {state.isEnteringRebus ?
        <RebusOverlay showingKeyboard={state.showKeyboard} dispatch={dispatch} value={state.rebusValue} /> : ""}
      <SquareAndCols
        showKeyboard={state.showKeyboard}
        keyboardHandler={getKeyboardHandler(dispatch)}
        showExtraKeyLayout={state.showExtraKeyLayout}
        isTablet={state.isTablet}
        includeBlockKey={true}
        square={
          <GridView
            showingKeyboard={state.showKeyboard}
            grid={state.grid}
            active={state.active}
            dispatch={dispatch}
            allowBlockEditing={true}
            autofill={props.autofillEnabled ? props.autofilledGrid : []}
          />
        }
        left={left}
        right={right}
        tinyColumn={<TinyNav dispatch={dispatch}>{tiny}</TinyNav>}
      />
    </React.Fragment>
  )
}
