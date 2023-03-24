import * as t from 'io-ts';
import { isRight } from 'fp-ts/lib/Either';
import { PathReporter } from 'io-ts/lib/PathReporter';

import { timestamp } from './timestamp';
import type { Root } from 'hast';

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
    t: t.union([timestamp, t.null]),
  }),
  t.partial({
    /** needs moderation */
    m: t.boolean,
    /** paypal email address */
    pp: t.string,
    /** paypal text */
    pt: t.string,
    /** constructor signature */
    sig: t.string,
    /** text to use for social share buttons */
    st: t.string,
  }),
]);
export const ConstructorPageWithIdV = t.intersection([
  ConstructorPageV,
  t.type({ id: t.string }),
]);
export interface ConstructorPageT
  extends Omit<t.TypeOf<typeof ConstructorPageV>, 't'> {
  id: string;
}

// Omit any markdown fields

export type ConstructorPageBase = Omit<ConstructorPageT, 'sig' | 'b'>;
export interface ConstructorPageWithMarkdown extends ConstructorPageBase {
  b: Root;
  sig?: Root;
}

export function validate(
  cp: unknown,
  username: string
): ConstructorPageT | null {
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
