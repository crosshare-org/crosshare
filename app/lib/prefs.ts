import * as t from 'io-ts';

export const UnsubscribeFlags = {
  all: null,  // unsubscribe from all notification emails
  comments: null,  // comments on your puzzles or replies to your comments
  featured: null,  // one of your puzzles is featured or set as daily mini
  newpuzzles: null,  // one of your followed authors published a new puzzle
};

export const AccountPrefsV = t.partial({
  /** user id receiving the notification */
  unsubs: t.array(t.keyof(UnsubscribeFlags)),
  following: t.array(t.string),
});
export type AccountPrefsT = t.TypeOf<typeof AccountPrefsV>;
