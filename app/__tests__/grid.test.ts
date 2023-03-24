import { entriesFromCells } from '../lib/gridBase';
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
Array [
  Array [
    Object {
      "cells": Array [
        Object {
          "col": 0,
          "row": 0,
        },
        Object {
          "col": 1,
          "row": 0,
        },
      ],
      "completedWord": "AB",
      "direction": 0,
      "index": 0,
      "pattern": "AB",
    },
    Object {
      "cells": Array [
        Object {
          "col": 0,
          "row": 0,
        },
        Object {
          "col": 0,
          "row": 1,
        },
      ],
      "completedWord": "AC",
      "direction": 1,
      "index": 1,
      "pattern": "AC",
    },
    Object {
      "cells": Array [
        Object {
          "col": 1,
          "row": 0,
        },
        Object {
          "col": 1,
          "row": 1,
        },
      ],
      "completedWord": "BD",
      "direction": 1,
      "index": 2,
      "pattern": "BD",
    },
    Object {
      "cells": Array [
        Object {
          "col": 0,
          "row": 1,
        },
        Object {
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
  Array [
    Array [
      Object {
        "cellIndex": 0,
        "entryIndex": 0,
        "wordIndex": 0,
      },
      Object {
        "cellIndex": 0,
        "entryIndex": 1,
        "wordIndex": 0,
      },
    ],
    Array [
      Object {
        "cellIndex": 1,
        "entryIndex": 0,
        "wordIndex": 1,
      },
      Object {
        "cellIndex": 0,
        "entryIndex": 2,
        "wordIndex": 0,
      },
    ],
    Array [
      Object {
        "cellIndex": 0,
        "entryIndex": 3,
        "wordIndex": 0,
      },
      Object {
        "cellIndex": 1,
        "entryIndex": 1,
        "wordIndex": 1,
      },
    ],
    Array [
      Object {
        "cellIndex": 1,
        "entryIndex": 3,
        "wordIndex": 1,
      },
      Object {
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
Array [
  Array [
    Object {
      "cells": Array [
        Object {
          "col": 0,
          "row": 0,
        },
        Object {
          "col": 0,
          "row": 1,
        },
      ],
      "completedWord": "AC",
      "direction": 1,
      "index": 0,
      "pattern": "AC",
    },
    Object {
      "cells": Array [
        Object {
          "col": 0,
          "row": 1,
        },
        Object {
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
  Array [
    Array [
      Object {
        "cellIndex": 0,
        "entryIndex": null,
        "wordIndex": 0,
      },
      Object {
        "cellIndex": 0,
        "entryIndex": 0,
        "wordIndex": 0,
      },
    ],
    Array [
      Object {
        "cellIndex": 0,
        "entryIndex": null,
        "wordIndex": 0,
      },
      Object {
        "cellIndex": 0,
        "entryIndex": null,
        "wordIndex": 0,
      },
    ],
    Array [
      Object {
        "cellIndex": 0,
        "entryIndex": 1,
        "wordIndex": 0,
      },
      Object {
        "cellIndex": 1,
        "entryIndex": 0,
        "wordIndex": 1,
      },
    ],
    Array [
      Object {
        "cellIndex": 1,
        "entryIndex": 1,
        "wordIndex": 1,
      },
      Object {
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
    vBars: new Set<number>(),
    hBars: new Set<number>(),
    hidden: new Set<number>(),
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
    vBars: new Set<number>(),
    hBars: new Set<number>(),
    hidden: new Set<number>(),
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
    vBars: new Set<number>(),
    hBars: new Set<number>(),
    allowBlockEditing: false,
    highlighted: new Set<number>(),
    highlight: 'circle',
    hidden: new Set<number>(),
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
    vBars: new Set<number>(),
    hBars: new Set<number>(),
    allowBlockEditing: false,
    hidden: new Set<number>(),
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

  const cluedGrid: CluedGrid = addClues(grid, [
    { num: 1, dir: 0, clue: '!@Not down 5-acrosses', explanation: null },
    { num: 3, dir: 0, clue: '2-downs Then...', explanation: null },
    {
      num: 1,
      dir: 1,
      clue: '!@ 1- and 3- acrosses You and I',
      explanation: null,
    },
    { num: 2, dir: 1, clue: '1-A Post office abbr.', explanation: null },
  ]);
  expect(getRefs(cluedGrid)).toMatchSnapshot();
});
