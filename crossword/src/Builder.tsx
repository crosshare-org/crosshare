/** @jsx jsx */
import { jsx } from '@emotion/core';

import * as React from 'react';

import { isMobile, isTablet } from "react-device-detect";
import { FaRegCircle, FaRegCheckCircle, FaTabletAlt, FaKeyboard, FaEllipsisH, } from 'react-icons/fa';
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
import { fromCells } from './viewableGrid';
import { addAutofillFieldsToEntry } from './autofillGrid';
import { PosAndDir, Direction, PuzzleJson } from './types';
import {
  Symmetry, builderReducer, validateGrid,
  KeypressAction, SymmetryAction, ClickedFillAction } from './reducer';
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
    }} onClick={click}>
    {props.value[0]}
    </div>
  );
}

interface PotentialFillListProps {
  header?: string,
  entryIndex: number,
  values: Array<[string, number]>,
  dispatch: React.Dispatch<ClickedFillAction>,
}
const PotentialFillList = (props: PotentialFillListProps) => {
  const listRef = React.useRef<List>(null);
  if (listRef.current !== null) {
    listRef.current.scrollToItem(0);
  }
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

export const Builder = (props: PuzzleJson) => {
  const [state, dispatch] = React.useReducer(builderReducer, {
    active: { col: 0, row: 0, dir: Direction.Across } as PosAndDir,
    grid: {
      ...fromCells(
        addAutofillFieldsToEntry,
        props.size.cols,
        props.size.rows,
        props.grid,
        true,
        props.clues.across,
        props.clues.down,
        new Set(props.highlighted),
        props.highlight,
      ),
      usedWords: new Set<string>()
    },
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

  useEventListener('keydown', getPhysicalKeyboardHandler(dispatch));

  let left = <React.Fragment></React.Fragment>;
  let right = <React.Fragment></React.Fragment>;
  let tiny = <React.Fragment></React.Fragment>;
  for (let entry of entryAndCrossAtPosition(state.grid, state.active)) {
    if (entry !== null) {
      let matches: Array<[string, number]>;
      if (entry.isComplete) {
        // If complete, remove any cells whose crosses aren't complete and show that
        let pattern = "";
        let crosses = getCrosses(state.grid, entry);
        entry.cells.forEach((cell, index) => {
          const val = valAt(state.grid, cell);
          const cross = crosses[index];
          if (val.length === 1 && cross.entryIndex !== null && !state.grid.entries[cross.entryIndex].isComplete) {
            pattern += " ";
          } else {
            pattern += val;
          }
        });
        matches = WordDB.matchingWords(pattern.length, WordDB.matchingBitmap(pattern));
      } else {
        // If not complete show possible completions of given squares
        matches = WordDB.matchingWords(entry.length, entry.bitmap);
      }
      if (entry.direction === state.active.dir) {
        tiny = <PotentialFillList values={matches} entryIndex={entry.index} dispatch={dispatch} />;
      }
      if (entry.direction === Direction.Across) {
        left = <PotentialFillList header="Across" values={matches} entryIndex={entry.index} dispatch={dispatch} />;
      } else {
        right = <PotentialFillList header="Down" values={matches} entryIndex={entry.index} dispatch={dispatch} />;
      }
    }
  }

  function toggleAutofillEnabled() {
    setAutofillEnabled(a => !a);
  }

  let autofillIcon = <SpinnerDisabled/>;
  let autofillText = "Autofill disabled";
  if (autofillEnabled) {
    if (autofillInProgress) {
      autofillIcon = <SpinnerWorking/>;
      autofillText = "Autofill in progress";
    } else if (autofilledGrid.length) {
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
            autofill={autofillEnabled ? autofilledGrid : []}
          />
        }
        left={left}
        right={right}
        tinyColumn={<TinyNav dispatch={dispatch}>{tiny}</TinyNav>}
      />
    </React.Fragment>
  )
}
