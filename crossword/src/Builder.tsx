/** @jsx jsx */
import { jsx } from '@emotion/core';

import * as React from 'react';

import { isMobile, isTablet } from "react-device-detect";
import { FaRegCircle, FaRegCheckCircle, FaTabletAlt, FaKeyboard, FaEllipsisH, } from 'react-icons/fa';
import useEventListener from '@use-it/event-listener';

import { Rebus, SpinnerWorking, SpinnerFinished, SpinnerFailed } from './Icons';
import { requiresAdmin } from './App';
import { Grid, GridData } from './Grid';
import { PosAndDir, Direction, PuzzleJson } from './types';
import { builderReducer, validateGrid, KeypressAction, } from './reducer';
import { TopBar, TopBarDropDownLink, TopBarDropDown } from './TopBar';
import { SquareAndCols, TinyNav, Page } from './Page';
import { RebusOverlay, getKeyboardHandler, getPhysicalKeyboardHandler } from './Puzzle';
import AutofillWorker from 'worker-loader!./autofill.worker.ts'; // eslint-disable-line import/no-webpack-loader-syntax
import { isAutofillCompleteMessage, isAutofillResultMessage, WorkerMessage, LoadDBMessage, AutofillMessage } from './types';
import * as WordDB from './WordDB';

let worker: Worker;

export const BuilderDBLoader = requiresAdmin((props: PuzzleJson) => {
  if (localStorage.getItem("db")) {
    return <Builder {...props}/>;
  }
  return <Builder {...props}/>;
});

export const Builder = (props: PuzzleJson) => {
  const [state, dispatch] = React.useReducer(builderReducer, {
    active: { col: 0, row: 0, dir: Direction.Across } as PosAndDir,
    grid: GridData.fromCells(
      props.size.cols,
      props.size.rows,
      props.grid,
      true,
      props.clues.across,
      props.clues.down,
      new Set(props.highlighted),
      props.highlight,
    ),
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
    postEdit(_cellIndex) {
      return validateGrid(this);
    }
  }, validateGrid);

  const [autofill, setAutofill] = React.useState<string[]>([]);
  const [autofilling, setAutofilling] = React.useState(false);
  WordDB.initialize();
  if (WordDB.dbStatus === WordDB.DBStatus.notPresent) {
    WordDB.build();
  }

  React.useEffect(() => {
    if (!WordDB.db) {
      return;
    }
    setAutofill([]);
    if (!worker) {
      console.log("initializing worker");
      worker = new AutofillWorker();
      worker.onmessage = e => {
        const data = e.data as WorkerMessage;
        if (isAutofillResultMessage(data)) {
          setAutofill(data.result);
        } else if (isAutofillCompleteMessage(data)) {
          setAutofilling(false);
        } else {
          console.error("unhandled msg in builder: ", e.data);
        }
      };
      let loaddb: LoadDBMessage = {type: 'loaddb', db: WordDB.db};
      worker.postMessage(loaddb);
    }
    let autofill: AutofillMessage = {
      type: 'autofill',
      grid: state.grid.cells,
      width: state.grid.width,
      height: state.grid.height
    };
    setAutofilling(true);
    worker.postMessage(autofill);
  }, [state.grid.cells, state.grid.width, state.grid.height]);

  useEventListener('keydown', getPhysicalKeyboardHandler(dispatch));

  if (WordDB.dbStatus === WordDB.DBStatus.building || WordDB.dbStatus === WordDB.DBStatus.uninitialized) {
    return <Page>Loading word database...</Page>
  }

//  const [entry, cross] = state.grid.entryAndCrossAtPosition(state.active);

//  const acrossEntries = state.grid.entries.filter((e) => e.direction === Direction.Across);
//  const downEntries = state.grid.entries.filter((e) => e.direction === Direction.Down);

  return (
    <React.Fragment>
      <TopBar>
        <TopBarDropDown icon={<FaEllipsisH />} text="More">
          <TopBarDropDownLink icon={<Rebus />} text="Enter Rebus (Esc)" onClick={() => dispatch({ type: "KEYPRESS", key: 'Escape', shift: false } as KeypressAction)} />
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
          <Grid
            showingKeyboard={state.showKeyboard}
            grid={state.grid}
            active={state.active}
            dispatch={dispatch}
            allowBlockEditing={true}
            autofill={autofill}
          />
        }
        left={
          <ul>
          <li>
          { autofilling ?
            <span><SpinnerWorking/> Autofilling</span>
          :
            (autofill.length ?
              <span><SpinnerFinished/> Autofill complete</span>
            :
              <span><SpinnerFailed/> Couldn't autofill this grid</span>
            )
          }
          </li>
          <li>All cells should be filled { state.gridIsComplete ? <FaRegCheckCircle/> : <FaRegCircle/> }</li>
          <li>All entries should be at least three letters { state.hasNoShortWords ? <FaRegCheckCircle/> : <FaRegCircle/> }</li>
          <li>No entries should be repeated { state.repeats.size > 0 ? <React.Fragment><FaRegCircle/> ({Array.from(state.repeats).sort().join(", ")})</React.Fragment>: <FaRegCheckCircle/> }</li>
          </ul>
        }
        right={<p>right</p>}
        tinyColumn={<TinyNav dispatch={dispatch}>tiny</TinyNav>}
      />
    </React.Fragment>
  )
}
