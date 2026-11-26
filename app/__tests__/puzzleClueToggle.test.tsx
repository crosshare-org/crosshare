import { jest } from '@jest/globals';

const mockRouter = {
  locale: 'en',
  query: {},
  events: { on: jest.fn(), off: jest.fn() },
};
jest.unstable_mockModule('next/router', () => ({
  useRouter: () => mockRouter,
  default: { useRouter: () => mockRouter },
}));

// jsdom doesn't implement ResizeObserver, which some grid components use.
class ResizeObserverStub {
  observe() {
    /* noop */
  }
  unobserve() {
    /* noop */
  }
  disconnect() {
    /* noop */
  }
}
(
  globalThis as unknown as { ResizeObserver: typeof ResizeObserverStub }
).ResizeObserver = ResizeObserverStub;

const { getMockedPuzzle } = await import('../lib/getMockedPuzzle.js');
const { markdownToHast } = await import('../lib/markdown/markdown.js');
const { Timestamp } = await import('../lib/timestamp.js');
const { puzzleFromDB } = await import('../lib/types.js');
const { addClues, fromCells } = await import('../lib/viewableGrid.js');
const { render, screen } = await import('../lib/testingUtils.js');
const { Puzzle } = await import('../components/Puzzle.js');

function makePuzzle() {
  const db = getMockedPuzzle();
  const fromDB = puzzleFromDB(db, 'test-puzzle-id');
  const grid = addClues(
    fromCells({
      mapper: (e) => e,
      width: fromDB.size.cols,
      height: fromDB.size.rows,
      cells: fromDB.grid,
      allowBlockEditing: true,
      cellStyles: new Map<string, Set<number>>(
        Object.entries(fromDB.cellStyles).map(([k, v]) => [k, new Set(v)])
      ),
      vBars: new Set(fromDB.vBars),
      hBars: new Set(fromDB.hBars),
      hidden: new Set(fromDB.hidden),
    }),
    fromDB.clues,
    (c: string) => markdownToHast({ text: c, inline: true })
  );
  return {
    ...fromDB,
    id: 'test-puzzle-id',
    blogPostRaw: null,
    blogPost: null,
    constructorNotes: null,
    constructorPage: null,
    constructorIsPatron: false,
    constructorIsMod: false,
    comments: [],
    clueHasts: grid.entries.map((e) =>
      markdownToHast({ text: e.clue, inline: true })
    ),
    likes: {},
  };
}

test('clues/grid toggle remains available after the puzzle is solved', () => {
  render(
    <Puzzle
      puzzle={makePuzzle()}
      play={{
        c: 'test-puzzle-id',
        n: 'Test puzzle',
        ua: Timestamp.now(),
        g: Array<string>(25).fill(' '),
        ct: [1, 0, 0, 0],
        uc: [1, 0, 0, 0],
        vc: [],
        wc: [],
        we: [],
        rc: [],
        t: 5,
        ch: false,
        f: true,
      }}
      loadingPlayState={false}
      isAdmin={false}
    />,
    {}
  );

  // After revealing the whole puzzle the user must still be able to get
  // back to the grid from clue mode.
  expect(screen.getByRole('button', { name: 'Clues' })).toBeInTheDocument();
});
