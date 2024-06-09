import * as t from 'io-ts';

export const PackV = t.intersection([
  t.type({
    /** pack owners */
    a: t.array(t.string),
    /** title */
    t: t.string,
    /** description */
    d: t.string,
    /** ordered list of member puzzles */
    p: t.array(t.string),
  }),
  t.partial({
    /** rejected puzzle ids */
    r: t.array(t.string),
  }),
]);
