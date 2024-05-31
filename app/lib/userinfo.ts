import * as t from 'io-ts';
import { PathReporter } from './pathReporter.js';

const UserInfoV = t.type({
  isPatron: t.boolean,
  isMod: t.boolean,
});
export type UserInfoT = t.TypeOf<typeof UserInfoV>;

export const parseUserInfo = (x: unknown): UserInfoT => {
  const validationResult = UserInfoV.decode(x);
  if (validationResult._tag !== 'Right') {
    console.error(PathReporter.report(validationResult).join(','));
    throw new Error('bad user info');
  }
  return validationResult.right;
};
