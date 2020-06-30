#!/usr/bin/env ts-node-script
export { };

// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require('fs');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const util = require('util');

const writeFile = util.promisify(fs.writeFile);
const readFile = util.promisify(fs.readFile);

if (process.argv.length !== 5) {
  throw Error('Invalid use of buildWordlist.\nUsage: `buildWordlist.ts <path to peter brodas list> <path to cluedata> <output filename>`');
}

const peters = process.argv[2];
// const cluedata = process.argv[3];
const out = process.argv[4];

const wordlist: Record<string, 0 | 1 | 2 | 3> = {};

const peterScoreMap = (petersScore: number): 0 | 1 | 2 | 3 => {
  if (petersScore < 50) {
    return 0;
  }
  if (petersScore < 60) {
    return 1;
  }
  if (petersScore < 80) {
    return 2;
  }
  return 3;
};

readFile(peters).then((contents: string) => {
  const wordLines = String(contents).match(/[^\r\n]+/g);
  if (!wordLines) {
    throw new Error('malformed wordlist');
  }
  const words: Array<[string, number]> = wordLines
    .map(s => s.toUpperCase().split(';'))
    .filter(s => !/[^A-Z]/.test(s[0])) /* Filter any words w/ non-letters */
    .map((s): [string, number] => [s[0], parseInt(s[1])])
    .filter(s => s[1] > 35); /* Filter out anything peter says he wouldnt use */
  words.forEach(([word, score]) => {
    wordlist[word] = peterScoreMap(score);
  });

  const outContent = Object.keys(wordlist).map(word => word + ';' + wordlist[word]).join('\n');
  writeFile(out, outContent).then(() => {
    console.log('wrote result to ' + out);
  });
});
