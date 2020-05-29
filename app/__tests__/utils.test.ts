import cases from 'jest-in-case';

import { fnv1a, hslToRgb } from '../lib/utils';


cases('fnv1a hash function', opts => {
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

cases('hslToRgb color conversion', opts => {
  expect(hslToRgb(opts.h, opts.s, opts.l)).toEqual(opts.rgb);
},
[
  { name: 'a', h: 0, s: 0, l: 0, rgb: [0, 0, 0] },
  { name: 'b', h: 0.25, s: 0.56, l: 0.17, rgb: [43, 68, 19] },
  { name: 'c', h: 0.561, s: 0.19, l: 0.39, rgb: [81, 105, 118] },
  { name: 'd', h: 0.2, s: 0.55, l: 0.26, rgb: [88, 103, 30] },
]
);
