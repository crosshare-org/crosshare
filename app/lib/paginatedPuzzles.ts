import * as t from 'io-ts';
import { isRight } from 'fp-ts/lib/Either';
import { PathReporter } from 'io-ts/lib/PathReporter';
import { LinkablePuzzle, toLinkablePuzzle } from '../components/PuzzleLink';
import { AdminApp, AdminTimestamp } from './firebaseAdminWrapper';
import { adminTimestamp } from './adminTimestamp';
import { DBPuzzleT, DBPuzzleV } from './dbtypes';
import { mapEachResult } from './dbUtils';
import { puzzleFromDB } from './types';
import { WhereFilterOp } from '@firebase/firestore-types';
import { getFirestore } from 'firebase-admin/firestore';

const NewPuzzleIndexV = t.type({
  /** Array of timestamps when each page begins. Off by 1 so page 1 is element 0 (page 0 always begins at current time). */
  p: t.array(adminTimestamp),
});
type NewPuzzleIndexT = t.TypeOf<typeof NewPuzzleIndexV>;

/** Returns the array of puzzles for the page and `true` if there is a next page. */
export async function paginatedPuzzles(
  page: number,
  pageSize: number,
  queryField?: string,
  queryValue?: string | boolean,
  queryOperator: WhereFilterOp = '=='
): Promise<[Array<LinkablePuzzle>, boolean]> {
  const db = getFirestore(AdminApp);

  if (queryField && queryValue === undefined) {
    throw new Error(`Missing queryValue for "${queryField}"`);
  }
  let indexDocId = queryField
    ? `${queryField}-${queryValue}-${pageSize}`
    : `public-${pageSize}`;
  if (queryOperator !== '==') {
    indexDocId += `-${queryOperator}`;
  }
  const indexDoc = await db.collection('in').doc(indexDocId).get();
  let index: NewPuzzleIndexT | null = null;
  if (indexDoc.exists) {
    const validationResult = NewPuzzleIndexV.decode(indexDoc.data());
    if (isRight(validationResult)) {
      index = validationResult.right;
    } else {
      console.error(PathReporter.report(validationResult).join(','));
      throw new Error('failed to validate index for ' + indexDocId);
    }
  }
  if (index === null) {
    console.log('No index, initializing', indexDocId);
    index = { p: [] };
  }

  let startTimestamp = AdminTimestamp.now();
  if (page) {
    const fromIndex = index.p[page - 1];
    if (!fromIndex) {
      console.log('No results for page', page);
      return [[], false];
    }
    startTimestamp = fromIndex;
  }

  let q: FirebaseFirestore.Query = db.collection('c');

  if (queryField) {
    q = q.where(queryField, queryOperator, queryValue);
  }
  q = q
    .where('pvu', '<=', startTimestamp)
    .orderBy('pvu', 'desc')
    .limit(pageSize + 1);

  const results: Array<DBPuzzleT & { id: string }> = await mapEachResult(
    q,
    DBPuzzleV,
    (dbpuzz, docId) => {
      return { ...dbpuzz, id: docId };
    }
  );

  const lastPuz = results[pageSize];
  let hasMore = false;
  if (lastPuz && lastPuz.pvu) {
    hasMore = true;
    index.p[page] = AdminTimestamp.fromMillis(lastPuz.pvu.toMillis());
    await db.collection('in').doc(indexDocId).set(index);
  }

  return [
    results
      .slice(0, pageSize)
      .map((x) => toLinkablePuzzle({ ...puzzleFromDB(x), id: x.id })),
    hasMore,
  ];
}
