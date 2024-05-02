import { getDoc } from 'firebase/firestore';
import { isRight } from 'fp-ts/lib/Either';
import { PathReporter } from 'io-ts/lib/PathReporter';
import { DBPuzzleT, DBPuzzleV } from './dbtypes';
import { getDocRef } from './firebaseWrapper';
import { LruCache } from './lruCache';

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
