import * as t from "io-ts";
import LZString from 'lz-string';
import { either, isRight } from 'fp-ts/lib/Either'
import { PathReporter } from "io-ts/lib/PathReporter";
import localforage from 'localforage';
import { BigInteger } from '@modern-dev/jsbn';


const BigIntegerFromString = new t.Type<BigInteger, string, unknown>(
  'BigIntegerFromString',
  (input: unknown): input is BigInteger => input instanceof BigInteger,
  (input, context) => either.chain(t.string.validate(input, context), n => {
      return t.success(new BigInteger(n, 32))
    }),//(typeof input === 'string' ? t.success(input) : t.failure(input, context)),
  // `A` and `O` are the same, so `encode` is just the identity function
  a => a.toString(10)
)

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

export function transformDb(db:WordDBT):WordDBTransformed {
  const validationResult = WordDBTransformedV.decode(db);
  if (isRight(validationResult)) {
    return validationResult.right;
  } else {
    throw new Error(PathReporter.report(validationResult).join(","));
  }
}

export enum DBStatus {
  uninitialized,
  building,
  notPresent,
  present,
  disabled,
}

function parseJsonDB(data:string) {
  const validationResult = WordDBEncodedV.decode(JSON.parse(data));
  if (isRight(validationResult)) {
    return validationResult.right;
  } else {
    throw new Error(PathReporter.report(validationResult).join(","));
  }
}

export let dbEncoded: WordDBT|undefined = undefined;
export let dbStatus: DBStatus = DBStatus.uninitialized;

export const initialize = (callback: (present: boolean) => void) => {
  if (dbStatus !== DBStatus.uninitialized) return;
  dbStatus = DBStatus.building;
  localforage.getItem("db").then((compressed) => {
    if (compressed) {
      console.log("loading db from storage");
      const decompressed = LZString.decompress(compressed as string);
      dbEncoded = parseJsonDB(decompressed);
      setDb(transformDb(dbEncoded));
      dbStatus = DBStatus.present;
      callback(true);
    } else {
      dbStatus = DBStatus.notPresent;
      callback(false);
    }
  }).catch((err) => { console.log(err); callback(false); });
}

export const build = (callback: (built: boolean) => void) => {
  // Only allow a build if state is notPresent or disabled
  if (dbStatus !== DBStatus.notPresent && dbStatus !== DBStatus.disabled) {
    callback(false);
    return;
  }
  console.log("building db");
  dbStatus = DBStatus.building;
  fetch('_db.json')
  .then((r) => r.text())
  .then((data) => {
    localforage.setItem("db", LZString.compress(data))
    dbEncoded = parseJsonDB(data);
    setDb(transformDb(dbEncoded));
    dbStatus = DBStatus.present;
    callback(true);
  });
}

export const initializeOrBuild = (callback: (success: boolean) => void) => {
  initialize((present) => {
    if (present) {
      callback(true);
    } else {
      build(callback);
    }
  });
}

export let dbTransformed: WordDBTransformed;
export function setDb(newdb:WordDBTransformed) {
  dbTransformed = newdb;
}

const ONE = new BigInteger('1', 10);
export const ZERO = new BigInteger('0', 10);

const MAX_WORDS_TO_CONSIDER = 100;

export function highestScore(length: number, bitmap: BigInteger|null) {
  const words = dbTransformed.words[length];
  if (bitmap === null) {
    return words[words.length - 1];
  }
  return words[bitmap.bitLength() - 1];
}

/**
 * Get minimum cost of the words encoded by `bitmap`.
 */
export function minCost(length: number, bitmap: BigInteger|null) {
  const match = highestScore(length, bitmap);
  if (match) {
    return 1 / match[1]
  }
  return 5
}

export function numMatches(length:number, bitmap:BigInteger|null) {
  if (bitmap === null) {
    return dbTransformed.words[length].length;
  }
  return bitmap.bitCount();
}

export function updateBitmap(length:number, bitmap:BigInteger|null, index:number, letter:string) {
  const match = dbTransformed.bitmaps[length + letter + index] || ZERO;
  if (bitmap === null) {
    return match;
  }
  return bitmap.and(match);
}

function activebits(a:BigInteger) {
  const active: number[] = [];
  while (!a.equals(ZERO)) {
    const b = a.bitLength() - 1
    active.push(b)
    a = a.subtract(ONE.shiftLeft(b));
  }
  return active
}

const memoMatchingWords:Map<string, [string, number][]> = new Map();
export function matchingWords(length:number, bitmap:BigInteger|null) {
  const key:string = length + ":" + (bitmap === null ? 'null' : bitmap.toString(32));
  const memoed = memoMatchingWords.get(key);
  if (memoed) {
    return memoed;
  }
  let rv;
  if (bitmap === null) {
    rv = dbTransformed.words[length].slice(-MAX_WORDS_TO_CONSIDER).reverse();
  } else {
    const active = activebits(bitmap)
    rv = active.slice(0, MAX_WORDS_TO_CONSIDER).map((i) => dbTransformed.words[length][i]);
  }
  memoMatchingWords.set(key, rv);
  return rv;
}

const memoMatchingBitmap:Map<string, BigInteger|null> = new Map();
export function matchingBitmap(pattern:string) {
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
