import { LruCache } from './lruCache';
import { DBPuzzleV, DBPuzzleT } from './dbtypes';
import { isRight } from 'fp-ts/lib/Either';
import { PathReporter } from 'io-ts/lib/PathReporter';
import { getDoc } from 'firebase/firestore';
import { getDocRef } from './firebaseWrapper';

const cache =
  typeof window === 'undefined'
    ? null
    : new LruCache('puzzles', 100, DBPuzzleV);

export async function getPuzzle(
  puzzleId: string
): Promise<DBPuzzleT | undefined> {
  const cached = cache?.get(puzzleId);
  if (cached) {
    return cached;
  }
  console.log(`loading ${puzzleId} from db`);
  const dbres = await getDoc(getDocRef('c', puzzleId));
  if (!dbres.exists()) {
    return undefined;
  }
  const validationResult = DBPuzzleV.decode(dbres.data());
  if (isRight(validationResult)) {
    cache?.set(puzzleId, validationResult.right);
    return validationResult.right;
  } else {
    console.error(PathReporter.report(validationResult).join(','));
    return undefined;
  }
}
