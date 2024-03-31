import { entriesFromCells } from '../lib/gridBase';
import { markdownToHast } from '../lib/markdown/markdown';
import {
  addClues,
  CluedGrid,
  fromCells,
  getEntryToClueMap,
  getRefs,
} from '../lib/viewableGrid';

test('test entriesFromCells', () => {
  expect(entriesFromCells(2, 2, ['A', 'B', 'C', 'D'], new Set(), new Set()))
    .toMatchInlineSnapshot(`
    [
      [
        {
          "cells": [
            {
              "col": 0,
              "row": 0,
            },
            {
              "col": 1,
              "row": 0,
            },
          ],
          "completedWord": "AB",
          "direction": 0,
          "index": 0,
          "pattern": "AB",
        },
        {
          "cells": [
            {
              "col": 0,
              "row": 0,
            },
            {
              "col": 0,
              "row": 1,
            },
          ],
          "completedWord": "AC",
          "direction": 1,
          "index": 1,
          "pattern": "AC",
        },
        {
          "cells": [
            {
              "col": 1,
              "row": 0,
            },
            {
              "col": 1,
              "row": 1,
            },
          ],
          "completedWord": "BD",
          "direction": 1,
          "index": 2,
          "pattern": "BD",
        },
        {
          "cells": [
            {
              "col": 0,
              "row": 1,
            },
            {
              "col": 1,
              "row": 1,
            },
          ],
          "completedWord": "CD",
          "direction": 0,
          "index": 3,
          "pattern": "CD",
        },
      ],
      [
        [
          {
            "cellIndex": 0,
            "entryIndex": 0,
            "wordIndex": 0,
          },
          {
            "cellIndex": 0,
            "entryIndex": 1,
            "wordIndex": 0,
          },
        ],
        [
          {
            "cellIndex": 1,
            "entryIndex": 0,
            "wordIndex": 1,
          },
          {
            "cellIndex": 0,
            "entryIndex": 2,
            "wordIndex": 0,
          },
        ],
        [
          {
            "cellIndex": 0,
            "entryIndex": 3,
            "wordIndex": 0,
          },
          {
            "cellIndex": 1,
            "entryIndex": 1,
            "wordIndex": 1,
          },
        ],
        [
          {
            "cellIndex": 1,
            "entryIndex": 3,
            "wordIndex": 1,
          },
          {
            "cellIndex": 1,
            "entryIndex": 2,
            "wordIndex": 1,
          },
        ],
      ],
    ]
  `);

  expect(
    entriesFromCells(2, 2, ['A', 'B', 'C', 'D'], new Set([0]), new Set([1]))
  ).toMatchInlineSnapshot(`
    [
      [
        {
          "cells": [
            {
              "col": 0,
              "row": 0,
            },
            {
              "col": 0,
              "row": 1,
            },
          ],
          "completedWord": "AC",
          "direction": 1,
          "index": 0,
          "pattern": "AC",
        },
        {
          "cells": [
            {
              "col": 0,
              "row": 1,
            },
            {
              "col": 1,
              "row": 1,
            },
          ],
          "completedWord": "CD",
          "direction": 0,
          "index": 1,
          "pattern": "CD",
        },
      ],
      [
        [
          {
            "cellIndex": 0,
            "entryIndex": null,
            "wordIndex": 0,
          },
          {
            "cellIndex": 0,
            "entryIndex": 0,
            "wordIndex": 0,
          },
        ],
        [
          {
            "cellIndex": 0,
            "entryIndex": null,
            "wordIndex": 0,
          },
          {
            "cellIndex": 0,
            "entryIndex": null,
            "wordIndex": 0,
          },
        ],
        [
          {
            "cellIndex": 0,
            "entryIndex": 1,
            "wordIndex": 0,
          },
          {
            "cellIndex": 1,
            "entryIndex": 0,
            "wordIndex": 1,
          },
        ],
        [
          {
            "cellIndex": 1,
            "entryIndex": 1,
            "wordIndex": 1,
          },
          {
            "cellIndex": 0,
            "entryIndex": null,
            "wordIndex": 0,
          },
        ],
      ],
    ]
  `);
});

test('test getEntryToClueMap', () => {
  const answers = ['U', 'P', 'S', 'O'];
  const grid = fromCells({
    width: 2,
    height: 2,
    cells: answers,
    allowBlockEditing: false,
    hidden: new Set<number>(),
    highlighted: new Set<number>(),
    vBars: new Set<number>(),
    hBars: new Set<number>(),
    highlight: 'circle',
    mapper: (x) => x,
  });

  const cluedGrid: CluedGrid = addClues(
    grid,
    [
      { num: 1, dir: 0, clue: 'Not down', explanation: null },
      { num: 3, dir: 0, clue: 'Then...', explanation: null },
      { num: 1, dir: 1, clue: 'You and I', explanation: null },
      { num: 2, dir: 1, clue: 'Post office abbr.', explanation: null },
    ],
    (c: string) => markdownToHast({ text: c, inline: true })
  );

  const res = getEntryToClueMap(cluedGrid, answers);
  expect(res).toMatchSnapshot();
});

