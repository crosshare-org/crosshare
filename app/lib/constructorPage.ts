import type { Root } from 'hast';
import * as t from 'io-ts';
import { PathReporter } from './pathReporter.js';
import { timestamp } from './timestamp.js';

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
export interface ConstructorPageT extends Omit<
  t.TypeOf<typeof ConstructorPageV>,
  't'
> {
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
  if (cp == null) {
    return null;
  }
  const validationResult = ConstructorPageV.decode(cp);
  if (validationResult._tag === 'Right') {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { t, ...partial } = validationResult.right;
    return { ...partial, id: username };
  } else {
    console.error(PathReporter.report(validationResult).join(','));
    return null;
  }
}
