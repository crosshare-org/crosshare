import React from "react";
import { render, fireEvent } from "../lib/testingUtils";
import { Puzzle } from "../components/Puzzle";
import { PuzzleResult } from "../lib/types";
import PuzzlePage from "../pages/crosswords/[puzzleId]";
import { setApp } from "../lib/firebaseWrapper";
import * as firebaseTesting from "@firebase/testing";

jest.mock("../lib/firebaseWrapper");

window.HTMLElement.prototype.scrollIntoView = function () {};

const testPuzzle: PuzzleResult = {
  authorId: "test-author-id",
  category: null,
  authorName: "Mike D",
  moderated: true,
  publishTime: null,
  title: "Without company",
  size: { rows: 5, cols: 5 },
  clues: [
    { dir: 0, clue: '"A New ___": first Star Wars movie released', num: 1 },
    { dir: 0, clue: "Without company", num: 5 },
    { dir: 0, clue: "Fragrant spring flower", num: 7 },
    { dir: 0, clue: "Throw out", num: 8 },
    { dir: 0, clue: "This, in Madrid", num: 9 },
    { dir: 1, clue: "In good health", num: 1 },
    { dir: 1, clue: "Popeye's love", num: 2 },
    { dir: 1, clue: "Ancient Greek city-state", num: 3 },
    { dir: 1, clue: "Pass, as a law", num: 4 },
    { dir: 1, clue: 'Prefix used in "Ghostbusters"', num: 6 },
  ],
  grid: [
    "H",
    "O",
    "P",
    "E",
    ".",
    "A",
    "L",
    "O",
    "N",
    "E",
    "L",
    "I",
    "L",
    "A",
    "C",
    "E",
    "V",
    "I",
    "C",
    "T",
    ".",
    "E",
    "S",
    "T",
    "O",
  ],
  highlighted: [],
  highlight: "circle",
  id: "test-puzzle",
  comments: [],
};

