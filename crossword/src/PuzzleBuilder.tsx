import * as React from 'react';
import { RouteComponentProps } from '@reach/router';
import { isMobile } from "react-device-detect";

import { SquareAndCols } from './Page';
import { Position, Direction } from './types';
import { GridData, Grid } from './Grid';
import { TopBar, TopBarLink } from './TopBar';
import { FaKeyboard } from 'react-icons/fa';

export const PuzzleBuilder = (_: RouteComponentProps) => {
  const sideLength = 5;
  const [active, setActive] = React.useState({ col: 0, row: 0 } as Position);
  const [direction, setDirection] = React.useState(Direction.Across);
  const [showKeyboard, setShowKeyboard] = React.useState(isMobile);
  const toggleKeyboard = () => setShowKeyboard(!showKeyboard);

  let initInput = new Array<string>(sideLength * sideLength);
  for (let i = 0; i < initInput.length; i += 1) {
    initInput[i] = ' ';
  }
  const [input, setInput] = React.useState(initInput);

  const grid = GridData.fromCells(sideLength, sideLength, input, true);

  return (
    <>
      <TopBar>
        <TopBarLink icon={<FaKeyboard/>} text="toggle keyboard" onClick={toggleKeyboard}/>
      </TopBar>
      <SquareAndCols
        showKeyboard={showKeyboard}
        isTablet={false}
        square={
          <Grid
            showingKeyboard={showKeyboard}
            grid={grid} setCellValues={setInput}
            active={active} setActive={setActive}
            direction={direction} setDirection={setDirection}
          />
        }
        left={
          <h5 className="clue-list-header">Across</h5>
        }
        right={
          <h5 className="clue-list-header">Down</h5>
        }
      />
    </>
  );
}
