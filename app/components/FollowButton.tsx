import { ConstructorPageBase } from '../lib/constructorPage';
import { AuthContext } from './AuthContext';
import { Button } from './Buttons';
import { ToolTipText } from './ToolTipText';
import { GoogleLinkButton, GoogleSignInButton } from './GoogleButtons';
import { Overlay } from './Overlay';
import { FaInfoCircle } from 'react-icons/fa';
import { useSnackbar } from './Snackbar';
import { getDocRef } from '../lib/firebaseWrapper';
import { useCallback, useState, useContext } from 'react';
import type { User } from 'firebase/auth';
import { t } from '@lingui/macro';
import { arrayRemove, arrayUnion, setDoc } from 'firebase/firestore';
import { logAsyncErrors } from '../lib/utils';

export const FollowButton = ({
  page,
  ...props
}: {
  page: ConstructorPageBase;
  className?: string;
}) => {
  const authCtx = useContext(AuthContext);
  const user = authCtx.user;
  const isFollowing = authCtx.prefs?.following?.includes(page.u);
  const { showSnackbar } = useSnackbar();
  const [showOverlay, setShowOverlay] = useState(false);
  const constructorName = page.n;
  const doFollow = useCallback(
    async (loggedInAs: User) => {
      setShowOverlay(false);
      return Promise.all([
        setDoc(
          getDocRef('prefs', loggedInAs.uid),
          { following: arrayUnion(page.u) },
          { merge: true }
        ),
        setDoc(
          getDocRef('followers', page.u),
          { f: arrayUnion(loggedInAs.uid) },
          { merge: true }
        ),
      ]).then(() => {
        showSnackbar(
          t`You'll be notified when ${constructorName} posts a new puzzle`
        );
      });
    },
    [constructorName, page.u, showSnackbar]
  );

  const css = { minWidth: '7em' };

  if (!user || user.isAnonymous) {
    return (
      <>
        {showOverlay ? (
          <Overlay
            closeCallback={() => {
              setShowOverlay(false);
            }}
          >
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
          onClick={(e) => {
            e.stopPropagation();
            setShowOverlay(true);
          }}
          text={t`Follow`}
          {...props}
        />
      </>
    );
  }
  if (user.uid === page.u) {
    return (
      <>
        <Button
          css={css}
          hollow
          disabled
          text={
            <>
              {t`Follow`}
              <ToolTipText
                css={{ marginLeft: '0.5em' }}
                text={<FaInfoCircle />}
                tooltip={t`You can't follow yourself!`}
              />
            </>
          }
          {...props}
        />
      </>
    );
  }
  if (isFollowing) {
    return (
      <>
        <Button
          css={css}
          onClick={logAsyncErrors(async (e) => {
            e.stopPropagation();
            await Promise.all([
              setDoc(
                getDocRef('prefs', user.uid),
                { following: arrayRemove(page.u) },
                { merge: true }
              ),
              setDoc(
                getDocRef('followers', page.u),
                { f: arrayRemove(user.uid) },
                { merge: true }
              ),
            ]).then(() => {
              showSnackbar(t`No longer following ${constructorName}`);
            });
          })}
          text={t`Following`}
          hoverText={t`Unfollow`}
          hoverCSS={{ backgroundColor: 'var(--error)' }}
          {...props}
        />
      </>
    );
  }
  return (
    <Button
      css={css}
      hollow
      onClick={(e) => {
        e.stopPropagation();
        logAsyncErrors(doFollow)(user);
      }}
      text={t`Follow`}
      {...props}
    />
  );
};
