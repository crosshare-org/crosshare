import * as t from 'io-ts';
import LZString from 'lz-string';
import { either, isRight } from 'fp-ts/lib/Either';
import { PathReporter } from 'io-ts/lib/PathReporter';
import localforage from 'localforage';

import { BitArray } from './bitArray';


const BigIntegerFromString = new t.Type<BitArray, string, unknown>(
  'BigIntegerFromString',
  (input: unknown): input is BitArray => input instanceof BitArray,
  (input, context) => either.chain(t.string.validate(input, context), n => {
    return t.success(BitArray.fromString(n, 64));
  }),//(typeof input === 'string' ? t.success(input) : t.failure(input, context)),
  // `A` and `O` are the same, so `encode` is just the identity function
  a => a.toString(64)
);

const WordDBEncodedV = t.type({
  words: t.record(t.string, t.array(t.tuple([t.string, t.number]))),
  bitmaps: t.record(t.string, t.string),
});
export type WordDBT = t.TypeOf<typeof WordDBEncodedV>;

const WordDBTransformedV = t.type({
  words: t.record(t.string, t.array(t.tuple([t.string, t.number]))),
  bitmaps: t.record(t.string, BigIntegerFromString),
});
export type WordDBTransformed = t.TypeOf<typeof WordDBTransformedV>;

export function transformDb(db: WordDBT): WordDBTransformed {
  const validationResult = WordDBTransformedV.decode(db);
  if (isRight(validationResult)) {
    return validationResult.right;
  } else {
    throw new Error(PathReporter.report(validationResult).join(','));
  }
}

export enum DBStatus {
  uninitialized,
  building,
  notPresent,
  present,
  disabled,
}

function parseJsonDB(data: string) {
  const validationResult = WordDBEncodedV.decode(JSON.parse(data));
  if (isRight(validationResult)) {
    return validationResult.right;
  } else {
    throw new Error(PathReporter.report(validationResult).join(','));
  }
}

export let dbEncoded: WordDBT | undefined = undefined;
export let dbStatus: DBStatus = DBStatus.uninitialized;

const STORAGE_KEY = 'dbnew';

export const initialize = async (): Promise<boolean> => {
  if (dbStatus !== DBStatus.uninitialized) {
    throw new Error('trying to initialize non-uninitialized worddb');
  }

  dbStatus = DBStatus.building;
  const compressed = await localforage.getItem(STORAGE_KEY);
  if (compressed) {
    console.log('loading db from storage');
    const decompressed = LZString.decompress((compressed as string));
    if (decompressed === null) {
      console.error('Error decompressing db');
      return false;
    }
    dbEncoded = parseJsonDB(decompressed);
    setDb(transformDb(dbEncoded));
    dbStatus = DBStatus.present;
    return true;
  }
  else {
    dbStatus = DBStatus.notPresent;
    return false;
  }
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
    .sort((s1, s2) => s1[1] - s2[1]);

  if (updateProgress) {
    updateProgress(10);
  }
  const count = words.length;

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

  const bitmaps: Record<string, string> = {};

  let wordsDone = 0;
  Object.keys(wordsByLength).map(lengthStr => {
    const length = parseInt(lengthStr);
    const wordlist = wordsByLength[length];
    for (let i = 0; i < 26; i += 1) {
      const letter = String.fromCharCode(65 + i);
      for (let idx = 0; idx < length; idx += 1) {
        const bitmap = BitArray.zero();
        wordlist.forEach((word, wordIdx) => {
          if (word[0][idx] === letter) {
            bitmap.setBit(wordIdx);
          }
        });
        bitmaps[lengthStr + letter + idx.toString()] = bitmap.toString(64);
      }
    }
    wordsDone += wordlist.length;
    if (updateProgress) {
      updateProgress(25 + 65 * wordsDone / count);
    }
  });

  dbEncoded = { words: wordsByLength, bitmaps };
  await localforage.setItem(STORAGE_KEY, LZString.compress(JSON.stringify(dbEncoded)));
  setDb(transformDb(dbEncoded));
  dbStatus = DBStatus.present;
};

export let dbTransformed: WordDBTransformed;
export function setDb(newdb: WordDBTransformed) {
  dbTransformed = newdb;
}

const ZERO = BitArray.zero();

export function highestScore(length: number, bitmap: BitArray | null) {
  const words = dbTransformed.words[length];
  if (bitmap === null) {
    return words[words.length - 1];
  }
  return words[bitmap.bitLength() - 1];
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
export function minCost(length: number, bitmap: BitArray | null) {
  const match = highestScore(length, bitmap);
  if (match) {
    return scoreToCost(match[1]);
  }
  return 5;
}

export function numMatches(length: number, bitmap: BitArray | null) {
  if (bitmap === null) {
    return dbTransformed.words[length].length;
  }
  return bitmap.bitCount();
}

export function updateBitmap(length: number, bitmap: BitArray | null, index: number, letter: string) {
  const match = dbTransformed.bitmaps[length + letter + index] || ZERO;
  if (bitmap === null) {
    return match;
  }
  return bitmap.and(match);
}

const memoMatchingWords: Map<string, [string, number][]> = new Map();
export function matchingWords(length: number, bitmap: BitArray | null) {
  const key: string = length + ':' + (bitmap === null ? 'null' : bitmap.toString(32));
  const memoed = memoMatchingWords.get(key);
  if (memoed) {
    return memoed;
  }
  let rv: [string, number][];
  if (bitmap === null) {
    rv = dbTransformed.words[length].slice().reverse();
  } else {
    const active = bitmap.activeBits();
    rv = active.map((i) => dbTransformed.words[length][i]);
  }
  memoMatchingWords.set(key, rv);
  return rv;
}

const memoMatchingBitmap: Map<string, BitArray | null> = new Map();
export function matchingBitmap(pattern: string) {
  const memoed = memoMatchingBitmap.get(pattern);
  if (memoed) {
    return memoed;
  }
  let matches = null;
  for (let idx = 0; idx < pattern.length; idx += 1) {
    const letter = pattern[idx];
    if (letter === '?' || letter === ' ') {
      continue;
    }
    const bitmap = dbTransformed.bitmaps[pattern.length + letter + idx] || ZERO;
    if (matches === null) {
      matches = bitmap;
    } else {
      matches = matches.and(bitmap);
    }
  }
  memoMatchingBitmap.set(pattern, matches);
  return matches;
}
