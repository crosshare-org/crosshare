/**
 * @jest-environment node
 */

import { getMockedPuzzle } from '../lib/getMockedPuzzle';
import { markdownToHast } from '../lib/markdown/markdown';
import { BLOCK, CheatUnit, puzzleFromDB } from '../lib/types';
import { allSolutions } from '../lib/utils';
import { addClues, fromCells } from '../lib/viewableGrid';
import {
  CheatablePuzzleState,
  cheat,
  closestAlt,
} from '../reducers/puzzleUtils';

test('check closest alt', () => {
  expect(
    closestAlt(
      ['A', 'B', 'C'],
      allSolutions(
        ['D', 'E', 'F'],
        [
          [
            [0, 'G'],
            [1, 'B'],
            [2, 'C'],
          ],
          [[0, 'A']],
        ]
      )
    )
  ).toMatchInlineSnapshot(`
    [
      "G",
      "B",
      "C",
    ]
  `);

  expect(
    closestAlt(
      ['A', 'B', 'C'],
      allSolutions(
        ['D', 'E', 'F'],
        [
          [
            [1, 'B'],
            [2, 'C'],
          ],
          [[0, 'A']],
        ]
      )
    )
  ).toMatchInlineSnapshot(`
    [
      "A",
      "B",
      "C",
    ]
  `);

  expect(
    closestAlt(
      ['A', 'B', 'C'],
      allSolutions(
        ['D', 'E', 'F'],
        [
          [
            [1, 'B'],
            [2, 'C'],
          ],
          [
            [0, 'A'],
            [1, 'B'],
          ],
        ]
      )
    )
  ).toMatchInlineSnapshot(`
    [
      "A",
      "B",
      "C",
    ]
  `);

  expect(
    closestAlt(
      ['A', 'B', 'C'],
      allSolutions(
        ['D', 'E', 'F'],
        [
          [
            [1, 'Q'],
            [2, 'C'],
          ],
          [
            [0, 'A'],
            [1, 'G'],
          ],
        ]
      )
    )
  ).toMatchInlineSnapshot(`
    [
      "D",
      "Q",
      "C",
    ]
  `);
});

test('check without alt', () => {
  const dbpuz = getMockedPuzzle();
  const fromDB = puzzleFromDB(dbpuz);
  const ourGrid = fromDB.grid.map((s): string => (s === BLOCK ? BLOCK : ' '));
  ourGrid[0] = 'M';
  ourGrid[1] = 'A';
  ourGrid[2] = 'S';
  const grid = addClues(
    fromCells({
      mapper: (e) => e,
      width: fromDB.size.cols,
      height: fromDB.size.rows,
      cells: ourGrid,
      allowBlockEditing: true,
      highlighted: new Set(fromDB.highlighted),
      highlight: fromDB.highlight,
      vBars: new Set(fromDB.vBars),
      hBars: new Set(fromDB.hBars),
      hidden: new Set(fromDB.hidden),
    }),
    fromDB.clues,
    (c: string) => markdownToHast({ text: c, inline: true })
  );
  const state: CheatablePuzzleState = {
    verifiedCells: new Set(),
    revealedCells: new Set(),
    wrongCells: new Set(),
    grid,
    solutions: allSolutions(dbpuz.g, []),
    cellsIterationCount: [],
    cellsEverMarkedWrong: new Set(),
    cellsUpdatedAt: [],
    bankedSeconds: 0,
    currentTimeWindowStart: 0,
    filled: false,
    success: false,
    dismissedKeepTrying: false,
    active: { row: 0, col: 0, dir: 0 },
  };
  const checked = cheat(state, CheatUnit.Entry, true);
  expect(checked.revealedCells).toMatchInlineSnapshot(`
    Set {
      0,
      3,
      4,
    }
  `);
});

test('check with alt', () => {
  const dbpuz = getMockedPuzzle();
  const fromDB = puzzleFromDB(dbpuz);
  const ourGrid = fromDB.grid.map((s): string => (s === BLOCK ? BLOCK : ' '));
  ourGrid[0] = 'M';
  ourGrid[1] = 'A';
  ourGrid[2] = 'S';
  const grid = addClues(
    fromCells({
      mapper: (e) => e,
      width: fromDB.size.cols,
      height: fromDB.size.rows,
      cells: ourGrid,
      allowBlockEditing: true,
      highlighted: new Set(fromDB.highlighted),
      highlight: fromDB.highlight,
      vBars: new Set(fromDB.vBars),
      hBars: new Set(fromDB.hBars),
      hidden: new Set(fromDB.hidden),
    }),
    fromDB.clues,
    (c: string) => markdownToHast({ text: c, inline: true })
  );
  const state: CheatablePuzzleState = {
    verifiedCells: new Set(),
    revealedCells: new Set(),
    wrongCells: new Set(),
    grid,
    solutions: allSolutions(dbpuz.g, [[[0, 'M']]]),
    cellsIterationCount: [],
    cellsEverMarkedWrong: new Set(),
    cellsUpdatedAt: [],
    bankedSeconds: 0,
    currentTimeWindowStart: 0,
    filled: false,
    success: false,
    dismissedKeepTrying: false,
    active: { row: 0, col: 0, dir: 0 },
  };
  const checked = cheat(state, CheatUnit.Entry, true);
  expect(checked.revealedCells).toMatchInlineSnapshot(`
    Set {
      3,
      4,
    }
  `);
});
