import * as t from 'io-ts';
import { GlickoScoreV } from './dbtypes';

export const UnsubscribeFlags = {
  all: null, // unsubscribe from all notification emails
  comments: null, // comments on your puzzles or replies to your comments
  featured: null, // one of your puzzles is featured or set as daily mini
  newpuzzles: null, // one of your followed authors published a new puzzle
};

const AccountPrefsFlagsV = t.partial({
  advanceOnPerpendicular: t.boolean,
  dontSkipCompleted: t.boolean,
  dontAdvanceWordAfterCompletion: t.boolean,
  solveDownsOnly: t.boolean,
  disableCommentsByDefault: t.boolean,
  dontPauseOnLostFocus: t.boolean
});
export type AccountPrefsFlagsT = t.TypeOf<typeof AccountPrefsFlagsV>;

export const AccountPrefsV = t.intersection([
  AccountPrefsFlagsV,
  t.partial({
    /** user id receiving the notification */
    unsubs: t.array(t.keyof(UnsubscribeFlags)),
    following: t.array(t.string),
    rtg: GlickoScoreV,
    rtgs: t.array(GlickoScoreV),
  }),
]);
export type AccountPrefsT = t.TypeOf<typeof AccountPrefsV>;
