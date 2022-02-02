import { act, render } from '../lib/testingUtils';
import { addClues, CluedGrid, fromCells } from '../lib/viewableGrid';
import { ClueText } from '../components/ClueText';
import { GridContext } from '../components/GridContext';

/*
"What's a Grecian ___?" "About $25 a week!"
_____ Ha'i, from South Pacific

*/

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
    hidden: new Set<number>(),
    highlight: 'circle',
    mapper: (x) => x,
  });

  const cluedGrid: CluedGrid = addClues(grid, [
    { num: 1, dir: 0, clue: 'Not down 5-acrosses', explanation: null },
    { num: 3, dir: 0, clue: '2-down Then...', explanation: null },
    { num: 1, dir: 1, clue: '1- and 3- acrosses You and I', explanation: null },
    { num: 2, dir: 1, clue: '3A Post office abbr.', explanation: null },
  ]);

  for (let i = 0; i < 4; i += 1) {
    const entry = cluedGrid.entries[i];
    if (!entry) {
      throw new Error('oob');
    }
    const { container } = render(
      <div>
        <GridContext.Provider value={cluedGrid}>
          <ClueText entry={entry} />
        </GridContext.Provider>
      </div>,
      {}
    );
    expect(container).toMatchSnapshot();
    await act(async () => Promise.resolve()); // Popper update() - https://github.com/popperjs/react-popper/issues/350
  }

  const first = cluedGrid.entries[0];
  if (!first) {
    throw new Error('oob');
  }

  let { container } = render(
    <GridContext.Provider value={cluedGrid}>
      <ClueText entry={{ ...first, clue: 'Try 3-a' }} />
    </GridContext.Provider>,
    {}
  );
  expect(container).toMatchSnapshot();

  ({ container } = render(
    <GridContext.Provider value={cluedGrid}>
      <ClueText entry={{ ...first, clue: '!@ Try 3-a' }} />
    </GridContext.Provider>,
    {}
  ));
  expect(container).toMatchSnapshot();

  ({ container } = render(
    <GridContext.Provider value={cluedGrid}>
      <ClueText entry={{ ...first, clue: 'Try 3-a in **bold**!' }} />
    </GridContext.Provider>,
    {}
  ));
  expect(container).toMatchSnapshot();

  ({ container } = render(
    <GridContext.Provider value={cluedGrid}>
      <ClueText entry={{ ...first, clue: '!@ Try 3-a in **bold**!' }} />
    </GridContext.Provider>,
    {}
  ));
  expect(container).toMatchSnapshot();

  ({ container } = render(
    <GridContext.Provider value={cluedGrid}>
      <ClueText entry={{ ...first, clue: '!#Try 3-a in **bold**!' }} />
    </GridContext.Provider>,
    {}
  ));
  expect(container).toMatchSnapshot();

  ({ container } = render(
    <GridContext.Provider value={cluedGrid}>
      <ClueText
        entry={{ ...first, clue: 'Something like 3As or 1Ds should ref' }}
      />
    </GridContext.Provider>,
    {}
  ));
  expect(container).toMatchSnapshot();

  ({ container } = render(
    <GridContext.Provider value={cluedGrid}>
      <ClueText entry={{ ...first, clue: '#1 grossing movie of all time' }} />
    </GridContext.Provider>,
    {}
  ));
  expect(container).toMatchSnapshot();

  ({ container } = render(
    <GridContext.Provider value={cluedGrid}>
      <ClueText entry={{ ...first, clue: "_____ Ha'i, from South Pacific" }} />
    </GridContext.Provider>,
    {}
  ));
  expect(container).toMatchSnapshot();

  ({ container } = render(
    <GridContext.Provider value={cluedGrid}>
      <ClueText
        entry={{
          ...first,
          clue: '"What\'s a Grecian ___?" "About $3 a week!"',
        }}
      />
    </GridContext.Provider>,
    {}
  ));
  expect(container).toMatchSnapshot();
});
