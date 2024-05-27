import { Plural } from '@lingui/macro';
import { User } from 'firebase/auth';
import {
  Fragment,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { ConstructorPageBase } from '../lib/constructorPage.js';
import {
  PuzzleReaction,
  getReaction,
  savedReactions,
  setReaction,
} from '../lib/reactions.js';
import { ServerPuzzleResult } from '../lib/types.js';
import { AuthContext } from './AuthContext.js';
import { Button, ButtonAsLink } from './Buttons.js';
import { ConstructorList } from './ConstructorList.js';
import { GoogleLinkButton, GoogleSignInButton } from './GoogleButtons.js';
import { Link } from './Link.js';
import { Overlay } from './Overlay.js';
import styles from './ReactionButton.module.css';
import { ToolTipText } from './ToolTipText.js';

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

function ToolTip(props: {
  count: number;
  numOthers: number;
  otherUsers: (ConstructorPageBase & { isPatron: boolean })[];
  showList: () => void;
  isSet: boolean;
}): ReactNode {
  const numUsers = props.otherUsers.length;

  if (props.count === 0) {
    return 'No likes yet';
  }

  if (props.numOthers === 0) {
    return 'You liked this';
  }

  if (!props.isSet && numUsers === 0) {
    return `Liked by ${props.numOthers} user${props.numOthers > 1 ? 's' : ''}`;
  }

  const parts: ReactNode[] = [];
  if (props.isSet) {
    parts.push('you');
  }
  const linked = props.otherUsers.slice(0, 3).map((u, i) => (
    <Link key={i} href={`/${u.i}`}>
      {u.n}
    </Link>
  ));
  parts.push(...linked);
  const rest = props.numOthers - linked.length;
  if (rest > 0) {
    if (numUsers - linked.length > 0) {
      parts.push(
        <ButtonAsLink onClick={props.showList}>
          {rest} other{rest > 1 ? 's' : ''}
        </ButtonAsLink>
      );
    } else {
      parts.push(`${rest} other${rest > 1 ? 's' : ''}`);
    }
  }
  return (
    <>
      Liked by{' '}
      {parts.map((val, idx) => (
        <Fragment key={idx}>
          {idx > 0 && idx < parts.length - 1 ? ',' : ''}
          {idx > 0 && idx === parts.length - 1 ? ' and' : ''} {val}
        </Fragment>
      ))}
    </>
  );
}

export function ReactionButton(props: ReactionButtonProps) {
  const { user, loading: loadingUser } = useContext(AuthContext);

  const [showList, setShowList] = useState(false);
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

  const toggle = useCallback(
    async (newUser?: User) => {
      const userId =
        newUser && !newUser.isAnonymous
          ? newUser.uid
          : user && !user.isAnonymous
          ? user.uid
          : null;
      if (!userId) {
        return Promise.resolve();
      }
      setSubmitting(true);
      return setReaction(props.kind, !isSet, props.puzzle.id, userId)
        .then(() => {
          setSubmitting(false);
          setIsSet(!isSet);
        })
        .catch((e: unknown) => {
          console.error('error submitting reaction', e);
        });
    },
    [isSet, props.kind, props.puzzle.id, user]
  );

  const others = { ...savedReactions(props.kind, props.puzzle) };
  // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
  delete others[user?.uid || ''];
  const numOthers = Object.keys(others).length;
  const count = numOthers + (isSet ? 1 : 0);
  const otherUsers = Object.values(others).filter(
    (v): v is ConstructorPageBase & { isPatron: boolean } => v !== null
  );

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
              <GoogleLinkButton
                user={user}
                postSignIn={async (u) => {
                  await toggle(u);
                  setShowOverlay(false);
                }}
              />
            ) : (
              <GoogleSignInButton
                postSignIn={async (u) => {
                  await toggle(u);
                  setShowOverlay(false);
                }}
              />
            )}
          </div>
        </Overlay>
      ) : (
        ''
      )}
      {showList ? (
        <Overlay
          closeCallback={() => {
            setShowList(false);
          }}
        >
          <div className="textAlignCenter">
            <h2>{count} users like this</h2>
            <h3>
              <Plural
                id="follower-blog-count"
                value={otherUsers.length}
                one="1 with a Crosshare blog:"
                other="# with Crosshare blogs:"
              />
            </h3>

            <ConstructorList
              pages={otherUsers}
              close={() => {
                setShowList(false);
              }}
            />
          </div>
        </Overlay>
      ) : (
        ''
      )}
      <ToolTipText
        className={styles.tt}
        text={
          <Button
            className={styles.btn}
            onClick={onClick}
            hollow={!isSet}
            disabled={
              !mounted || submitting || props.puzzle.authorId === user?.uid
            }
          >
            <Emoji kind={props.kind} />{' '}
            {submitting ? '…' : count > 0 ? count : ''}
          </Button>
        }
        tooltip={
          <ToolTip
            isSet={isSet}
            showList={() => {
              setShowList(true);
            }}
            count={count}
            numOthers={numOthers}
            otherUsers={otherUsers}
          />
        }
      />
    </>
  );
}
