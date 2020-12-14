import {
  addClues,
  CluedGrid,
  fromCells,
  getEntryToClueMap,
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
