import { act, render } from '../lib/testingUtils';
import { addClues, CluedGrid, fromCells, getRefs } from '../lib/viewableGrid';
import { ClueText } from '../components/ClueText';

test('Highlighting for different types of clues', async () => {
  const answers = ['U', 'P', 'S', 'O'];
  const grid = fromCells({
    width: 2,
    height: 2,
    cells: answers,
    allowBlockEditing: false,
    highlighted: new Set<number>(),
    vBars: new Set<number>(),
    hBars: new Set<number>(),
    highlight: 'circle',
    mapper: (x) => x,
  });

  const cluedGrid: CluedGrid = addClues(grid, [
    { num: 1, dir: 0, clue: 'Not down 5-acrosses', explanation: null },
    { num: 3, dir: 0, clue: '2-down Then...', explanation: null },
    { num: 1, dir: 1, clue: '1- and 3- acrosses You and I', explanation: null },
    { num: 2, dir: 1, clue: '3A Post office abbr.', explanation: null },
  ]);

  const [, refPositions] = getRefs(cluedGrid);

  console.log(refPositions);
  for (let i = 0; i < 4; i += 1) {
    const { container } = render(
      <div>
        <ClueText
          grid={cluedGrid}
          allEntries={cluedGrid.entries}
          entryIndex={i}
          refPositions={refPositions}
          downsOnly={false}
        />
      </div>,
      {}
    );
    expect(container).toMatchSnapshot();
    await act(async () => Promise.resolve()); // Popper update() - https://github.com/popperjs/react-popper/issues/350
  }
});
