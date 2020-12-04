#!/usr/bin/env -S npx ts-node-script --skip-project -O '{"resolveJsonModule":true,"esModuleInterop":true}'

import fs from 'fs';
import util from 'util';

import rimraf from 'rimraf';

import { ClueListT } from '../lib/ginsbergCommon';
import { CLUEDB, getDB } from '../lib/ginsberg';

const readFile = util.promisify(fs.readFile);

if (process.argv.length !== 3) {
  throw Error(
    'Invalid use of buildGinsberg. Usage: ./scripts/buildGinsberg.ts [pathToCluedataFile]'
  );
}

const cluedataFilename = process.argv[2];
if (!cluedataFilename) {
  throw Error('oob');
}

const build = async (cluedata: Buffer): Promise<void> => {
  let offset = 0;
  const readInt = () => {
    const v = cluedata.readInt32LE(offset);
    offset += 4;
    return v;
  };
  const readShort = () => {
    const v = cluedata.readUInt16LE(offset);
    offset += 2;
    return v;
  };
  const readByte = () => {
    const v = cluedata.readUInt8(offset);
    offset += 1;
    return v;
  };
  const readString = (strLen: number) => {
    const v = cluedata.toString('latin1', offset, offset + strLen);
    offset += strLen;
    return v;
  };
  const readLenStr = () => {
    const len = readByte();
    return readString(len);
  };

  const numWords = readInt();
  console.log(`${numWords} words`);
  const words: Array<string> = [];
  for (let i = 0; i < numWords; i += 1) {
    words.push(readLenStr());
  }
  console.log('beginning and end', words[0], words[words.length - 1]);

  const clues: Array<string> = [];
  const clueClues: Array<Array<number>> = [];
  const numClues = readInt();
  console.log(`${numClues} clues`);
  for (let i = 0; i < numClues; i += 1) {
    clues.push(readLenStr());
    const numTraps = readInt();
    const traps: Array<number> = [];
    for (let j = 0; j < numTraps; j += 1) {
      traps.push(readInt());
    }
    clueClues.push(traps);
  }
  console.log('beginning and end', clues[0], clues[clues.length - 1]);

  console.log('reading entries');
  interface ClueEntry {
    frequency: number;
    difficulty: number;
    year: number;
    nyt: boolean;
    clueIndex: number;
  }

  function entriesToDBFormat(word: string, e: Array<ClueEntry>): ClueListT {
    return e.reduce((acc: ClueListT, entry: ClueEntry) => {
      const existing = acc.find((existing) => existing.i === entry.clueIndex);
      if (existing) {
        existing.f += entry.frequency;
        existing.d += entry.difficulty;
        existing.n = existing.n || entry.nyt;
        existing.y = Math.max(existing.y, entry.year);
      } else {
        const clue = clues[entry.clueIndex];
        if (!clue) {
          return acc;
        }
        const traps = (clueClues[entry.clueIndex] || []).reduce(
          (acc: Array<string>, n: number) => {
            const trapWord = words[n >> 1];
            if (
              trapWord &&
              trapWord !== word &&
              trapWord.length === word.length
            ) {
              acc.push(trapWord);
            }
            return acc;
          },
          []
        );
        acc.push({
          i: entry.clueIndex,
          c: clue,
          f: entry.frequency,
          d: entry.difficulty,
          n: entry.nyt,
          y: entry.year,
          t: traps,
        });
      }
      return acc;
    }, []);
  }

  let entries: Array<ClueEntry> = [];
  let currentWordIndex = 0;

  await util.promisify(rimraf)(CLUEDB);
  const db = getDB(false);

  while (offset < cluedata.length) {
    const wordIndex = readInt();
    const frequency = readShort();
    const difficulty = readShort();
    const year = readShort();
    const isTheme = readByte();
    const publisher = readByte();
    const clueIndex = readInt();
    if (isTheme) {
      continue;
    }
    if (wordIndex !== currentWordIndex) {
      const word = words[currentWordIndex];
      if (word) {
        await db.put(word, JSON.stringify(entriesToDBFormat(word, entries)));
      }
      if (wordIndex < currentWordIndex) {
        throw new Error('REVERSE REVERSE');
      }
      currentWordIndex = wordIndex;
      entries = [];
    }
    entries.push({
      frequency,
      difficulty,
      year,
      nyt: publisher === 8,
      clueIndex,
    });
  }
  await db.close();
};

console.log(`opening ${cluedataFilename}`);
readFile(cluedataFilename).then((binary) => {
  build(binary).then(() => {
    console.log('done');
  });
});
