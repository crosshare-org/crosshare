import { AdminApp, App } from './firebaseWrapper';
import {
  CategoryIndexV,
  CategoryIndexT,
  prettifyDateString,
  getDateString,
  DBPuzzleV,
  DBPuzzleT,
} from './dbtypes';
import { isRight } from 'fp-ts/lib/Either';
import { PathReporter } from 'io-ts/lib/PathReporter';
import { none, some, Option } from 'fp-ts/Option';

let dailyMinis: CategoryIndexT | null = null;
let queryTime: number | null = null;
const TTL = 1000 * 60 * 60 * 12; // 12 hours

export async function getDailyMinis() {
  const now = new Date().getTime();
  if (queryTime && dailyMinis && now - queryTime <= TTL) {
    return dailyMinis;
  }

  const db = App.firestore();
  const dbres = await db.collection('categories').doc('dailymini').get();
  if (!dbres.exists) {
    throw new Error('error getting daily minis');
  }
  const validationResult = CategoryIndexV.decode(dbres.data());
  if (!isRight(validationResult)) {
    console.error(PathReporter.report(validationResult).join(','));
    throw new Error('error parsing daily minis');
  }
  queryTime = now;
  dailyMinis = validationResult.right;
  return validationResult.right;
}

export async function getMiniForDate(
  d: Date
): Promise<Option<DBPuzzleT & { id: string }>> {
  const db = AdminApp.firestore();
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
