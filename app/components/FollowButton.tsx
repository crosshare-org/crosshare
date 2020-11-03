import { ConstructorPageT } from '../lib/constructorPage';
import { AuthContext } from './AuthContext';
import { Button } from './Buttons';
import { ToolTipText } from './ToolTipText';
import { GoogleLinkButton, GoogleSignInButton } from './GoogleButtons';
import { Overlay } from './Overlay';
import { FaInfoCircle } from 'react-icons/fa';
import { useSnackbar } from './Snackbar';
import { App, FieldValue } from '../lib/firebaseWrapper';
import { useCallback, useState, useContext } from 'react';
import type firebase from 'firebase/app';

export const FollowButton = ({ page }: { page: ConstructorPageT }) => {
  const authCtx = useContext(AuthContext);
  const user = authCtx.user;
  const isFollowing = authCtx.prefs?.following?.includes(page.u);
  const { showSnackbar } = useSnackbar();
  const [showOverlay, setShowOverlay] = useState(false);
  const doFollow = useCallback(
    async (loggedInAs: firebase.User) => {
      const db = App.firestore();
      setShowOverlay(false);
      return Promise.all([
        db
          .doc(`prefs/${loggedInAs.uid}`)
          .set({ following: FieldValue.arrayUnion(page.u) }, { merge: true }),
        db
          .doc(`followers/${page.u}`)
          .set({ f: FieldValue.arrayUnion(loggedInAs.uid) }, { merge: true }),
      ]).then(() => {
        showSnackbar(`You'll be notified when ${page.n} posts a new puzzle`);
      });
    },
    [page.n, page.u, showSnackbar]
  );

  if (!user || user.isAnonymous) {
    return (
      <>
        {showOverlay ? (
          <Overlay closeCallback={() => setShowOverlay(false)}>
            <div css={{ textAlign: 'center' }}>
              <h2>
                Follow {page.n} to get notified when they post a new puzzle
              </h2>
              <p>Login with Google to follow</p>
              {user ? (
                <GoogleLinkButton user={user} postSignIn={doFollow} />
              ) : (
                <GoogleSignInButton postSignIn={doFollow} />
              )}
            </div>
          </Overlay>
        ) : (
          ''
        )}
        <Button
          hollow
          disabled={authCtx.loading}
          onClick={() => setShowOverlay(true)}
          text="Follow"
        />
      </>
    );
  }
  if (user.uid === page.u) {
    return (
      <>
        <Button hollow disabled text="Follow" />
        <ToolTipText
          css={{ marginLeft: '0.5em' }}
          text={<FaInfoCircle />}
          tooltip="You can't follow yourself!"
        />
      </>
    );
  }
  if (isFollowing) {
    const db = App.firestore();
    return (
      <>
        <Button
          onClick={() =>
            Promise.all([
              db
                .doc(`prefs/${user.uid}`)
                .set(
                  { following: FieldValue.arrayRemove(page.u) },
                  { merge: true }
                ),
              db
                .doc(`followers/${page.u}`)
                .set({ f: FieldValue.arrayRemove(user.uid) }, { merge: true }),
            ]).then(() => {
              showSnackbar(`No longer following ${page.n}`);
            })
          }
          text="Following"
          hoverText="Unfollow"
          hoverCSS={{ backgroundColor: 'var(--error)' }}
        />
      </>
    );
  }
  return <Button hollow onClick={() => doFollow(user)} text="Follow" />;
};
