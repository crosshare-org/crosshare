import {
  addClues,
  CluedGrid,
  fromCells,
  getEntryToClueMap,
  getRefs,
} from '../lib/viewableGrid';

test('test getEntryToClueMap', () => {
  const answers = ['U', 'P', 'S', 'O'];
  const grid = fromCells({
    width: 2,
    height: 2,
    cells: answers,
    allowBlockEditing: false,
    highlighted: new Set<number>(),
    highlight: 'circle',
    mapper: (x) => x,
  });

  const cluedGrid: CluedGrid = addClues(grid, [
    { num: 1, dir: 0, clue: 'Not down', explanation: null },
    { num: 3, dir: 0, clue: 'Then...', explanation: null },
    { num: 1, dir: 1, clue: 'You and I', explanation: null },
    { num: 2, dir: 1, clue: 'Post office abbr.', explanation: null },
  ]);

  const res = getEntryToClueMap(cluedGrid, answers);
  expect(res).toMatchSnapshot();
});

test('test getClueRefs for puzzle without any', () => {
  const answers = ['U', 'P', 'S', 'O'];
  const grid = fromCells({
    width: 2,
    height: 2,
    cells: answers,
    allowBlockEditing: false,
    highlighted: new Set<number>(),
    highlight: 'circle',
    mapper: (x) => x,
  });

  const cluedGrid: CluedGrid = addClues(grid, [
    { num: 1, dir: 0, clue: 'Not down', explanation: null },
    { num: 3, dir: 0, clue: 'Then...', explanation: null },
    { num: 1, dir: 1, clue: 'You and I', explanation: null },
    { num: 2, dir: 1, clue: 'Post office abbr.', explanation: null },
  ]);

  expect(getRefs(cluedGrid)).toMatchSnapshot();
});

test('test getClueRefs for puzzle with refs', () => {
  const answers = ['U', 'P', 'S', 'O'];
  const grid = fromCells({
    width: 2,
    height: 2,
    cells: answers,
    allowBlockEditing: false,
    highlighted: new Set<number>(),
    highlight: 'circle',
    mapper: (x) => x,
  });

  const cluedGrid: CluedGrid = addClues(grid, [
    { num: 1, dir: 0, clue: 'Not down 5-across', explanation: null },
    { num: 3, dir: 0, clue: '2-down Then...', explanation: null },
    { num: 1, dir: 1, clue: '1- and 3- across You and I', explanation: null },
    { num: 2, dir: 1, clue: '3A Post office abbr.', explanation: null },
  ]);

  const res = getRefs(cluedGrid)[0].map((s) => {
    return [...s].map((e): [number | undefined, number | undefined] => {
      return [
        cluedGrid.entries[e]?.labelNumber,
        cluedGrid.entries[e]?.direction,
      ];
    });
  });
  expect(res).toMatchSnapshot();
});

test('test getClueRefs for puzzle with starred clues', () => {
  const answers = ['U', 'P', 'S', 'O'];
  const grid = fromCells({
    width: 2,
    height: 2,
    cells: answers,
    allowBlockEditing: false,
    highlighted: new Set<number>(),
    highlight: 'circle',
    mapper: (x) => x,
  });

  const cluedGrid: CluedGrid = addClues(grid, [
    { num: 1, dir: 0, clue: '*Not down', explanation: null },
    { num: 3, dir: 0, clue: 'Then...', explanation: null },
    { num: 1, dir: 1, clue: '* You and I', explanation: null },
    {
      num: 2,
      dir: 1,
      clue: 'Post office the starred clues abbr.',
      explanation: null,
    },
  ]);

  const res = getRefs(cluedGrid)[0].map((s) => {
    return [...s].map((e): [number | undefined, number | undefined] => {
      return [
        cluedGrid.entries[e]?.labelNumber,
        cluedGrid.entries[e]?.direction,
      ];
    });
  });
  expect(res).toMatchSnapshot();
});

test('test getClueRefs for 35-downs', () => {
  const answers = ['U', 'P', 'S', 'O'];
  const grid = fromCells({
    width: 2,
    height: 2,
    cells: answers,
    allowBlockEditing: false,
    highlighted: new Set<number>(),
    highlight: 'circle',
    mapper: (x) => x,
  });

  const cluedGrid: CluedGrid = addClues(grid, [
    { num: 1, dir: 0, clue: 'Not down 5-acrosses', explanation: null },
    { num: 3, dir: 0, clue: '2-downs Then...', explanation: null },
    { num: 1, dir: 1, clue: '1- and 3- acrosses You and I', explanation: null },
    { num: 2, dir: 1, clue: '1-A Post office abbr.', explanation: null },
  ]);

  const res = getRefs(cluedGrid)[0].map((s) => {
    return [...s].map((e): [number | undefined, number | undefined] => {
      return [
        cluedGrid.entries[e]?.labelNumber,
        cluedGrid.entries[e]?.direction,
      ];
    });
  });
  expect(res).toMatchSnapshot();
});
