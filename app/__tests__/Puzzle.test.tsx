import React from 'react';
import { render, fireEvent } from '../lib/testingUtils';
import { Puzzle } from '../components/Puzzle';
import { PuzzleResult } from '../lib/types';

jest.mock("../lib/firebaseWrapper");

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
  id: "test-puzzle",
  comments: []
}


test('clicking a clue sets slot to active', () => {
  window.HTMLElement.prototype.scrollIntoView = function() { };

  const { getAllByText, getByLabelText } = render(<Puzzle puzzle={testPuzzle} play={null} isAdmin={false} />);

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

test('daily mini from 5/19/20', () => {
  const p: PuzzleResult = { "authorId": "fSEwJorvqOMK5UhNMHa4mu48izl1", "category": "dailymini", "authorName": "Mike D", "moderated": true, "publishTime": null, "title": "Word of surrender", "size": { "rows": 5, "cols": 5 }, "clues": [{ "dir": 0, "clue": "Word with Cod or Canaveral", "num": 1 }, { "dir": 0, "clue": "Caustic compound", "num": 4 }, { "dir": 0, "clue": "Word of surrender", "num": 6 }, { "dir": 0, "clue": "Not feel well", "num": 8 }, { "dir": 0, "clue": "\"Whats gotten ___ you?\"", "num": 9 }, { "dir": 1, "clue": "Game with Miss Scarlet and Professor Plum", "num": 1 }, { "dir": 1, "clue": "Rand who wrote \"Atlas Shrugged\"", "num": 2 }, { "dir": 1, "clue": "Butter ___ (ice cream flavor)", "num": 3 }, { "dir": 1, "clue": "Former Knicks star Anthony, to fans", "num": 5 }, { "dir": 1, "clue": "Exciting, in modern lingo", "num": 7 }], "grid": ["C", "A", "P", "E", ".", "L", "Y", "E", ".", "M", "U", "N", "C", "L", "E", "E", ".", "A", "I", "L", ".", "I", "N", "T", "O"], "highlighted": [], "highlight": "circle", "comments": [], "id": "iMwPVXfePmv3bJC6KaQL" }
  window.HTMLElement.prototype.scrollIntoView = function() { };

  const { getByLabelText, getByText, queryByText, getAllByText, container } = render(<Puzzle puzzle={p} play={null} isAdmin={false} />);

  fireEvent.click(getByText(/Begin Puzzle/i));
  expect(queryByText(/Begin Puzzle/i)).toBeNull();

  const clue = getAllByText(/professor plum/i)[0].parentElement ?.parentElement;
  expect(clue).toHaveStyleRule('background-color', 'var(--secondary)');

  // This puzzle has some cells w/ only a single entry (no cross) which were
  // causing errors when tabbing through the puzzle
  fireEvent.keyDown(container, { key: 'Tab', keyCode: 9 });
  fireEvent.keyDown(container, { key: 'Tab', keyCode: 9 });
  fireEvent.keyDown(container, { key: 'Tab', keyCode: 9 });
  fireEvent.keyDown(container, { key: 'Tab', keyCode: 9 });
  fireEvent.keyDown(container, { key: 'Tab', keyCode: 9 });

  expect(clue).toHaveStyleRule('background-color', 'var(--lighter)');

  // After a naive fix of the above issue we were still having problems on click
  fireEvent.click(getByLabelText('cell0x3'));
  const clueOne = getAllByText(/word with cod/i)[0].parentElement ?.parentElement;
  expect(clueOne).toHaveStyleRule('background-color', 'var(--lighter)');
})
