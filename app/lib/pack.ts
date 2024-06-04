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
    /** active invite codes - mapping from random code to the email it was sent to (or null if not sent via email) */
    i: t.record(t.string, t.union([t.string, t.null])),
  }),
  t.partial({
    /** rejected puzzle ids */
    r: t.array(t.string),
  }),
]);
