import { build, matchingWords, matchingBitmap, dbEncoded } from '../lib/WordDB';

test('build word db', async () => {
  await build('TEST;50\n\rBEST;60\n\rTESTER;50');
  console.log(dbEncoded);

  const good = matchingBitmap('TE  ');
  const good2 = matchingBitmap(' E  ');
  const bad = matchingBitmap(' F  ');
  expect(matchingWords(4, bad)).toEqual([]);
  expect(matchingWords(4, good)).toEqual([['TEST', 50]]);
  expect(matchingWords(4, good2)).toEqual([['BEST', 60], ['TEST', 50]]);
  expect(matchingWords(6, matchingBitmap(' E    '))).toEqual([['TESTER', 50]]);
});
