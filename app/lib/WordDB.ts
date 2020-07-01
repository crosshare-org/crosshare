import * as t from 'io-ts';
import { isRight } from 'fp-ts/lib/Either';
import { PathReporter } from 'io-ts/lib/PathReporter';
import { set, get } from 'idb-keyval';

import * as BA from './bitArray';


const WordDBV = t.type({
  words: t.record(t.string, t.array(t.tuple([t.string, t.number]))),
  bitmaps: t.record(t.string, t.array(t.number)),
});
export type WordDBT = t.TypeOf<typeof WordDBV>;

export enum DBStatus {
  uninitialized,
  building,
  notPresent,
  present,
  disabled,
}

export let wordDB: WordDBT | undefined = undefined;
export let dbStatus: DBStatus = DBStatus.uninitialized;

const STORAGE_KEY = 'db';

export const initialize = async (): Promise<boolean> => {
  if (dbStatus !== DBStatus.uninitialized) {
    throw new Error('trying to initialize non-uninitialized worddb');
  }

  dbStatus = DBStatus.building;
  console.log('trying to load from idb');
  return get(STORAGE_KEY).then(db => {
    if (db) {
      console.log('loaded');
      const validationResult = WordDBV.decode(db);
      if (isRight(validationResult)) {
        console.log('validated');
        wordDB = validationResult.right;
        dbStatus = DBStatus.present;
        return true;
      } else {
        console.error(PathReporter.report(validationResult).join(','));
      }
    }
    console.log('failed to load');
    dbStatus = DBStatus.notPresent;
    return false;
  });
};

export const build = async (wordlist: string, updateProgress?: (percentDone: number) => void): Promise<void> => {
  console.log('building db');
  dbStatus = DBStatus.building;
  const wordLines = wordlist.match(/[^\r\n]+/g);
  if (!wordLines) {
    throw new Error('malformed wordlist');
  }
  const words: Array<[string, number]> = wordLines
    .map(s => s.toUpperCase().split(';'))
    .filter(s => !/[^A-Z]/.test(s[0])) /* Filter any words w/ non-letters */
    .map((s): [string, number] => [s[0], parseInt(s[1])])
    .sort((s1, s2) => (s1[1] - s2[1]) || s2[0].localeCompare(s1[0]));

  if (updateProgress) {
    updateProgress(10);
  }
  const count = words.length;

  console.log('building words by length');
  const wordsByLength: Record<number, Array<[string, number]>> = words.reduce(
    (acc: Record<number, Array<[string, number]>>, [word, score]) => {
      if (acc[word.length]) {
        acc[word.length].push([word, score]);
      } else {
        acc[word.length] = [[word, score]];
      }
      return acc;
    }, {});

  if (updateProgress) {
    updateProgress(25);
  }

  const bitmaps: Record<string, BA.BitArray> = {};
  console.log('building bitmaps');

  let wordsDone = 0;
  Object.keys(wordsByLength).map(lengthStr => {
    const length = parseInt(lengthStr);
    const wordlist = wordsByLength[length];
    for (let i = 0; i < 26; i += 1) {
      const letter = String.fromCharCode(65 + i);
      for (let idx = 0; idx < length; idx += 1) {
        const bitmap = BA.zero();
        wordlist.forEach((word, wordIdx) => {
          if (word[0][idx] === letter) {
            BA.setBit(bitmap, wordIdx);
          }
        });
        bitmaps[lengthStr + letter + idx.toString()] = bitmap;
      }
    }
    wordsDone += wordlist.length;
    if (updateProgress) {
      updateProgress(25 + 65 * wordsDone / count);
    }
  });

  console.log('built, updating local storage');
  wordDB = { words: wordsByLength, bitmaps };
  try {
    await set(STORAGE_KEY, wordDB);
  } catch {
    console.error('Could not write to indexeddb!');
  }
  dbStatus = DBStatus.present;
  console.log('done');
};

export function setDb(newdb: WordDBT) {
  wordDB = newdb;
}

const ZERO = BA.zero();

export function highestScore(length: number, bitmap: BA.BitArray | null) {
  if (!wordDB) {
    throw new Error('uninitialized!');
  }
  const words = wordDB.words[length];
  if (bitmap === null) {
    return words[words.length - 1];
  }
  return words[BA.bitLength(bitmap) - 1];
}

export function scoreToCost(score: number) {
  if (score === 0) {
    return 10;
  } else if (score === 1) {
    return 1;
  } else if (score === 2) {
    return 0.1;
  } else if (score === 3) {
    return 0.01;
  } else {
    throw new Error('bad score! ' + score.toString());
  }
}

/**
 * Get minimum cost of the words encoded by `bitmap`.
 */
export function minCost(length: number, bitmap: BA.BitArray | null) {
  const match = highestScore(length, bitmap);
  if (match) {
    return scoreToCost(match[1]);
  }
  return 5;
}

export function numMatches(length: number, bitmap: BA.BitArray | null) {
  if (!wordDB) {
    throw new Error('uninitialized!');
  }
  if (bitmap === null) {
    return wordDB.words[length].length;
  }
  return BA.bitCount(bitmap);
}

export function updateBitmap(length: number, bitmap: BA.BitArray | null, index: number, letter: string) {
  if (!wordDB) {
    throw new Error('uninitialized!');
  }
  const match = wordDB.bitmaps[length + letter + index] || ZERO;
  if (bitmap === null) {
    return match;
  }
  return BA.and(bitmap, match);
}

const memoMatchingWords: Map<string, [string, number][]> = new Map();
export function matchingWords(length: number, bitmap: BA.BitArray | null) {
  const key: string = length + ':' + (bitmap === null ? 'null' : BA.toString(bitmap, 64));
  const memoed = memoMatchingWords.get(key);
  if (memoed) {
    return memoed;
  }
  if (!wordDB) {
    throw new Error('uninitialized!');
  }
  let rv: [string, number][];
  if (bitmap === null) {
    rv = wordDB.words[length].slice().reverse();
  } else {
    const active = BA.activeBits(bitmap);
    rv = [];
    for (const i of active) {
      rv.push(wordDB.words[length][i]);
    }
  }
  memoMatchingWords.set(key, rv);
  return rv;
}

const memoMatchingBitmap: Map<string, BA.BitArray | null> = new Map();
export function matchingBitmap(pattern: string) {
  const memoed = memoMatchingBitmap.get(pattern);
  if (memoed) {
    return memoed;
  }
  if (!wordDB) {
    throw new Error('uninitialized!');
  }
  let matches = null;
  for (let idx = 0; idx < pattern.length; idx += 1) {
    const letter = pattern[idx];
    if (letter === '?' || letter === ' ') {
      continue;
    }
    const bitmap = wordDB.bitmaps[pattern.length + letter + idx] || ZERO;
    if (matches === null) {
      matches = [...bitmap];
    } else {
      BA.inPlaceAnd(matches, bitmap);
    }
  }
  memoMatchingBitmap.set(pattern, matches);
  return matches;
}
