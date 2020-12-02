import levelup, { LevelUp } from 'levelup';
import leveldown from 'leveldown';
import rimraf from 'rimraf';
import util from 'util';

export const build = async (cluedata: Buffer): Promise<void> => {
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
    publisher: number;
    clue: string;
    traps: Array<string>;
  }
  let entries: Array<ClueEntry> = [];
  let currentWordIndex = 0;

  await util.promisify(rimraf)(CLUEDB);
  const db = getDB();

  while (offset < cluedata.length) {
    const wordIndex = readInt();
    const frequency = readShort();
    const difficulty = readShort();
    const year = readShort();
    const isTheme = readByte();
    const publisher = readByte(); // 8 is NYT
    const clueIndex = readInt();
    const clue = clues[clueIndex];
    if (clue === undefined) {
      continue;
    }
    if (isTheme) {
      continue;
    }
    if (wordIndex !== currentWordIndex) {
      const word = words[currentWordIndex];
      if (word) {
        await db.put(word, JSON.stringify(entries));
      }
      if (wordIndex < currentWordIndex) {
        throw new Error('REVERSE REVERSE');
      }
      currentWordIndex = wordIndex;
      entries = [];
    }
    entries.push({
      frequency, difficulty, year, publisher, clue,
      traps: [] // TODO
    });
  }
  await db.close();
};

const CLUEDB = './cluedb';

export const getDB = () => {
  return levelup(leveldown(CLUEDB));
};

export const getClues = async (db: LevelUp, word: string)  => {
  return db.get(word);
};