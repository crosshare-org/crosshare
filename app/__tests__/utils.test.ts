import cases from 'jest-in-case';

import { checkGrid, fnv1a, hslToRgb, isMetaSolution } from '../lib/utils';

cases(
  'fnv1a hash function',
  (opts) => {
    expect(fnv1a(opts.name)).toEqual(opts.hash);
  },
  [
    { name: '', hash: 0x811c9dc5 },
    { name: 'a', hash: 0xe40c292c },
    { name: 'b', hash: 0xe70c2de5 },
    { name: 'c', hash: 0xe60c2c52 },
    { name: 'd', hash: 0xe10c2473 },
    { name: 'e', hash: 0xe00c22e0 },
    { name: 'f', hash: 0xe30c2799 },
    { name: 'fo', hash: 0x6222e842 },
    { name: 'foo', hash: 0xa9f37ed7 },
    { name: 'foob', hash: 0x3f5076ef },
    { name: 'fooba', hash: 0x39aaa18a },
    { name: 'foobar', hash: 0xbf9cf968 },
  ]
);

cases(
  'hslToRgb color conversion',
  (opts) => {
    expect(hslToRgb(opts.h, opts.s, opts.l)).toEqual(opts.rgb);
  },
  [
    { name: 'a', h: 0, s: 0, l: 0, rgb: [0, 0, 0] },
    { name: 'b', h: 0.25, s: 0.56, l: 0.17, rgb: [43, 68, 19] },
    { name: 'c', h: 0.561, s: 0.19, l: 0.39, rgb: [81, 105, 118] },
    { name: 'd', h: 0.2, s: 0.55, l: 0.26, rgb: [88, 103, 30] },
  ]
);

test('isMetaSolution', () => {
  expect(isMetaSolution('foo', ['FOO'])).toBeTruthy();
  expect(isMetaSolution(' fo  o ', ['FOO'])).toBeTruthy();
  expect(isMetaSolution('foo!', ['FO  O'])).toBeTruthy();
  expect(isMetaSolution('f@o-o!', ['F[OO]'])).toBeTruthy();

  expect(isMetaSolution('bar', ['FOO'])).not.toBeTruthy();
  expect(isMetaSolution('bar!', ['FOO', 'b a r'])).toBeTruthy();
});

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
