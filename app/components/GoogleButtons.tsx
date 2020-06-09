import { LegacyPlayV } from '../lib/dbtypes';
import { getValidatedAndDelete, setInCache } from '../lib/dbUtils';
import { App, AuthProvider } from '../lib/firebaseWrapper';

export const GoogleSignInButton = () => {
  function signin() {
    App.auth().signInWithPopup(AuthProvider)
      .then(() => {
        App.analytics().logEvent('login', { method: 'google' });
      });
  }
  return (
    <input type='image' width='191' height='46' src='/googlesignin.png' alt='Sign in with Google' onClick={signin} />
  );
};

export const GoogleLinkButton = ({ user }: { user: firebase.User }) => {
  function signin() {
    user.linkWithPopup(AuthProvider)
      .then(() => {
        console.log('linked w/o needing a merge');
        App.analytics().logEvent('login', { method: 'google' });
      })
      .catch(async (error: firebase.auth.AuthError) => {
        if (error.code !== 'auth/credential-already-in-use') {
          console.log(error);
          return;
        }
        if (!error.credential) {
          throw new Error('missing new user after link');
        }
        // Get anonymous user plays
        const db = App.firestore();
        const plays = await getValidatedAndDelete(db.collection('p').where('u', '==', user.uid), LegacyPlayV);
        return App.auth().signInWithCredential(error.credential).then(async (value: firebase.auth.UserCredential) => {
          console.log('signed in as new user ' + value.user ?.uid);
          const newUser = value.user;
          if (!newUser) {
            throw new Error('missing new user after link');
          }
          await Promise.all(plays.map((play) => {
            play.u = newUser.uid;
            console.log('Updating play ' + play.c + '-' + play.u);
            // TODO set this in DB and in the plays doc in cache. Update updated at in plays cache
            return setInCache({
              collection: 'p', docId: play.c + '-' + newUser.uid, localDocId: play.c,
              value: play, validator: LegacyPlayV, sendToDB: true
            });
          }));
          user.delete();
          console.log('linked and merged plays');
        });
      });
  }
  return (
    <input type='image' width='191' height='46' src='/googlesignin.png' alt='Sign in with Google' onClick={signin} />
  );
};
