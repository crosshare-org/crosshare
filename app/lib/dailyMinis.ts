import {
  prettifyDateString,
  getDateString,
  DBPuzzleV,
  DBPuzzleT,
} from './dbtypes';
import { isRight } from 'fp-ts/lib/Either';
import { PathReporter } from 'io-ts/lib/PathReporter';
import { none, some, Option, isSome } from 'fp-ts/Option';
import { getCollection } from './firebaseAdminWrapper';

const dailyMiniIdsByDate: Map<string, string | null> = new Map();

export function setMiniForDate(pds: string, id: string) {
  const key = 'dmid-' + pds;
  dailyMiniIdsByDate.set(key, id);
  sessionStorage.setItem(key, id);
}

export async function getMiniIdForDate(d: Date): Promise<Option<string>> {
  const key = 'dmid-' + prettifyDateString(getDateString(d));
  const fromStorage = sessionStorage.getItem(key);
  if (fromStorage) {
    return some(fromStorage);
  }
  const existing = dailyMiniIdsByDate.get(key);
  if (existing) {
    return some(existing);
  }
  if (existing === null) {
    return none;
  }
  const puz = await getMiniForDate(d, true);
  if (!isSome(puz)) {
    dailyMiniIdsByDate.set(key, null);
    return none;
  }
  dailyMiniIdsByDate.set(key, puz.value.id);
  sessionStorage.setItem(key, puz.value.id);
  return some(puz.value.id);
}

export async function getMiniForDate(
  d: Date,
  allowMissing?: boolean
): Promise<Option<DBPuzzleT & { id: string }>> {
  const dbres = await getCollection('c')
    .where('dmd', '==', prettifyDateString(getDateString(d)))
    .limit(1)
    .get();

  const doc = dbres.docs[0];
  if (!doc) {
    if (!allowMissing) {
      console.error('no dm for date ', d);
    }
    return none;
  }
  const validationResult = DBPuzzleV.decode(doc.data());
  if (isRight(validationResult)) {
    return some({ ...validationResult.right, id: doc.id });
  }
  console.error('invalid puzzle ', doc.id);
  console.error(PathReporter.report(validationResult).join(','));
  return none;
}
