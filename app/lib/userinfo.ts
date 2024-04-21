import { isRight } from 'fp-ts/lib/These';
import * as t from 'io-ts';
import { PathReporter } from 'io-ts/lib/PathReporter';

const UserInfoV = t.type({
  isPatron: t.boolean,
});
export type UserInfoT = t.TypeOf<typeof UserInfoV>;

export const parseUserInfo = (x: unknown): UserInfoT => {
  const validationResult = UserInfoV.decode(x);
  if (!isRight(validationResult)) {
    console.error(PathReporter.report(validationResult).join(','));
    throw new Error('bad user info');
  }
  return validationResult.right;
};
