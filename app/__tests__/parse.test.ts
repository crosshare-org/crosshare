import { parseClueReferences } from '../lib/parse.js';

test.each([
  { name: '', result: [] },
  {
    name: 'How about a simple 1-Across?',
    result: [
      {
        direction: 0,
        labelNumber: 1,
        start: 19,
        end: 27,
      },
    ],
  },
  {
    name: 'But not1-Across?',
    result: [],
  },
  {
    name: 'But not @1-Across?',
    result: [],
  },
  {
    name: '43D should work, and 2 down',
    result: [
      {
        direction: 1,
        labelNumber: 43,
        start: 0,
        end: 3,
      },
      {
        direction: 1,
        labelNumber: 2,
        start: 21,
        end: 27,
      },
    ],
  },

  {
    name: '1, 2,3,4-, and 5-across should work',
    result: [
      {
        direction: 0,
        labelNumber: 1,
        start: 0,
        end: 1,
      },
      {
        direction: 0,
        labelNumber: 2,
        start: 3,
        end: 4,
      },
      {
        direction: 0,
        labelNumber: 3,
        start: 5,
        end: 6,
      },
      {
        direction: 0,
        labelNumber: 4,
        start: 7,
        end: 8,
      },
      {
        direction: 0,
        labelNumber: 5,
        start: 15,
        end: 23,
      },
    ],
  },

  {
    name: '1, 2,3,4-, or 5-across should work too',
    result: [
      {
        direction: 0,
        labelNumber: 1,
        start: 0,
        end: 1,
      },
      {
        direction: 0,
        labelNumber: 2,
        start: 3,
        end: 4,
      },
      {
        direction: 0,
        labelNumber: 3,
        start: 5,
        end: 6,
      },
      {
        direction: 0,
        labelNumber: 4,
        start: 7,
        end: 8,
      },
      {
        direction: 0,
        labelNumber: 5,
        start: 14,
        end: 22,
      },
    ],
  },
  {
    name: 'See 1-Diagonal and 2DG and 3-Diagonal Down Left',
    result: [
      {
        direction: 2,
        labelNumber: 1,
        start: 4,
        end: 14,
      },
      {
        direction: 2,
        labelNumber: 2,
        start: 19,
        end: 22,
      },
      {
        direction: 3,
        labelNumber: 3,
        start: 27,
        end: 47,
      },
    ],
  },
  {
    name: 'Also 1↘ and 2-Diagonal Down Right and 3↙',
    result: [
      {
        direction: 2,
        labelNumber: 1,
        start: 5,
        end: 7,
      },
      {
        direction: 2,
        labelNumber: 2,
        start: 12,
        end: 33,
      },
      {
        direction: 3,
        labelNumber: 3,
        start: 38,
        end: 40,
      },
    ],
  },
])('parseClueReferences', (opts) => {
  expect(parseClueReferences(opts.name)).toEqual(opts.result);
});
