import levelup, { LevelUp } from 'levelup';
import rocksdb from 'rocksdb';
import { ClueListT, parseClueList } from './ginsbergCommon.js';

export const CLUEDB = './cluedb';

export const getDB = (readOnly: boolean) => {
  return levelup(rocksdb(CLUEDB), { readOnly: readOnly });
};

export const getClues = async (
  db: LevelUp,
  word: string
): Promise<ClueListT> => {
  try {
    return parseClueList(JSON.parse((await db.get(word)) as string));
  } catch {
    return [];
  }
};
