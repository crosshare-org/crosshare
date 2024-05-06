import {
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import {
  PuzzleReaction,
  getReaction,
  savedReactions,
  setReaction,
} from '../lib/reactions';
import { ServerPuzzleResult } from '../lib/types';
import { AuthContext } from './AuthContext';
import { Button } from './Buttons';
import { GoogleLinkButton, GoogleSignInButton } from './GoogleButtons';
import { Overlay } from './Overlay';
import styles from './ReactionButton.module.css';

interface ReactionButtonProps {
  puzzle: ServerPuzzleResult;
  kind: PuzzleReaction;
}

function Emoji(props: { kind: PuzzleReaction }): ReactNode {
  switch (props.kind) {
    case PuzzleReaction.Like:
      return '👍';
  }
}

export function ReactionButton(props: ReactionButtonProps) {
  const { user, loading: loadingUser } = useContext(AuthContext);

  const [showOverlay, setShowOverlay] = useState(false);
  const [isSet, setIsSet] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (loadingUser) {
      return;
    }
    setMounted(true);
    if (!user) {
      return;
    }
    setIsSet(getReaction(props.kind, props.puzzle, user.uid));
  }, [user, loadingUser, props.kind, props.puzzle]);

  function onClick() {
    if (!user || user.isAnonymous) {
      setShowOverlay(true);
      return;
    }
    void toggle();
  }

  const toggle = useCallback(async () => {
    if (!user || user.isAnonymous) {
      return Promise.resolve();
    }
    setSubmitting(true);
    return setReaction(props.kind, !isSet, props.puzzle.id, user.uid)
      .then(() => {
        setSubmitting(false);
        setIsSet(!isSet);
      })
      .catch((e: unknown) => {
        console.error('error submitting reaction', e);
      });
  }, [isSet, props.kind, props.puzzle.id, user]);

  const existing = savedReactions(props.kind, props.puzzle);
  const count =
    existing.filter((uid) => uid !== user?.uid).length + (isSet ? 1 : 0);

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  return (
    <>
      {showOverlay ? (
        <Overlay
          closeCallback={() => {
            setShowOverlay(false);
          }}
        >
          <div className="textAlignCenter">
            <p>Login with Google to {props.kind} this puzzle</p>
            {mounted && user ? (
              <GoogleLinkButton user={user} postSignIn={toggle} />
            ) : (
              <GoogleSignInButton postSignIn={toggle} />
            )}
          </div>
        </Overlay>
      ) : (
        ''
      )}
      <Button
        className={styles.btn}
        onClick={onClick}
        hollow={!isSet}
        disabled={!mounted || submitting || props.puzzle.authorId === user?.uid}
      >
        <Emoji kind={props.kind} /> {submitting ? '…' : count > 0 ? count : ''}
      </Button>
    </>
  );
}
