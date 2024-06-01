import * as t from 'io-ts';

export const PackV = t.intersection([
  t.type({
    /** pack owner */
    a: t.string,
  }),
  t.partial({}),
]);
