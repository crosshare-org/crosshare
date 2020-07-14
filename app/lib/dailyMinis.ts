import { App } from './firebaseWrapper';
import { CategoryIndexV, CategoryIndexT } from './dbtypes';
import { isRight } from 'fp-ts/lib/Either';
import { PathReporter } from 'io-ts/lib/PathReporter';

let dailyMinis: CategoryIndexT | null = null;
let queryTime: number | null = null;
const TTL = 1000 * 60 * 60 * 12; // 12 hours

export async function getDailyMinis() {
  const now = new Date().getTime();
  if (queryTime && dailyMinis && (now - queryTime) <= TTL) {
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