test("clicking a clue sets slot to active", () => {
  const { getAllByText, getByLabelText } = render(
    <Puzzle puzzle={testPuzzle} play={null} isAdmin={false} />,
    {}
  );

  const cell = getByLabelText("cell0x1");
  expect(cell).toHaveStyleRule("background", "var(--secondary)");

  const cell2 = getByLabelText("cell1x1");
  expect(cell2).toHaveStyleRule("background", "var(--white)");

  const clue = getAllByText(/popeye's love/i)[0];
  expect(clue).toBeInTheDocument();
  fireEvent.click(clue);

  expect(cell).toHaveStyleRule("background", "var(--primary)");
  expect(cell2).toHaveStyleRule("background", "var(--secondary)");
});

test("daily mini from 5/19/20", () => {
  const p: PuzzleResult = {
    authorId: "fSEwJorvqOMK5UhNMHa4mu48izl1",
    category: "dailymini",
    authorName: "Mike D",
    moderated: true,
    publishTime: null,
    title: "Word of surrender",
    size: { rows: 5, cols: 5 },
    clues: [
      { dir: 0, clue: "Word with Cod or Canaveral", num: 1 },
      { dir: 0, clue: "Caustic compound", num: 4 },
      { dir: 0, clue: "Word of surrender", num: 6 },
      { dir: 0, clue: "Not feel well", num: 8 },
      { dir: 0, clue: '"Whats gotten ___ you?"', num: 9 },
      { dir: 1, clue: "Game with Miss Scarlet and Professor Plum", num: 1 },
      { dir: 1, clue: 'Rand who wrote "Atlas Shrugged"', num: 2 },
      { dir: 1, clue: "Butter ___ (ice cream flavor)", num: 3 },
      { dir: 1, clue: "Former Knicks star Anthony, to fans", num: 5 },
      { dir: 1, clue: "Exciting, in modern lingo", num: 7 },
    ],
    grid: [
      "C",
      "A",
      "P",
      "E",
      ".",
      "L",
      "Y",
      "E",
      ".",
      "M",
      "U",
      "N",
      "C",
      "L",
      "E",
      "E",
      ".",
      "A",
      "I",
      "L",
      ".",
      "I",
      "N",
      "T",
      "O",
    ],
    highlighted: [],
    highlight: "circle",
    comments: [],
    id: "iMwPVXfePmv3bJC6KaQL",
  };

  const {
    getByLabelText,
    getByText,
    queryByText,
    getAllByText,
    container,
  } = render(<Puzzle puzzle={p} play={null} isAdmin={false} />, {});

  fireEvent.click(getByText(/Begin Puzzle/i));
  expect(queryByText(/Begin Puzzle/i)).toBeNull();

  const clue = getAllByText(/professor plum/i)[0].parentElement?.parentElement;
  expect(clue).toHaveStyleRule("background-color", "var(--secondary)");

  // This puzzle has some cells w/ only a single entry (no cross) which were
  // causing errors when tabbing through the puzzle
  fireEvent.keyDown(container, { key: "Tab", keyCode: 9 });
  fireEvent.keyDown(container, { key: "Tab", keyCode: 9 });
  fireEvent.keyDown(container, { key: "Tab", keyCode: 9 });
  fireEvent.keyDown(container, { key: "Tab", keyCode: 9 });
  fireEvent.keyDown(container, { key: "Tab", keyCode: 9 });

  expect(clue).toHaveStyleRule("background-color", "var(--lighter)");

  // After a naive fix of the above issue we were still having problems on click
  fireEvent.click(getByLabelText("cell0x3"));
  const clueOne = getAllByText(/word with cod/i)[0].parentElement
    ?.parentElement;
  expect(clueOne).toHaveStyleRule("background-color", "var(--lighter)");
});

test("anonymous user progress should be cached in local storage", async () => {
  setApp(
    firebaseTesting.initializeTestApp({
      projectId: "test1",
    }) as firebase.app.App
  );
  const p: PuzzleResult = {
    authorId: "fSEwJorvqOMK5UhNMHa4mu48izl1",
    category: "dailymini",
    authorName: "Mike D",
    moderated: true,
    publishTime: null,
    title: "Word of surrender",
    size: { rows: 5, cols: 5 },
    clues: [
      { dir: 0, clue: "Word with Cod or Canaveral", num: 1 },
      { dir: 0, clue: "Caustic compound", num: 4 },
      { dir: 0, clue: "Word of surrender", num: 6 },
      { dir: 0, clue: "Not feel well", num: 8 },
      { dir: 0, clue: '"Whats gotten ___ you?"', num: 9 },
      { dir: 1, clue: "Game with Miss Scarlet and Professor Plum", num: 1 },
      { dir: 1, clue: 'Rand who wrote "Atlas Shrugged"', num: 2 },
      { dir: 1, clue: "Butter ___ (ice cream flavor)", num: 3 },
      { dir: 1, clue: "Former Knicks star Anthony, to fans", num: 5 },
      { dir: 1, clue: "Exciting, in modern lingo", num: 7 },
    ],
    grid: [
      "C",
      "A",
      "P",
      "E",
      ".",
      "L",
      "Y",
      "E",
      ".",
      "M",
      "U",
      "N",
      "C",
      "L",
      "E",
      "E",
      ".",
      "A",
      "I",
      "L",
      ".",
      "I",
      "N",
      "T",
      "O",
    ],
    highlighted: [],
    highlight: "circle",
    comments: [],
    id: "iMwPVXfePmv3bJC6KaQL",
  };

  const { debug, getByText, queryByText, getByLabelText, container } = render(
    <PuzzlePage puzzle={p} />,
    {}
  );

  debug(container);

  fireEvent.click(getByText(/Begin Puzzle/i));
  expect(queryByText(/Begin Puzzle/i)).toBeNull();

  fireEvent.keyDown(container, { key: "A", keyCode: 65 });
  fireEvent.keyDown(container, { key: "B", keyCode: 66 });
  fireEvent.keyDown(container, { key: "C", keyCode: 67 });

  expect(getByLabelText("grid")).toMatchInlineSnapshot(`
    .emotion-113 {
      -webkit-flex: none;
      -ms-flex: none;
      flex: none;
      width: 0;
      height: 0;
    }

    .emotion-4 {
      width: 20%;
      padding-bottom: 20%;
      float: left;
      position: relative;
      margin: 0;
      overflow: hidden;
    }

    .emotion-0 {
      position: absolute;
      left: 0.1em;
      top: 0;
      font-weight: bold;
      line-height: 1em;
      font-size: 0.05px;
    }

    .emotion-17 {
      color: var(--autofill);
      text-align: center;
      line-height: 1.2em;
      font-size: 0.18000000000000002px;
    }

    .emotion-1 {
      font-size: 1em;
    }

    .emotion-8 {
      -webkit-touch-callout: none;
      -webkit-user-select: none;
      -khtml-user-select: none;
      -moz-user-select: none;
      -ms-user-select: none;
      -webkit-user-select: none;
      -moz-user-select: none;
      -ms-user-select: none;
      user-select: none;
      position: absolute;
      width: 100%;
      height: 100%;
      border-right: 1px solid var(--cell-wall);
      border-bottom: 1px solid var(--cell-wall);
      border-top: 1px solid var(--cell-wall);
      border-left: 0;
      background: var(--secondary);
    }

    .emotion-20 {
      -webkit-touch-callout: none;
      -webkit-user-select: none;
      -khtml-user-select: none;
      -moz-user-select: none;
      -ms-user-select: none;
      -webkit-user-select: none;
      -moz-user-select: none;
      -ms-user-select: none;
      user-select: none;
      position: absolute;
      width: 100%;
      height: 100%;
      border-right: 1px solid var(--cell-wall);
      border-bottom: 1px solid var(--cell-wall);
      border-top: 1px solid var(--cell-wall);
      border-left: 0;
      background: var(--cell-wall);
    }

    .emotion-25 {
      -webkit-touch-callout: none;
      -webkit-user-select: none;
      -khtml-user-select: none;
      -moz-user-select: none;
      -ms-user-select: none;
      -webkit-user-select: none;
      -moz-user-select: none;
      -ms-user-select: none;
      user-select: none;
      position: absolute;
      width: 100%;
      height: 100%;
      border-right: 1px solid var(--cell-wall);
      border-bottom: 1px solid var(--cell-wall);
      border-top: 0;
      border-left: 1px solid var(--cell-wall);
      background: var(--white);
    }

    .emotion-30 {
      -webkit-touch-callout: none;
      -webkit-user-select: none;
      -khtml-user-select: none;
      -moz-user-select: none;
      -ms-user-select: none;
      -webkit-user-select: none;
      -moz-user-select: none;
      -ms-user-select: none;
      user-select: none;
      position: absolute;
      width: 100%;
      height: 100%;
      border-right: 1px solid var(--cell-wall);
      border-bottom: 1px solid var(--cell-wall);
      border-top: 0;
      border-left: 0;
      background: var(--white);
    }

    .emotion-91 {
      -webkit-touch-callout: none;
      -webkit-user-select: none;
      -khtml-user-select: none;
      -moz-user-select: none;
      -ms-user-select: none;
      -webkit-user-select: none;
      -moz-user-select: none;
      -ms-user-select: none;
      user-select: none;
      position: absolute;
      width: 100%;
      height: 100%;
      border-right: 1px solid var(--cell-wall);
      border-bottom: 1px solid var(--cell-wall);
      border-top: 0;
      border-left: 1px solid var(--cell-wall);
      background: var(--cell-wall);
    }

    .emotion-18 {
      -webkit-touch-callout: none;
      -webkit-user-select: none;
      -khtml-user-select: none;
      -moz-user-select: none;
      -ms-user-select: none;
      -webkit-user-select: none;
      -moz-user-select: none;
      -ms-user-select: none;
      user-select: none;
      position: absolute;
      width: 100%;
      height: 100%;
      border-right: 1px solid var(--cell-wall);
      border-bottom: 1px solid var(--cell-wall);
      border-top: 1px solid var(--cell-wall);
      border-left: 0;
      background: var(--primary);
    }

    .emotion-37 {
      -webkit-touch-callout: none;
      -webkit-user-select: none;
      -khtml-user-select: none;
      -moz-user-select: none;
      -ms-user-select: none;
      -webkit-user-select: none;
      -moz-user-select: none;
      -ms-user-select: none;
      user-select: none;
      position: absolute;
      width: 100%;
      height: 100%;
      border-right: 1px solid var(--cell-wall);
      border-bottom: 1px solid var(--cell-wall);
      border-top: 0;
      border-left: 0;
      background: var(--cell-wall);
    }

    .emotion-3 {
      -webkit-touch-callout: none;
      -webkit-user-select: none;
      -khtml-user-select: none;
      -moz-user-select: none;
      -ms-user-select: none;
      -webkit-user-select: none;
      -moz-user-select: none;
      -ms-user-select: none;
      user-select: none;
      position: absolute;
      width: 100%;
      height: 100%;
      border-right: 1px solid var(--cell-wall);
      border-bottom: 1px solid var(--cell-wall);
      border-top: 1px solid var(--cell-wall);
      border-left: 1px solid var(--cell-wall);
      background: var(--secondary);
    }

    .emotion-2 {
      color: var(--black);
      text-align: center;
      line-height: 1.2em;
      font-size: 0.18000000000000002px;
    }

    <div
      aria-label="grid"
      class="emotion-113"
    >
      <div
        class="emotion-4"
      >
        <div
          aria-label="cell0x0"
          class="emotion-3"
        >
          <div
            class="emotion-0"
          >
            
            1
          </div>
          <div
            class="emotion-2"
          >
            
            
            
            <div
              class="emotion-1"
            >
              A
            </div>
          </div>
        </div>
      </div>
      <div
        class="emotion-4"
      >
        <div
          aria-label="cell0x1"
          class="emotion-8"
        >
          <div
            class="emotion-0"
          >
            
            2
          </div>
          <div
            class="emotion-2"
          >
            
            
            
            <div
              class="emotion-1"
            >
              B
            </div>
          </div>
        </div>
      </div>
      <div
        class="emotion-4"
      >
        <div
          aria-label="cell0x2"
          class="emotion-8"
        >
          <div
            class="emotion-0"
          >
            
            3
          </div>
          <div
            class="emotion-2"
          >
            
            
            
            <div
              class="emotion-1"
            >
              C
            </div>
          </div>
        </div>
      </div>
      <div
        class="emotion-4"
      >
        <div
          aria-label="cell0x3"
          class="emotion-18"
        >
          <div
            class="emotion-0"
          >
            
            
          </div>
          <div
            class="emotion-17"
          >
            
            
            
            <div
              class="emotion-1"
            />
          </div>
        </div>
      </div>
      <div
        class="emotion-4"
      >
        <div
          aria-label="cell0x4"
          class="emotion-20"
        />
      </div>
      <div
        class="emotion-4"
      >
        <div
          aria-label="cell1x0"
          class="emotion-25"
        >
          <div
            class="emotion-0"
          >
            
            4
          </div>
          <div
            class="emotion-17"
          >
            
            
            
            <div
              class="emotion-1"
            />
          </div>
        </div>
      </div>
      <div
        class="emotion-4"
      >
        <div
          aria-label="cell1x1"
          class="emotion-30"
        >
          <div
            class="emotion-0"
          >
            
            
          </div>
          <div
            class="emotion-17"
          >
            
            
            
            <div
              class="emotion-1"
            />
          </div>
        </div>
      </div>
      <div
        class="emotion-4"
      >
        <div
          aria-label="cell1x2"
          class="emotion-30"
        >
          <div
            class="emotion-0"
          >
            
            
          </div>
          <div
            class="emotion-17"
          >
            
            
            
            <div
              class="emotion-1"
            />
          </div>
        </div>
      </div>
      <div
        class="emotion-4"
      >
        <div
          aria-label="cell1x3"
          class="emotion-37"
        />
      </div>
      <div
        class="emotion-4"
      >
        <div
          aria-label="cell1x4"
          class="emotion-30"
        >
          <div
            class="emotion-0"
          >
            
            5
          </div>
          <div
            class="emotion-17"
          >
            
            
            
            <div
              class="emotion-1"
            />
          </div>
        </div>
      </div>
      <div
        class="emotion-4"
      >
        <div
          aria-label="cell2x0"
          class="emotion-25"
        >
          <div
            class="emotion-0"
          >
            
            6
          </div>
          <div
            class="emotion-17"
          >
            
            
            
            <div
              class="emotion-1"
            />
          </div>
        </div>
      </div>
      <div
        class="emotion-4"
      >
        <div
          aria-label="cell2x1"
          class="emotion-30"
        >
          <div
            class="emotion-0"
          >
            
            
          </div>
          <div
            class="emotion-17"
          >
            
            
            
            <div
              class="emotion-1"
            />
          </div>
        </div>
      </div>
      <div
        class="emotion-4"
      >
        <div
          aria-label="cell2x2"
          class="emotion-30"
        >
          <div
            class="emotion-0"
          >
            
            
          </div>
          <div
            class="emotion-17"
          >
            
            
            
            <div
              class="emotion-1"
            />
          </div>
        </div>
      </div>
      <div
        class="emotion-4"
      >
        <div
          aria-label="cell2x3"
          class="emotion-30"
        >
          <div
            class="emotion-0"
          >
            
            7
          </div>
          <div
            class="emotion-17"
          >
            
            
            
            <div
              class="emotion-1"
            />
          </div>
        </div>
      </div>
      <div
        class="emotion-4"
      >
        <div
          aria-label="cell2x4"
          class="emotion-30"
        >
          <div
            class="emotion-0"
          >
            
            
          </div>
          <div
            class="emotion-17"
          >
            
            
            
            <div
              class="emotion-1"
            />
          </div>
        </div>
      </div>
      <div
        class="emotion-4"
      >
        <div
          aria-label="cell3x0"
          class="emotion-25"
        >
          <div
            class="emotion-0"
          >
            
            
          </div>
          <div
            class="emotion-17"
          >
            
            
            
            <div
              class="emotion-1"
            />
          </div>
        </div>
      </div>
      <div
        class="emotion-4"
      >
        <div
          aria-label="cell3x1"
          class="emotion-37"
        />
      </div>
      <div
        class="emotion-4"
      >
        <div
          aria-label="cell3x2"
          class="emotion-30"
        >
          <div
            class="emotion-0"
          >
            
            8
          </div>
          <div
            class="emotion-17"
          >
            
            
            
            <div
              class="emotion-1"
            />
          </div>
        </div>
      </div>
      <div
        class="emotion-4"
      >
        <div
          aria-label="cell3x3"
          class="emotion-30"
        >
          <div
            class="emotion-0"
          >
            
            
          </div>
          <div
            class="emotion-17"
          >
            
            
            
            <div
              class="emotion-1"
            />
          </div>
        </div>
      </div>
      <div
        class="emotion-4"
      >
        <div
          aria-label="cell3x4"
          class="emotion-30"
        >
          <div
            class="emotion-0"
          >
            
            
          </div>
          <div
            class="emotion-17"
          >
            
            
            
            <div
              class="emotion-1"
            />
          </div>
        </div>
      </div>
      <div
        class="emotion-4"
      >
        <div
          aria-label="cell4x0"
          class="emotion-91"
        />
      </div>
      <div
        class="emotion-4"
      >
        <div
          aria-label="cell4x1"
          class="emotion-30"
        >
          <div
            class="emotion-0"
          >
            
            9
          </div>
          <div
            class="emotion-17"
          >
            
            
            
            <div
              class="emotion-1"
            />
          </div>
        </div>
      </div>
      <div
        class="emotion-4"
      >
        <div
          aria-label="cell4x2"
          class="emotion-30"
        >
          <div
            class="emotion-0"
          >
            
            
          </div>
          <div
            class="emotion-17"
          >
            
            
            
            <div
              class="emotion-1"
            />
          </div>
        </div>
      </div>
      <div
        class="emotion-4"
      >
        <div
          aria-label="cell4x3"
          class="emotion-30"
        >
          <div
            class="emotion-0"
          >
            
            
          </div>
          <div
            class="emotion-17"
          >
            
            
            
            <div
              class="emotion-1"
            />
          </div>
        </div>
      </div>
      <div
        class="emotion-4"
      >
        <div
          aria-label="cell4x4"
          class="emotion-30"
        >
          <div
            class="emotion-0"
          >
            
            
          </div>
          <div
            class="emotion-17"
          >
            
            
            
            <div
              class="emotion-1"
            />
          </div>
        </div>
      </div>
    </div>
  `);
});
