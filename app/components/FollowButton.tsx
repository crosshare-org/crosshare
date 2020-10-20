
import { ConstructorPageT } from '../lib/constructorPage';
import { AuthPropsOptional } from './AuthContext';
import { Button } from './Buttons';
import { ToolTipText } from './ToolTipText';
import { GoogleLinkButton, GoogleSignInButton } from './GoogleButtons';
import { Overlay } from './Overlay';
import { FaInfoCircle } from 'react-icons/fa';
import { useSnackbar } from './Snackbar';
import { App, FieldValue } from '../lib/firebaseWrapper';
import { useCallback, useState } from 'react';

export const FollowButton = ({ user, ...props }: { constructor: ConstructorPageT } & AuthPropsOptional) => {
  const isFollowing = props.prefs ?.following ?.includes(props.constructor.u);
  const { showSnackbar } = useSnackbar();
  const [showOverlay, setShowOverlay] = useState(false);
  const doFollow = useCallback(async (loggedInAs: firebase.User) => {
    setShowOverlay(false);
    return App.firestore().doc(`prefs/${loggedInAs.uid}`).set({ following: FieldValue.arrayUnion(props.constructor.u) }, { merge: true }).then(() => {
      showSnackbar(`Now following ${props.constructor.n}`);
    });
  }, [props.constructor.n, props.constructor.u, showSnackbar]);

  if (!user || user.isAnonymous) {
    return <>
      {showOverlay ?
        <Overlay closeCallback={() => setShowOverlay(false)}>
          <div css={{ textAlign: 'center' }}>
            <h2>Follow {props.constructor.n} to get notified when they post a new puzzle</h2>
            <p>Login with Google to follow</p>
            {user ?
              <GoogleLinkButton user={user} postSignIn={doFollow} />
              :
              <GoogleSignInButton postSignIn={doFollow} />
            }
          </div>
        </Overlay>
        : ''
      }
      <Button hollow onClick={() => setShowOverlay(true)} text='Follow' />
      <ToolTipText css={{ marginLeft: '0.5em' }} text={<FaInfoCircle />} tooltip={`Get notified when ${props.constructor.n} posts a new puzzle`} />
    </>;
  }
  if (isFollowing) {
    return <>
      <Button onClick={() => App.firestore().doc(`prefs/${user.uid}`).set({ following: FieldValue.arrayRemove(props.constructor.u) }, { merge: true }).then(() => {
        showSnackbar(`No longer following ${props.constructor.n}`);
      })} text='Following' hoverText='Unfollow' hoverCSS={{ backgroundColor: 'var(--error)' }} />
    </>;
  }
  return <>

    <Button hollow onClick={() => doFollow(user)} text='Follow' />
    <ToolTipText css={{ marginLeft: '0.5em' }} text={<FaInfoCircle />} tooltip={`Get notified when ${props.constructor.n} posts a new puzzle`} />
  </>;
};
