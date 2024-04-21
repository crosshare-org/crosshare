#!/usr/bin/env -S NODE_OPTIONS='--loader ts-node/esm --experimental-specifier-resolution=node' npx ts-node-script
export {};

import fs from 'fs';
import util from 'util';
import { rawBuild } from '../lib/WordDB';

const writeFile = util.promisify(fs.writeFile);
const readFile = util.promisify(fs.readFile);

if (process.argv.length !== 7) {
  throw Error(
    'Invalid use of buildWordlist.\nUsage: `buildWordlist.ts <path to peter brodas list> <path to cluedata> <path to expanded wordlist> <path to spread the wordlist> <output filename>`'
  );
}

const peters = process.argv[2];
const cluedata = process.argv[3];
const expanded = process.argv[4];
const spread = process.argv[5];
const out = process.argv[6];

const MAX_LENGTH = 15;

if (!peters || !cluedata || !expanded || !spread || !out) {
  throw new Error('bad args');
}

const wordlist: Record<string, 0 | 1 | 2 | 3> = {};

const peterScoreMap = (petersScore: number): 0 | 1 | 2 | 3 => {
  if (petersScore < 60) {
    return 0;
  }
  return 1;
};

const spreadScoreMap = (spreadScore: number): 0 | 1 | 2 | 3 => {
  if (spreadScore < 30) {
    return 0;
  }
  if (spreadScore < 40) {
    return 1;
  }
  if (spreadScore < 50) {
    return 2;
  }
  return 3;
};

const cluedataScoreMap = (score: number): 0 | 1 | 2 | 3 => {
  if (score < 5) {
    return 0;
  }
  if (score < 15) {
    return 1;
  }
  return 2;
};

function fileContentsToWords(contents: string): [string, number][] {
  const wordLines = contents.match(/[^\r\n]+/g);
  if (!wordLines) {
    throw new Error('malformed wordlist');
  }
  return wordLines
    .map((s): [string, string] => {
      const split = s.toUpperCase().split(';');
      if (split[0] && split[1]) {
        return [split[0], split[1]];
      }
      if (split[0]) {
        return [split[0], '0'];
      }
      console.log('malformed word: ' + s);
      return ['1', '0'];
    })
    .filter((s) => !/[^A-Z]/.test(s[0])) /* Filter any words w/ non-letters */
    .map((s): [string, number] => [s[0], parseInt(s[1])]);
}

async function buildWordlist(
  peters: string,
  cluedata: string,
  expanded: string,
  spread: string
) {
  await readFile(spread, 'utf8').then((sc: string) => {
    const spreadWords = fileContentsToWords(sc);
    spreadWords.forEach(([word, score]) => {
      if (word.length <= MAX_LENGTH) {
        wordlist[word] = spreadScoreMap(score);
      }
    });
  });

  await readFile(peters, 'utf8').then((pc: string) => {
    const peterWords = fileContentsToWords(pc);
    peterWords.forEach(([word, score]) => {
      const newScore = peterScoreMap(score);
      if (
        score >= 50 &&
        word.length <= MAX_LENGTH &&
        newScore >= (wordlist[word] || 0)
      ) {
        console.log('adding from peter: ', word);
        wordlist[word] = newScore;
      }
    });
  });

  await readFile(cluedata, 'utf8').then((cc: string) => {
    const cluedataWords = fileContentsToWords(cc);
    cluedataWords.forEach(([word, score]) => {
      const newScore = cluedataScoreMap(score);
      if (word.length <= MAX_LENGTH && newScore > (wordlist[word] || 0)) {
        console.log('adding from cluedata: ', word);
        wordlist[word] = newScore;
      }
    });
  });

  await readFile(expanded, 'utf8').then((ec: string) => {
    const expandedWords = fileContentsToWords(ec);
    expandedWords.forEach(([word]) => {
      if (word.length <= MAX_LENGTH && 1 > (wordlist[word] || 0)) {
        console.log('adding from expanded: ', word);
        wordlist[word] = 1;
      }
    });
  });
}

buildWordlist(peters, cluedata, expanded, spread)
  .then(async () => {
    console.log('starting build');
    const db = rawBuild(Object.entries(wordlist));
    console.log('built');

    const outContent = JSON.stringify(db);
    await writeFile(out, outContent).then(() => {
      console.log('wrote result to ' + out);
    });
  })
  .catch((e: unknown) => {
    console.log(e);
  });
