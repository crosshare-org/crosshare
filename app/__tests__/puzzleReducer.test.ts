/**
 * @jest-environment node
 */

import { getMockedPuzzle } from '../lib/getMockedPuzzle';
import { markdownToHast } from '../lib/markdown/markdown';
import { BLOCK, CheatUnit, Direction, KeyK, puzzleFromDB } from '../lib/types';
import { allSolutions } from '../lib/utils';
import { addClues, fromCells } from '../lib/viewableGrid';
import { KeypressAction } from '../reducers/commonActions';
import { PuzzleState, puzzleReducer } from '../reducers/puzzleReducer';
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
      )[0]
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
      )[0]
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
      )[0]
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
      )[0]
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
  const fromDB = puzzleFromDB(dbpuz, 'puzId');
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
      cellStyles: new Map(),
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
    draftCells: new Set(),
    grid,
    solutions: allSolutions(dbpuz.g, [])[0],
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
  const fromDB = puzzleFromDB(dbpuz, 'puzId');
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
      cellStyles: new Map(),
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
    draftCells: new Set(),
    grid,
    solutions: allSolutions(dbpuz.g, [[[0, 'M']]])[0],
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

function getPuzzleState(): PuzzleState {
  const dbpuz = getMockedPuzzle();
  const fromDB = puzzleFromDB(dbpuz, 'puzId');
  const ourGrid = fromDB.grid.map((s): string => (s === BLOCK ? BLOCK : ' '));
  const grid = addClues(
    fromCells({
      mapper: (e) => e,
      width: fromDB.size.cols,
      height: fromDB.size.rows,
      cells: ourGrid,
      allowBlockEditing: false,
      cellStyles: new Map(),
      vBars: new Set(fromDB.vBars),
      hBars: new Set(fromDB.hBars),
      hidden: new Set(fromDB.hidden),
    }),
    fromDB.clues,
    (c: string) => markdownToHast({ text: c, inline: true })
  );
  return {
    type: 'puzzle',
    wasEntryClick: false,
    active: { col: 0, row: 0, dir: Direction.Across },
    grid,
    showExtraKeyLayout: false,
    answers: fromDB.grid,
    alternateSolutions: fromDB.alternateSolutions,
    solutions: allSolutions(fromDB.grid, fromDB.alternateSolutions)[0],
    verifiedCells: new Set(),
    wrongCells: new Set(),
    revealedCells: new Set(),
    draftCells: new Set(),
    draftMode: false,
    downsOnly: false,
    isEnteringRebus: false,
    rebusValue: '',
    success: false,
    ranSuccessEffects: false,
    filled: false,
    autocheck: false,
    dismissedKeepTrying: false,
    dismissedSuccess: false,
    moderating: false,
    showingEmbedOverlay: false,
    displaySeconds: 0,
    bankedSeconds: 0,
    ranMetaSubmitEffects: false,
    currentTimeWindowStart: Date.now(),
    didCheat: false,
    clueView: false,
    cellsUpdatedAt: fromDB.grid.map(() => 0),
    cellsIterationCount: fromDB.grid.map(() => 0),
    cellsEverMarkedWrong: new Set(),
    loadedPlayState: true,
    isEditable(cellIndex) {
      return !this.verifiedCells.has(cellIndex) && !this.success;
    },
  };
}

function press(key: KeypressAction['key']): KeypressAction {
  return { type: 'KEYPRESS', key };
}

test('draft mode toggles with period or draft key', () => {
  const state = getPuzzleState();
  const withDot = puzzleReducer(state, press({ k: KeyK.Dot }));
  expect(withDot.draftMode).toBe(true);
  const toggledOff = puzzleReducer(withDot, press({ k: KeyK.Draft }));
  expect(toggledOff.draftMode).toBe(false);
});

test('letters entered in draft mode are marked draft until confirmed', () => {
  let state = getPuzzleState();
  state = puzzleReducer(state, press({ k: KeyK.Draft }));
  state = puzzleReducer(state, press({ k: KeyK.AllowedCharacter, c: 'A' }));
  expect(state.grid.cells[0]).toBe('A');
  expect(state.draftCells.has(0)).toBe(true);

  state = puzzleReducer(state, press({ k: KeyK.Draft }));
  state = puzzleReducer(state, press({ k: KeyK.ArrowLeft }));
  state = puzzleReducer(state, press({ k: KeyK.AllowedCharacter, c: 'B' }));
  expect(state.grid.cells[0]).toBe('B');
  expect(state.draftCells.has(0)).toBe(false);
});

test('backspace removes draft status', () => {
  let state = getPuzzleState();
  state = puzzleReducer(state, press({ k: KeyK.Draft }));
  state = puzzleReducer(state, press({ k: KeyK.AllowedCharacter, c: 'A' }));
  expect(state.draftCells.has(0)).toBe(true);

  state = puzzleReducer(state, press({ k: KeyK.ArrowLeft }));
  state = puzzleReducer(state, press({ k: KeyK.Backspace }));
  expect(state.grid.cells[0]?.trim()).toBe('');
  expect(state.draftCells.has(0)).toBe(false);
});

test('revealing a draft cell confirms it', () => {
  let state = getPuzzleState();
  state = puzzleReducer(state, press({ k: KeyK.Draft }));
  state = puzzleReducer(state, press({ k: KeyK.AllowedCharacter, c: 'A' }));
  expect(state.draftCells.has(0)).toBe(true);

  state = puzzleReducer(state, press({ k: KeyK.ArrowLeft }));
  state = cheat(state, CheatUnit.Square, true);
  expect(state.draftCells.has(0)).toBe(false);
  expect(state.verifiedCells.has(0)).toBe(true);
});
