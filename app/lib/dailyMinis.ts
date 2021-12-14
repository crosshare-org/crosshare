import {
  prettifyDateString,
  getDateString,
  DBPuzzleV,
  DBPuzzleT,
} from './dbtypes';
import { isRight } from 'fp-ts/lib/Either';
import { PathReporter } from 'io-ts/lib/PathReporter';
import { none, some, Option, isSome } from 'fp-ts/Option';
import { AnyFirestore } from './dbUtils';

let dailyMiniIdsByDate: Map<string, string> = new Map();
let queryTime: number = Date.now();
const TTL = 1000 * 60 * 60 * 12; // 12 hours

export async function getMiniIdForDate(
  db: AnyFirestore,
  d: Date
): Promise<Option<string>> {
  const now = Date.now();

  // Just reset the cache every 12 hrs, kind of a hack but *shrug*
  if (now - queryTime > TTL) {
    dailyMiniIdsByDate = new Map();
    queryTime = now;
  }

  const key = prettifyDateString(getDateString(d));
  const existing = dailyMiniIdsByDate.get(key);
  if (existing) {
    return some(existing);
  }
  const puz = await getMiniForDate(db, d);
  if (!isSome(puz)) {
    return none;
  }
  dailyMiniIdsByDate.set(key, puz.value.id);
  return some(puz.value.id);
}

export async function getMiniForDate(
  db: AnyFirestore,
  d: Date
): Promise<Option<DBPuzzleT & { id: string }>> {
  const dbres = await db
    .collection('c')
    .where('dmd', '==', prettifyDateString(getDateString(d)))
    .limit(1)
    .get();

  const doc = dbres.docs[0];
  if (!doc) {
    console.error('no dm for date ', d);
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
