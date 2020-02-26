import * as React from 'react';
import { RouteComponentProps } from '@reach/router';

import { SquareAndCols } from './Page';
import { Position, Direction } from './types';
import { GridData, Grid } from './Grid';
import { TopBar } from './TopBar';
import { Footer } from './Footer';

export const PuzzleBuilder = (_: RouteComponentProps) => {
  const sideLength = 5;
  const [active, setActive] = React.useState({ col: 0, row: 0 } as Position);
  const [direction, setDirection] = React.useState(Direction.Across);
  let initInput = new Array<string>(sideLength * sideLength);
  for (let i = 0; i < initInput.length; i += 1) {
    initInput[i] = ' ';
  }
  const [input, setInput] = React.useState(initInput);

  const grid = GridData.fromCells(sideLength, sideLength, input, true);

  return (
    <>
      <TopBar />
      <SquareAndCols
        square={
          <Grid
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
      <Footer/>
    </>
  );
}
