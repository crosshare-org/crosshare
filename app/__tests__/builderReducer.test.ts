/**
 * @jest-environment node
 */

import { Timestamp } from '../lib/timestamp';
import {
  PublishAction,
  builderReducer,
  initialBuilderState,
} from '../reducers/builderReducer';

function getState(
  grid: string[],
  clues: Record<string, string> | Record<string, string[]>
) {
  return initialBuilderState({
    id: 'foo',
    width: 3,
    height: 3,
    grid,
    vBars: [],
    hBars: [],
    hidden: [],
    highlighted: [],
    highlight: 'circle',
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
