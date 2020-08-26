import * as t from 'io-ts';
import { isRight } from 'fp-ts/lib/Either';
import { PathReporter } from 'io-ts/lib/PathReporter';

import { App, TimestampClass } from './firebaseWrapper';
import { timestamp } from './timestamp';
import { mapEachResult } from './dbUtils';

export const CONSTRUCTOR_PAGE_COLLECTION = 'cp';

export const ConstructorPageV = t.type({
  /** username (w/ desired capitalization) */
  i: t.string,
  /** user id */
  u: t.string,
  /** display name */
  n: t.string,
  /** author bio */
  b: t.string,
  /** timestamp when last updated */
  t: timestamp,
});
export interface ConstructorPageT extends Omit<t.TypeOf<typeof ConstructorPageV>, 't'> {
  id: string,
}

export function validate(cp: unknown, username: string): ConstructorPageT | null {
  const validationResult = ConstructorPageV.decode(cp);
  if (isRight(validationResult)) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { t, ...partial } = validationResult.right;
    return { ...partial, id: username };
  } else {
    console.error(PathReporter.report(validationResult).join(','));
    return null;
  }
}

const usernameMap: Record<string, ConstructorPageT> = {};
let usernamesUpdated: number | null = null;
const usernamesTTL = 1000 * 60 * 10;

export async function userIdToPage(userId: string): Promise<ConstructorPageT | null> {
  const now = Date.now();
  if (usernamesUpdated === null || now - usernamesUpdated > usernamesTTL) {
    const db = App.firestore();
    let query: firebase.firestore.Query = db.collection(CONSTRUCTOR_PAGE_COLLECTION);
    if (usernamesUpdated) {
      query = query.where('t', '>=', TimestampClass.fromMillis(usernamesUpdated));
    }
    await mapEachResult(query,
      ConstructorPageV, (cp, docId) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { t, ...partial } = cp;
        usernameMap[cp.u] = { ...partial, id: docId };
      });
    usernamesUpdated = now;
  }
  return usernameMap[userId] || null;
}
