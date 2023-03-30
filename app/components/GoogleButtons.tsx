import { LegacyPlayV } from '../lib/dbtypes';
import { getValidatedAndDelete, setInCache } from '../lib/dbUtils';
import { getAuth, getCollection } from '../lib/firebaseWrapper';
import { event } from '../lib/gtag';
import {
  GoogleAuthProvider,
  linkWithPopup,
  OAuthProvider,
  signInWithCredential,
  signInWithPopup,
} from 'firebase/auth';
import type { User, AuthError, UserCredential } from 'firebase/auth';
import { ButtonAsLink } from './Buttons';
import { query, where } from 'firebase/firestore';

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
    signInWithPopup(getAuth(), AuthProvider).then(
      async (userCredential: UserCredential) => {
        event({
          action: 'login',
          category: 'engagement',
          label: 'google',
        });
        // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
        if (userCredential.user && postSignIn) {
          return postSignIn(userCredential.user);
        }
        return () => {
          /* noop */
        };
      }
    );
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
        // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
        if (userCredential.user && postSignIn) {
          return postSignIn(userCredential.user);
        }
        return () => {
          /* noop */
        };
      })
      .catch(async (error: AuthError) => {
        if (error.code !== 'auth/credential-already-in-use') {
          console.log(error);
          return;
        }
        const credential = OAuthProvider.credentialFromError(error);
        if (!credential) {
          throw new Error('missing new user after link');
        }
        // Get anonymous user plays
        const plays = await getValidatedAndDelete(
          query(getCollection('p'), where('u', '==', user.uid)),
          LegacyPlayV
        );
        return signInWithCredential(getAuth(), credential).then(
          async (value: UserCredential) => {
            console.log('signed in as new user ' + value.user?.uid);
            const newUser = value.user;
            // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
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
