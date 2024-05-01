import * as t from 'io-ts';
import { PathReporter } from 'io-ts/lib/PathReporter';
import { timestamp } from './timestamp';

export const ArticleV = t.type({
  /** slug */
  s: t.string,
  /** article content */
  c: t.string,
  /** title */
  t: t.string,
  /** featured on homepage */
  f: t.boolean,
  /** timestamp when last updated */
  ua: t.union([timestamp, t.null]),
});
export type ArticleT = Omit<t.TypeOf<typeof ArticleV>, 'ua'>;

export function validate(a: unknown): ArticleT | null {
  const validationResult = ArticleV.decode(a);
  if (validationResult._tag === 'Right') {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { ua, ...partial } = validationResult.right;
    return partial;
  } else {
    console.error(PathReporter.report(validationResult).join(','));
    return null;
  }
}
