import cases from 'jest-in-case';

import { checkGrid, isMetaSolution, slugify } from '../lib/utils';

test('isMetaSolution', () => {
  expect(isMetaSolution('foo', ['FOO'])).toBeTruthy();
  expect(isMetaSolution(' fo  o ', ['FOO'])).toBeTruthy();
  expect(isMetaSolution('foo!', ['FO  O'])).toBeTruthy();
  expect(isMetaSolution('f@o-o!', ['F[OO]'])).toBeTruthy();

  expect(isMetaSolution('bar', ['FOO'])).not.toBeTruthy();
  expect(isMetaSolution('bar!', ['FOO', 'b a r'])).toBeTruthy();
});

cases(
  'slugify',
  (opts) => {
    expect(slugify(opts.input)).toEqual(opts.output);
  },
  [
    { input: '', output: '' },
    { input: 'test', output: 'test' },
    { input: 'TEST', output: 'test' },
    { input: '  te st  ', output: 'te-st' },
    { input: '  te-st  ', output: 'te-st' },
    { input: 'te@st', output: 'test' },
    { input: undefined, output: '' },
    { input: null, output: '' },
    { input: 'tè,é,ê,ëstÑ', output: 'teeeestn' },
    { input: 'what about 😂', output: 'what-about' },
    { input: 'what-----about', output: 'what-about' },
    {
      input:
        'heres a long one heres a long one heres a long one heres a long one heres a long one heres a long one heres a long one heres a long one heres a long one heres a long one heres a long one heres a long one heres a long one heres a long one heres a long one heres a long one heres a long one heres a long one heres a long one ',
      output:
        'heres-a-long-one-heres-a-long-one-heres-a-long-one-heres-a-long-one-heres-a-long-one-heres-a-long-on',
    },
  ]
);

cases(
  'checkGrid',
  (opts) => {
    expect(checkGrid(opts.grid, opts.answers, opts.alts)).toEqual(opts.res);
  },
  [
    { grid: [], answers: [], alts: [], res: [true, true] },
    { grid: ['', 'B'], answers: ['A', 'B'], alts: [], res: [false, false] },
    { grid: ['B', 'B'], answers: ['A', 'B'], alts: [], res: [true, false] },
    { grid: ['A', 'B'], answers: ['A', 'B'], alts: [], res: [true, true] },
    {
      grid: ['B', 'B'],
      answers: ['A', 'B'],
      alts: [[<[number, string]>[0, 'C']]],
      res: [true, false],
    },
    {
      grid: ['B', 'B'],
      answers: ['A', 'B'],
      alts: [[<[number, string]>[0, 'B']]],
      res: [true, true],
    },
    {
      grid: ['B', 'B', 'C', 'C'],
      answers: ['A', 'B', 'C', 'D'],
      alts: [[<[number, string]>[0, 'B']]],
      res: [true, false],
    },
    {
      grid: ['B', 'B', 'C', 'C'],
      answers: ['A', 'B', 'C', 'D'],
      alts: [[<[number, string]>[0, 'B'], <[number, string]>[3, 'C']]],
      res: [true, true],
    },
    {
      grid: ['B', 'B', 'C', 'C'],
      answers: ['A', 'B', 'C', 'D'],
      alts: [[<[number, string]>[0, 'D'], <[number, string]>[3, 'C']]],
      res: [true, false],
    },
    {
      grid: ['B', 'B', 'C', 'C'],
      answers: ['A', 'B', 'C', 'D'],
      alts: [[<[number, string]>[0, 'B'], <[number, string]>[3, 'A']]],
      res: [true, false],
    },
    {
      grid: ['B', 'B', 'C', 'C'],
      answers: ['A', 'B', 'C', 'D'],
      alts: [
        [<[number, string]>[0, 'D']],
        [<[number, string]>[0, 'B'], <[number, string]>[3, 'C']],
      ],
      res: [true, true],
    },
    {
      grid: ['B', 'B', 'C', 'C'],
      answers: ['A', 'B', 'C', 'D'],
      alts: [[<[number, string]>[0, 'B']], [<[number, string]>[3, 'C']]],
      res: [true, true],
    },
  ]
);
