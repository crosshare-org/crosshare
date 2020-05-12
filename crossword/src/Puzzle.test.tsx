import React from 'react';
import { render, fireEvent, initFirebaseForTesting } from './testUtils';
import { Puzzle } from './Puzzle';
import { PuzzleResult } from './types';

const testPuzzle: PuzzleResult = {
  authorId: "test-author-id",
  category: null,
  authorName: "Mike D",
  moderated: true,
  publishTime: null,
  title: "Without company",
  size: { "rows": 5, "cols": 5 },
  clues: [
    { "dir": 0, "clue": "\"A New ___\": first Star Wars movie released", "num": 1 },
    { "dir": 0, "clue": "Without company", "num": 5 },
    { "dir": 0, "clue": "Fragrant spring flower", "num": 7 },
    { "dir": 0, "clue": "Throw out", "num": 8 },
    { "dir": 0, "clue": "This, in Madrid", "num": 9 },
    { "dir": 1, "clue": "In good health", "num": 1 },
    { "dir": 1, "clue": "Popeye's love", "num": 2 },
    { "dir": 1, "clue": "Ancient Greek city-state", "num": 3 },
    { "dir": 1, "clue": "Pass, as a law", "num": 4 },
    { "dir": 1, "clue": "Prefix used in \"Ghostbusters\"", "num": 6 }
  ],
  grid: ["H", "O", "P", "E", ".", "A", "L", "O", "N", "E", "L", "I", "L", "A", "C", "E", "V", "I", "C", "T", ".", "E", "S", "T", "O"],
  highlighted: [],
  highlight: "circle",
  id: "test-puzzle"
}

initFirebaseForTesting();

test('clicking a clue sets slot to active', () => {
  window.HTMLElement.prototype.scrollIntoView = function() { };

  const { getAllByText, getByLabelText } = render(<Puzzle puzzle={testPuzzle} play={null} />);

  const cell = getByLabelText('cell0x1');
  expect(cell).toHaveStyleRule('background', 'var(--secondary)');

  const cell2 = getByLabelText('cell1x1');
  expect(cell2).toHaveStyleRule('background', 'var(--white)');

  const clue = getAllByText(/popeye's love/i)[0];
  expect(clue).toBeInTheDocument();
  fireEvent.click(clue);

  expect(cell).toHaveStyleRule('background', 'var(--primary)');
  expect(cell2).toHaveStyleRule('background', 'var(--secondary)');
});
