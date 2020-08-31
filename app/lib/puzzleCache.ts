import { LruCache } from './lruCache';
import { DBPuzzleV, DBPuzzleT } from './dbtypes';
import { App } from './firebaseWrapper';
import { isRight } from 'fp-ts/lib/Either';
import { PathReporter } from 'io-ts/lib/PathReporter';

const cache = (typeof window === 'undefined' ? null : new LruCache('puzzles', 100, DBPuzzleV));

export async function getPuzzle(puzzleId: string): Promise<DBPuzzleT | undefined> {
  const cached = cache ?.get(puzzleId);
  if (cached) {
    return cached;
  }
  console.log(`loading ${puzzleId} from db`);
  const db = App.firestore();
  const dbres = await db.collection('c').doc(puzzleId).get();
  if (!dbres.exists) {
    return undefined;
  }
  const validationResult = DBPuzzleV.decode(dbres.data());
  if (isRight(validationResult)) {
    cache ?.set(puzzleId, validationResult.right);
    return validationResult.right;
  } else {
    console.error(PathReporter.report(validationResult).join(','));
    return undefined;
  }
}