test('test getClueRefs for puzzle without any', () => {
  const answers = ['U', 'P', 'S', 'O'];
  const grid = fromCells({
    width: 2,
    height: 2,
    cells: answers,
    vBars: new Set<number>(),
    hBars: new Set<number>(),
    hidden: new Set<number>(),
    allowBlockEditing: false,
    highlighted: new Set<number>(),
    highlight: 'circle',
    mapper: (x) => x,
  });

  const cluedGrid: CluedGrid = addClues(
    grid,
    [
      { num: 1, dir: 0, clue: 'Not down', explanation: null },
      { num: 3, dir: 0, clue: 'Then...', explanation: null },
      { num: 1, dir: 1, clue: 'You and I', explanation: null },
      { num: 2, dir: 1, clue: 'Post office abbr.', explanation: null },
    ],
    (c: string) => markdownToHast({ text: c, inline: true })
  );

  expect(getRefs(cluedGrid)).toMatchSnapshot();
});

test('test getClueRefs for puzzle with refs', () => {
  const answers = ['U', 'P', 'S', 'O'];
  const grid = fromCells({
    width: 2,
    height: 2,
    cells: answers,
    vBars: new Set<number>(),
    hBars: new Set<number>(),
    hidden: new Set<number>(),
    allowBlockEditing: false,
    highlighted: new Set<number>(),
    highlight: 'circle',
    mapper: (x) => x,
  });

  const cluedGrid: CluedGrid = addClues(
    grid,
    [
      { num: 1, dir: 0, clue: 'Not down 5-across', explanation: null },
      { num: 3, dir: 0, clue: '2-down Then...', explanation: null },
      { num: 1, dir: 1, clue: '1- and 3- across You and I', explanation: null },
      { num: 2, dir: 1, clue: '3A Post office abbr.', explanation: null },
    ],
    (c: string) => markdownToHast({ text: c, inline: true })
  );

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
    vBars: new Set<number>(),
    hBars: new Set<number>(),
    allowBlockEditing: false,
    highlighted: new Set<number>(),
    highlight: 'circle',
    hidden: new Set<number>(),
    mapper: (x) => x,
  });

  const cluedGrid: CluedGrid = addClues(
    grid,
    [
      { num: 1, dir: 0, clue: '*Not down', explanation: null },
      { num: 3, dir: 0, clue: '**But not this one!**', explanation: null },
      { num: 1, dir: 1, clue: '* You and I', explanation: null },
      {
        num: 2,
        dir: 1,
        clue: 'Post office the starred clues abbr.',
        explanation: null,
      },
    ],
    (c: string) => markdownToHast({ text: c, inline: true })
  );

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
    vBars: new Set<number>(),
    hBars: new Set<number>(),
    allowBlockEditing: false,
    hidden: new Set<number>(),
    highlighted: new Set<number>(),
    highlight: 'circle',
    mapper: (x) => x,
  });

  const cluedGrid: CluedGrid = addClues(
    grid,
    [
      { num: 1, dir: 0, clue: 'Not down 5-acrosses', explanation: null },
      { num: 3, dir: 0, clue: '2-downs Then...', explanation: null },
      {
        num: 1,
        dir: 1,
        clue: '1- and 3- acrosses You and I',
        explanation: null,
      },
      { num: 2, dir: 1, clue: '1-A Post office abbr.', explanation: null },
    ],
    (c: string) => markdownToHast({ text: c, inline: true })
  );

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

test('test getClueRefs for 35-downs with !@', () => {
  const answers = ['U', 'P', 'S', 'O'];
  const grid = fromCells({
    width: 2,
    height: 2,
    cells: answers,
    vBars: new Set<number>(),
    hBars: new Set<number>(),
    allowBlockEditing: false,
    highlighted: new Set<number>(),
    highlight: 'circle',
    hidden: new Set<number>(),
    mapper: (x) => x,
  });

  const cluedGrid: CluedGrid = addClues(
    grid,
    [
      { num: 1, dir: 0, clue: '!@Not down 5-acrosses', explanation: null },
      { num: 3, dir: 0, clue: '2-downs Then...', explanation: null },
      {
        num: 1,
        dir: 1,
        clue: '!@ 1- and 3- acrosses You and I',
        explanation: null,
      },
      { num: 2, dir: 1, clue: '1-A Post office abbr.', explanation: null },
    ],
    (c: string) => markdownToHast({ text: c, inline: true })
  );
  expect(getRefs(cluedGrid)).toMatchSnapshot();
});
