import { ClassicLevel } from 'classic-level';
import { ClueListT, parseClueList } from './ginsbergCommon.js';

export const CLUEDB = './cluedb';

export const getDB = () => {
  return new ClassicLevel(CLUEDB);
};

export const getClues = async (
  db: ClassicLevel,
  word: string
): Promise<ClueListT> => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return parseClueList(JSON.parse((await db.get(word))!));
  } catch {
    return [];
  }
};
