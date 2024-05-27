import { t } from '@lingui/macro';
import type { User } from 'firebase/auth';
import { arrayRemove, arrayUnion, setDoc } from 'firebase/firestore';
import { useCallback, useContext, useEffect, useState } from 'react';
import { FaInfoCircle } from 'react-icons/fa';
import { ConstructorPageBase } from '../lib/constructorPage.js';
import { getDocRef } from '../lib/firebaseWrapper.js';
import { clsx, logAsyncErrors } from '../lib/utils.js';
import { AuthContext } from './AuthContext.js';
import { Button } from './Buttons.js';
import styles from './FollowButton.module.css';
import { GoogleLinkButton, GoogleSignInButton } from './GoogleButtons.js';
import { Overlay } from './Overlay.js';
import { useSnackbar } from './Snackbar.js';
import { ToolTipText } from './ToolTipText.js';

export const FollowButton = ({
  page,
  className,
  ...props
}: {
  page: ConstructorPageBase;
  className?: string;
}) => {
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);
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

  if (!isMounted || !user || user.isAnonymous) {
    return (
      <>
        {showOverlay ? (
          <Overlay
            closeCallback={() => {
              setShowOverlay(false);
            }}
          >
            <div className="textAlignCenter">
              <h2>
                Follow {page.n} to get notified when they post a new puzzle
              </h2>
              <p>Login with Google to follow</p>
              {isMounted && user ? (
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
          className={clsx(styles.btn, className)}
          hollow
          disabled={!isMounted || authCtx.loading}
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
          className={clsx(styles.btn, className)}
          hollow
          disabled
          text={
            <>
              {t`Follow`}
              <ToolTipText
                className="marginLeft0-5em"
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
          className={clsx(styles.btn, styles.hoverError, className)}
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
          {...props}
        />
      </>
    );
  }
  return (
    <Button
      className={clsx(styles.btn, className)}
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
