import * as t from 'io-ts';
import { isRight } from 'fp-ts/lib/Either';
import { PathReporter } from 'io-ts/lib/PathReporter';

import { timestamp } from './timestamp';

export const ConstructorPageV = t.intersection([
  t.type({
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
  }),
  t.partial({
    /** needs moderation */
    m: t.boolean,
    /** paypal email address */
    pp: t.string,
    /** paypal text */
    pt: t.string,
  })
]);
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
