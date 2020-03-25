/** @jsx jsx */
import { jsx } from '@emotion/core';

import * as React from 'react';

import { isMobile, isTablet } from "react-device-detect";
import { FaRegCircle, FaRegCheckCircle, FaRegPlusSquare, FaTabletAlt, FaKeyboard, FaEllipsisH, } from 'react-icons/fa';
import useEventListener from '@use-it/event-listener';

import { requiresAdmin } from './App';
import { Grid, GridData } from './Grid';
import { PosAndDir, Direction, PuzzleJson } from './types';
import { builderReducer, validateGrid, KeypressAction, } from './reducer';
import { TopBar, TopBarDropDownLink, TopBarDropDown } from './TopBar';
import { SquareAndCols, TinyNav, Page } from './Page';
import { RebusOverlay, getKeyboardHandler, getPhysicalKeyboardHandler } from './Puzzle';
import AutofillWorker from 'worker-loader!./autofill.worker'; // eslint-disable-line import/no-webpack-loader-syntax
import { DBContext, DBStatus } from './WordDB';

let worker = new AutofillWorker();

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
  const dbctx = React.useContext(DBContext);
  dbctx.initialize();
  if (dbctx.dbStatus === DBStatus.notPresent) {
    dbctx.build();
  }

  React.useEffect(() => {
    if (dbctx.dbStatus !== DBStatus.present || dbctx.db === undefined) {
      return;
    }
    setAutofill([]);
    worker.terminate();
    worker = new AutofillWorker();
    worker.addEventListener('message', e => setAutofill(e.data.grid), false);
    worker.postMessage({db: dbctx.db, grid: state.grid.cells});
  }, [state.grid.cells, dbctx.dbStatus]);

  useEventListener('keydown', getPhysicalKeyboardHandler(dispatch));

  if (dbctx.dbStatus === DBStatus.building || dbctx.dbStatus === DBStatus.uninitialized) {
    return <Page>Loading word database...</Page>
  }

//  const [entry, cross] = state.grid.entryAndCrossAtPosition(state.active);

//  const acrossEntries = state.grid.entries.filter((e) => e.direction === Direction.Across);
//  const downEntries = state.grid.entries.filter((e) => e.direction === Direction.Down);

  return (
    <React.Fragment>
      <TopBar>
        <TopBarDropDown icon={<FaEllipsisH />} text="More">
          <TopBarDropDownLink icon={<FaRegPlusSquare />} text="Enter Rebus (Esc)" onClick={() => dispatch({ type: "KEYPRESS", key: 'Escape', shift: false } as KeypressAction)} />
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
