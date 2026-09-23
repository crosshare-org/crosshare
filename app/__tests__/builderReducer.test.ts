/**
 * @jest-environment node
 */

import { Timestamp } from '../lib/timestamp.js';
import { Direction, KeyK, fromKeyString } from '../lib/types.js';
import {
  PublishAction,
  builderReducer,
  initialBuilderState,
} from '../reducers/builderReducer.js';
import { KeypressAction } from '../reducers/commonActions.js';

function getState(
  grid: string[],
  clues: Record<string, string> | Record<string, string[]>,
  bars: { vBars?: number[]; hBars?: number[] } = {}
) {
  return initialBuilderState({
    id: 'foo',
    width: 3,
    height: 3,
    grid,
    vBars: bars.vBars ?? [],
    hBars: bars.hBars ?? [],
    hidden: [],
    cellStyles: {},
    blogPost: null,
    guestConstructor: null,
    title: null,
    notes: null,
    authorId: 'foo',
    authorName: 'bar',
    editable: true,
    isPrivate: true,
    isPrivateUntil: null,
    contestAnswers: null,
    contestHasPrize: false,
    contestRevealDelay: null,
    alternates: null,
    userTags: [],
    clues,
  });
}

const publish: PublishAction = {
  type: 'PUBLISH',
  publishTimestamp: Timestamp.now(),
};

const keypress = (
  key: Exclude<KeyK, KeyK.AllowedCharacter>
): KeypressAction => ({
  type: 'KEYPRESS',
  key: { k: key },
});

test('home and end move to barred entry boundaries', () => {
  const state = getState(
    ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'],
    {},
    { vBars: [1], hBars: [3] }
  );

  const across = {
    ...state,
    active: { row: 0, col: 1, dir: Direction.Across },
  };
  expect(builderReducer(across, keypress(KeyK.Home)).active).toEqual({
    row: 0,
    col: 0,
    dir: Direction.Across,
  });
  expect(builderReducer(across, keypress(KeyK.End)).active).toEqual({
    row: 0,
    col: 1,
    dir: Direction.Across,
  });

  const down = { ...state, active: { row: 1, col: 0, dir: Direction.Down } };
  expect(builderReducer(down, keypress(KeyK.Home)).active).toEqual({
    row: 0,
    col: 0,
    dir: Direction.Down,
  });
  expect(builderReducer(down, keypress(KeyK.End)).active).toEqual({
    row: 1,
    col: 0,
    dir: Direction.Down,
  });
});

test('home and end keyboard events are recognized', () => {
  expect(fromKeyString('Home')).toEqual({ k: KeyK.Home });
  expect(fromKeyString('End')).toEqual({ k: KeyK.End });
});

test('short word warning', () => {
  const state = getState(['H', 'I', '.', 'ELLO', '.', '.', '.', '.', '.'], {});
  expect(builderReducer(state, publish).publishWarnings).toMatchInlineSnapshot(`
    [
      "Some words are only two letters long (HI)",
      "UNCHES",
    ]
  `);
});

test('basic enum warnings', () => {
  const state = getState(['a', 'b', 'c', 'g', '', '', 'd', 'e', 'f'], {
    abc: 'test with good enum (3)',
    def: 'test with bad enum (5)',
    abd: 'missing with bad enum(4)',
    agf: 'missing with no enum',
    agd: 'test with no enum',
  });
  expect(builderReducer(state, publish).publishWarnings).toMatchInlineSnapshot(`
    [
      "Some clues are missing enumerations: (agd)",
      "Some clues have enumerations that don't match the answer length: (def)",
    ]
  `);
});

test('enum error in duplicate clue', () => {
  const state = getState(['a', 'b', 'c', 'a', 'b', 'c', 'a', 'b', 'c'], {
    abc: [
      'test with good enum (3)',
      'test with bad enum (5)',
      'missing with no enum',
    ],
    agf: ['missing with no enum'],
    agd: ['test with no enum'],
  });
  expect(builderReducer(state, publish).publishWarnings).toMatchInlineSnapshot(`
    [
      "Some words are repeated (abc)",
      "Some clues are missing enumerations: (abc)",
      "Some clues have enumerations that don't match the answer length: (abc)",
    ]
  `);
});

test('missing refs', () => {
  const state = getState(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'], {
    abc: 'heres a ref to 4-across',
    def: 'heres a 2D reference',
    ghi: 'but this one to 7A should warn',
  });
  expect(builderReducer(state, publish).publishWarnings).toMatchInlineSnapshot(`
    [
      "Some clues reference entries that don't exist: (ghi)",
    ]
  `);
});

test('basic publish errors', () => {
  const state = getState(['a', 'b', 'c', ' ', ' ', ' ', 'd', 'e', 'f'], {
    abc: 'test with good enum (3)',
    def: 'test with bad enum (5)',
  });
  expect(builderReducer(state, publish).publishErrors).toMatchInlineSnapshot(`
    [
      "All squares in the grid must be filled in",
      "Puzzle must have a title set",
    ]
  `);
});
