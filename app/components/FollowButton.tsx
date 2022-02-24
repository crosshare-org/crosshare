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
import type firebase from 'firebase/compat/app';
import { t } from '@lingui/macro';

export const FollowButton = ({ page, ...props }: { page: ConstructorPageT, className?: string }) => {
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
        showSnackbar(t`You'll be notified when ${page.n} posts a new puzzle`);
      });
    },
    [page.n, page.u, showSnackbar]
  );

  const css = { minWidth: '7em' };

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
          css={css}
          hollow
          disabled={authCtx.loading}
          onClick={(e) => { e.stopPropagation(); setShowOverlay(true); }}
          text={t`Follow`}
          {...props}
        />
      </>
    );
  }
  if (user.uid === page.u) {
    return (
      <>
        <Button css={css} hollow disabled text={<>{t`Follow`}
          <ToolTipText
            css={{ marginLeft: '0.5em' }}
            text={<FaInfoCircle />}
            tooltip={t`You can't follow yourself!`}
          />
        </>} {...props} />
      </>
    );
  }
  if (isFollowing) {
    const db = App.firestore();
    return (
      <>
        <Button
          css={css}
          onClick={(e) => {
            e.stopPropagation();
            return Promise.all([
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
              showSnackbar(t`No longer following ${page.n}`);
            });
          }
          }
          text={t`Following`}
          hoverText={t`Unfollow`}
          hoverCSS={{ backgroundColor: 'var(--error)' }}
          {...props}
        />
      </>
    );
  }
  return <Button css={css} hollow onClick={(e) => { e.stopPropagation(); doFollow(user); }} text={t`Follow`} {...props} />;
};
