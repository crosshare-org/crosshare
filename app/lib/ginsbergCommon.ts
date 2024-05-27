import * as t from 'io-ts';
import { PathReporter } from './pathReporter.js';

const ClueEntryV = t.type({
  /** clue index */
  i: t.number,
  /** clue */
  c: t.string,
  /** in NYT */
  n: t.boolean,
  /** frequency */
  f: t.number,
  /** difficulty (sum for each appearance in freq) */
  d: t.number,
  /** year */
  y: t.number,
  /** trap words */
  t: t.array(t.string),
});
export type ClueEntryT = t.TypeOf<typeof ClueEntryV>;

const ClueListV = t.array(ClueEntryV);
export type ClueListT = t.TypeOf<typeof ClueListV>;

export const parseClueList = (cl: unknown): ClueListT => {
  const validationResult = ClueListV.decode(cl);
  if (validationResult._tag !== 'Right') {
    console.error(PathReporter.report(validationResult).join(','));
    return [];
  }
  return validationResult.right;
};
