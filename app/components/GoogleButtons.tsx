import {
  GoogleAuthProvider,
  OAuthProvider,
  linkWithPopup,
  signInWithCredential,
  signInWithPopup,
} from 'firebase/auth';
import type { AuthError, User, UserCredential } from 'firebase/auth';
import { query, where } from 'firebase/firestore';
import { getValidatedAndDelete, setInCache } from '../lib/dbUtils.js';
import { LegacyPlayV } from '../lib/dbtypes.js';
import { getAuth, getCollection } from '../lib/firebaseWrapper.js';
import { event } from '../lib/gtag.js';
import { ButtonAsLink } from './Buttons.js';

interface GoogleButtonProps {
  postSignIn?: (user: User) => Promise<void>;
  text?: string;
}

export const GoogleButton = ({
  user,
  ...props
}: { user: User | undefined } & GoogleButtonProps) => {
  if (user) {
    return <GoogleLinkButton user={user} {...props} />;
  }
  return <GoogleSignInButton {...props} />;
};

const AuthProvider = new GoogleAuthProvider();
AuthProvider.setCustomParameters({ prompt: 'select_account' });

export const GoogleSignInButton = ({ postSignIn, text }: GoogleButtonProps) => {
  function signin() {
    signInWithPopup(getAuth(), AuthProvider)
      .then(async (userCredential: UserCredential) => {
        event({
          action: 'login',
          category: 'engagement',
          label: 'google',
        });
        if (postSignIn !== undefined) {
          return postSignIn(userCredential.user);
        }
        return () => {
          /* noop */
        };
      })
      .catch((e: unknown) => {
        console.error('error signing in', e);
      });
  }
  if (text) {
    return <ButtonAsLink text={text} onClick={signin} />;
  }
  return (
    <input
      type="image"
      width="191"
      height="46"
      src="/googlesignin.png"
      alt="Sign in with Google"
      onClick={signin}
    />
  );
};

export const GoogleLinkButton = ({
  user,
  postSignIn,
  text,
}: { user: User } & GoogleButtonProps) => {
  function signin() {
    linkWithPopup(user, AuthProvider)
      .then(async (userCredential) => {
        console.log('linked w/o needing a merge');
        event({
          action: 'login',
          category: 'engagement',
          label: 'google',
        });
        if (postSignIn !== undefined) {
          return postSignIn(userCredential.user);
        }
        return () => {
          /* noop */
        };
      })
      .catch(async (error: unknown) => {
        if ((error as AuthError).code !== 'auth/credential-already-in-use') {
          console.log(error);
          return;
        }
        const credential = OAuthProvider.credentialFromError(
          error as AuthError
        );
        if (!credential) {
          throw new Error('missing new user after link');
        }
        // Get anonymous user plays
        const plays = await getValidatedAndDelete(
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
          query(getCollection('p'), where('u', '==', user.uid)),
          LegacyPlayV
        );
        return signInWithCredential(getAuth(), credential).then(
          async (value: UserCredential) => {
            console.log('signed in as new user ' + value.user.uid);
            const newUser = value.user;
            // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unnecessary-condition
            if (!newUser) {
              throw new Error('missing new user after link');
            }
            await Promise.all(
              plays.map((play) => {
                play.u = newUser.uid;
                console.log('Updating play ' + play.c + '-' + play.u);
                // TODO set this in DB and in the plays doc in cache. Update updated at in plays cache
                return setInCache({
                  collection: 'p',
                  docId: play.c + '-' + newUser.uid,
                  localDocId: play.c,
                  value: play,
                  validator: LegacyPlayV,
                  sendToDB: true,
                });
              })
            );
            console.log('linked and merged plays');
            if (postSignIn) {
              return postSignIn(newUser);
            }
          }
        );
      });
  }
  if (text) {
    return <ButtonAsLink text={text} onClick={signin} />;
  }
  return (
    <input
      type="image"
      width="191"
      height="46"
      src="/googlesignin.png"
      alt="Sign in with Google"
      onClick={signin}
    />
  );
};
