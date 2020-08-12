import * as t from 'io-ts';
import { isRight } from 'fp-ts/lib/Either';
import { PathReporter } from 'io-ts/lib/PathReporter';

import { timestamp } from './timestamp';

export const CONSTRUCTOR_PAGE_COLLECTION = 'cp';

const ConstructorPageV = t.type({
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
    const { t, ...partial } = validationResult.right;  // eslint-disable-line @typescript-eslint/no-unused-vars
    return { ...partial, id: username };
  } else {
    console.error(PathReporter.report(validationResult).join(','));
    return null;
  }
}
