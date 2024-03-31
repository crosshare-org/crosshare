import cases from 'jest-in-case';
import { parseClueReferences } from '../lib/parse';

cases(
  'parseClueReferences',
  (opts) => {
    expect(parseClueReferences(opts.name)).toEqual(opts.result);
  },
  [
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
  ]
);
