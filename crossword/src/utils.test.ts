import cases from 'jest-in-case';

import { fnv1a } from './utils';


cases('fnv1a hash function', opts => {
  expect(fnv1a(opts.name)).toEqual(opts.hash)
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
