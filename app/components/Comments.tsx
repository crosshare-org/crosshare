import { useState, useEffect, useContext, ReactNode, FormEvent } from 'react';
import * as iot from 'io-ts';
import { isRight } from 'fp-ts/lib/Either';
import { PathReporter } from 'io-ts/lib/PathReporter';
import type firebase from 'firebase/app';
import { AuthContext } from './AuthContext';
import { PartialBy, Comment, Direction } from '../lib/types';
import { Identicon } from './Icons';
import { timeString } from '../lib/utils';
import { Emoji } from './Emoji';
import { DisplayNameForm, useDisplayName } from './DisplayNameForm';
import { App, TimestampClass } from '../lib/firebaseWrapper';
import {
  CommentForModerationT,
  CommentForModerationWithIdV,
  CommentForModerationWithIdT,
} from '../lib/dbtypes';
import { GoogleLinkButton, GoogleSignInButton } from './GoogleButtons';
import { Markdown } from './Markdown';
import { ConstructorPageT } from '../lib/constructorPage';
import { Link } from './Link';
import { ButtonAsLink, Button } from './Buttons';
import { LengthLimitedTextarea, LengthView } from './Inputs';
import { Trans, t } from '@lingui/macro';
import { PastDistanceToNow } from './TimeDisplay';

const COMMENT_LENGTH_LIMIT = 280;

interface LocalComment extends Omit<Comment, 'replies'> {
  isLocal: true;
}
type CommentWithPossibleLocalReplies = Omit<Comment, 'replies'> & {
  replies?: Array<CommentOrLocalComment>;
};
type CommentOrLocalComment = CommentWithPossibleLocalReplies | LocalComment;

interface CommentProps {
  puzzlePublishTime: number;
  puzzleAuthorId: string;
  hasGuestConstructor: boolean;
  comment: CommentOrLocalComment;
  children?: ReactNode;
  clueMap: Map<string, [number, Direction, string]>;
}
const CommentView = (props: CommentProps) => {
  return (
    <div
      css={{
        marginTop: '1em',
        ['p:last-of-type']: {
          marginBottom: 0,
        },
      }}
    >
      <div>
        <CommentFlair
          publishTime={Math.max(
            props.comment.publishTime,
            props.puzzlePublishTime
          )}
          displayName={props.comment.authorDisplayName}
          username={props.comment.authorUsername}
          userId={props.comment.authorId}
          puzzleAuthorId={props.puzzleAuthorId}
          hasGuestConstructor={props.hasGuestConstructor}
          solveTime={props.comment.authorSolveTime}
          didCheat={props.comment.authorCheated}
          downsOnly={props.comment.authorSolvedDownsOnly}
        />
      </div>
      <Markdown text={props.comment.commentText} clueMap={props.clueMap} />
      {props.children}
    </div>
  );
};

const CommentWithReplies = (
  props: PartialBy<CommentFormProps, 'user'> & {
    comment: CommentOrLocalComment;
    constructorPage: ConstructorPageT | undefined;
  }
) => {
  const [showingForm, setShowingForm] = useState(false);
  const commentId = isComment(props.comment) ? props.comment.id : null;
  const replies = isComment(props.comment) ? props.comment.replies : undefined;
  return (
    <CommentView
      hasGuestConstructor={props.hasGuestConstructor}
      puzzlePublishTime={props.puzzlePublishTime}
      clueMap={props.clueMap}
      puzzleAuthorId={props.puzzleAuthorId}
      comment={props.comment}
    >
      {!props.user || props.user.isAnonymous || !commentId ? (
        ''
      ) : showingForm ? (
        <div css={{ marginLeft: '2em' }}>
          <CommentForm
            {...props}
            username={props.constructorPage?.i}
            onCancel={() => setShowingForm(false)}
            replyToId={commentId}
            user={props.user}
          />
        </div>
      ) : (
        <div>
          <ButtonAsLink onClick={() => setShowingForm(true)} text={t`Reply`} />
        </div>
      )}
      {replies ? (
        <ul
          css={{
            listStyleType: 'none',
            margin: '0 0 0 2em',
            padding: 0,
          }}
        >
          {replies.map((a, i) => (
            <li key={i}>
              <CommentWithReplies {...{ ...props, comment: a }} />
            </li>
          ))}
        </ul>
      ) : (
        ''
      )}
    </CommentView>
  );
};

function commentsKey(puzzleId: string) {
  return 'comments/' + puzzleId;
}

function commentsFromStorage(
  puzzleId: string
): Array<CommentForModerationWithIdT> {
  let inSession: string | null;
  try {
    inSession = localStorage.getItem(commentsKey(puzzleId));
  } catch {
    /* happens on incognito when iframed */
    console.warn('not loading comments from LS');
    inSession = null;
  }
  if (inSession) {
    const res = iot
      .array(CommentForModerationWithIdV)
      .decode(JSON.parse(inSession));
    if (isRight(res)) {
      return res.right;
    } else {
      console.error('Couldn\'t parse object in local storage');
      console.error(PathReporter.report(res).join(','));
    }
  }
  return [];
}

const CommentAuthor = (props: { username?: string; displayName: string }) => {
  if (props.username) {
    return <Link href={'/' + props.username}>{props.displayName}</Link>;
  }
  return <>{props.displayName}</>;
};

interface CommentFlairProps {
  publishTime?: number;
  solveTime: number;
  didCheat: boolean;
  downsOnly: boolean;
  displayName: string;
  userId: string;
  username?: string;
  puzzleAuthorId: string;
  hasGuestConstructor: boolean;
}
const CommentFlair = (props: CommentFlairProps) => {
  const publishDate =
    props.publishTime !== undefined && new Date(props.publishTime);
  return (
    <>
      <span css={{ verticalAlign: 'text-bottom' }}>
        <Identicon id={props.userId} />
      </span>
      <i>
        {' '}
        <CommentAuthor
          displayName={props.displayName}
          username={props.username}
        />{' '}
      </i>
      {props.userId === props.puzzleAuthorId ? (
        <span
          css={{
            fontSize: '0.75em',
            backgroundColor: 'var(--primary)',
            color: 'var(--onprimary)',
            borderRadius: 5,
            padding: '0.1em 0.2em',
          }}
        >
          {props.hasGuestConstructor ? (
            <Trans>publisher</Trans>
          ) : (
            <Trans id="ctor">constructor</Trans>
          )}
        </span>
      ) : (
        <>
          {props.didCheat ? (
            ''
          ) : props.downsOnly ? (
            <Emoji title="Solved downs-only" symbol="👇" />
          ) : (
            <Emoji title="Solved without helpers" symbol="🤓" />
          )}
          <span
            css={{
              fontSize: '0.75em',
              backgroundColor: 'var(--caption)',
              color: 'white',
              borderRadius: 5,
              padding: '0.1em 0.2em',
            }}
          >
            {timeString(props.solveTime, false)}
          </span>
        </>
      )}
      {publishDate ? (
        <>
          &nbsp;·&nbsp;
          <span css={{ fontStyle: 'italic' }} title={publishDate.toISOString()}>
            <PastDistanceToNow date={publishDate} />{' '}
          </span>
        </>
      ) : (
        ''
      )}
    </>
  );
};

interface CommentFormProps {
  username?: string;
  puzzlePublishTime: number;
  puzzleAuthorId: string;
  hasGuestConstructor: boolean;
  user: firebase.User;
  solveTime: number;
  didCheat: boolean;
  downsOnly: boolean;
  puzzleId: string;
  replyToId?: string;
  clueMap: Map<string, [number, Direction, string]>;
}

const CommentForm = ({
  onCancel,
  ...props
}: CommentFormProps & { onCancel?: () => void }) => {
  const [commentText, setCommentText] = useState('');
  const displayName = useDisplayName();
  const [editingDisplayName, setEditingDisplayName] = useState(false);
  const [submittedComment, setSubmittedComment] = useState<LocalComment | null>(
    null
  );

  if (props.user === null) {
    throw new Error('displaying comment form w/ no user');
  }

  function submitComment(event: FormEvent) {
    event.preventDefault();
    const textToSubmit = commentText.trim();
    if (!textToSubmit) {
      return;
    }
    const comment: CommentForModerationT = {
      c: textToSubmit,
      a: props.user.uid,
      n: displayName || 'Anonymous Crossharer',
      t: props.solveTime,
      ch: props.didCheat,
      do: props.downsOnly,
      p: TimestampClass.now(),
      pid: props.puzzleId,
      rt: props.replyToId !== undefined ? props.replyToId : null,
    };
    if (props.username) {
      comment.un = props.username;
    }
    console.log('Submitting comment', comment);
    const db = App.firestore();
    // Add to moderation queue for long term
    db.collection('cfm')
      .add(comment)
      .then((ref) => {
        console.log('Uploaded', ref.id);

        // Replace this form w/ the comment for the short term
        setSubmittedComment({
          isLocal: true,
          id: ref.id,
          commentText: comment.c,
          authorId: comment.a,
          authorUsername: comment.un,
          authorDisplayName: comment.n,
          authorSolveTime: comment.t,
          authorCheated: comment.ch,
          authorSolvedDownsOnly: comment.do || false,
          publishTime: comment.p.toMillis(),
        });
        // Add the comment to localStorage for the medium term
        const forSession = commentsFromStorage(props.puzzleId);
        forSession.push({ i: ref.id, ...comment });
        try {
          localStorage.setItem(
            commentsKey(props.puzzleId),
            JSON.stringify(forSession)
          );
        } catch {
          /* happens on incognito when iframed */
          console.warn('not saving comment in LS');
        }
      });
  }

  if (submittedComment) {
    return (
      <CommentView
        hasGuestConstructor={props.hasGuestConstructor}
        clueMap={props.clueMap}
        puzzlePublishTime={props.puzzlePublishTime}
        puzzleAuthorId={props.puzzleAuthorId}
        comment={submittedComment}
      />
    );
  }

  return (
    <>
      <form onSubmit={submitComment}>
        <label css={{ width: '100%', margin: 0 }}>
          {(props.replyToId !== undefined
            ? t`Enter your reply`
            : t`Leave a comment`) +
            ' ' +
            t`(please be nice!):`}
          <LengthLimitedTextarea
            css={{ width: '100%', display: 'block' }}
            maxLength={COMMENT_LENGTH_LIMIT}
            value={commentText}
            updateValue={setCommentText}
          />
        </label>
        <div css={{ textAlign: 'right' }}>
          <LengthView maxLength={COMMENT_LENGTH_LIMIT} value={commentText} />
        </div>
        {editingDisplayName || !displayName ? (
          ''
        ) : (
          <>
            <Button
              type="submit"
              css={{ marginRight: '0.5em' }}
              disabled={commentText.length === 0}
              text={t`Save`}
            />
            {onCancel ? (
              <Button
                boring={true}
                css={{ marginRight: '0.5em' }}
                onClick={onCancel}
                text={t`Cancel`}
              />
            ) : (
              ''
            )}
            <Trans>commenting as</Trans>{' '}
            <CommentFlair
              hasGuestConstructor={props.hasGuestConstructor}
              username={props.username}
              displayName={displayName}
              userId={props.user.uid}
              puzzleAuthorId={props.puzzleAuthorId}
              solveTime={props.solveTime}
              didCheat={props.didCheat}
              downsOnly={props.downsOnly}
            />{' '}
            (
            <ButtonAsLink
              onClick={() => setEditingDisplayName(true)}
              text={t`change name`}
            />
            )
          </>
        )}
        {commentText.trim() ? (
          <div
            css={{
              backgroundColor: 'var(--secondary)',
              borderRadius: '0.5em',
              padding: '1em',
              marginTop: '1em',
            }}
          >
            <h4>
              <Trans>Live Preview:</Trans>
            </h4>
            <Markdown text={commentText} clueMap={props.clueMap} />
          </div>
        ) : (
          ''
        )}
      </form>
      {editingDisplayName || !displayName ? (
        <>
          <DisplayNameForm onCancel={() => setEditingDisplayName(false)} />
        </>
      ) : (
        ''
      )}
    </>
  );
};

interface CommentsProps {
  solveTime: number;
  didCheat: boolean;
  downsOnly: boolean;
  puzzleId: string;
  puzzleAuthorId: string;
  hasGuestConstructor: boolean;
  puzzlePublishTime: number;
  comments: Array<Comment>;
  clueMap: Map<string, [number, Direction, string]>;
}

function isComment(
  comment: CommentOrLocalComment
): comment is CommentWithPossibleLocalReplies {
  return !('isLocal' in comment);
}

function findCommentById(
  comments: Array<CommentOrLocalComment>,
  id: string
): CommentWithPossibleLocalReplies | null {
  for (const comment of comments) {
    if (comment.id === id) {
      return comment;
    }
    if (!isComment(comment)) {
      continue;
    }
    if (comment.replies !== undefined) {
      const res = findCommentById(comment.replies, id);
      if (res !== null) {
        return res;
      }
    }
  }
  return null;
}

export const Comments = ({
  comments,
  ...props
}: CommentsProps): JSX.Element => {
  const authContext = useContext(AuthContext);
  const [toShow, setToShow] = useState<Array<CommentOrLocalComment>>(comments);

  useEffect(() => {
    if (!authContext.notifications?.length) {
      return;
    }
    for (const notification of authContext.notifications) {
      if (notification.r) {
        // shouldn't be possible but be defensive
        continue;
      }
      if (notification.k !== 'comment' && notification.k !== 'reply') {
        continue;
      }
      if (findCommentById(comments, notification.c)) {
        App.firestore()
          .collection('n')
          .doc(notification.id)
          .update({ r: true });
      }
    }
  }, [comments, authContext.notifications]);

  useEffect(() => {
    const rebuiltComments: Array<CommentOrLocalComment> = comments;
    const unmoderatedComments = commentsFromStorage(props.puzzleId);
    const toKeepInStorage: Array<CommentForModerationWithIdT> = [];
    for (const c of unmoderatedComments) {
      const moderatedVersion = findCommentById(rebuiltComments, c.i);
      // The comment we saved in LS has already made it through moderation
      // so we don't need to merge it - by not adding to `toKeepInStorage` this
      // will also remove from LS
      if (moderatedVersion !== null) {
        console.log('found existing version, skipping one from LS');
        if (!isComment(moderatedVersion)) {
          toKeepInStorage.push(c);
        }
        continue;
      }

      toKeepInStorage.push(c);
      const localComment: LocalComment = {
        isLocal: true,
        id: c.i,
        commentText: c.c,
        authorId: c.a,
        authorDisplayName: c.n,
        authorUsername: c.un,
        authorSolveTime: c.t,
        authorCheated: c.ch,
        authorSolvedDownsOnly: c.do || false,
        publishTime: c.p.toMillis(),
      };
      if (c.rt === null) {
        rebuiltComments.push(localComment);
      } else {
        const parent = findCommentById(rebuiltComments, c.rt);
        if (parent === null) {
          /* TODO figure out better behaivior here?
           * One possibility is that we saw the comment originally when
           * loading the puzzle via client side link but are now loading via
           * page refresh. If the content is cached at a different time the
           * parent comment might not be here yet. */
          continue;
        }
        if (parent.replies) {
          parent.replies.push(localComment);
        } else {
          parent.replies = [localComment];
        }
      }
    }
    /* This means one or more have made it through moderation - update LS.
     * We don't need to try/catch this LS access as we only do it if we
     * read from LS successfully above */
    if (toKeepInStorage.length !== unmoderatedComments.length) {
      if (toKeepInStorage.length === 0) {
        localStorage.removeItem(commentsKey(props.puzzleId));
      } else {
        localStorage.setItem(
          commentsKey(props.puzzleId),
          JSON.stringify(toKeepInStorage)
        );
      }
    }
    setToShow(rebuiltComments);
  }, [props.puzzleId, comments]);
  return (
    <div css={{ marginTop: '1em' }}>
      <h4 css={{ borderBottom: '1px solid var(--black)' }}>
        <Trans>Comments</Trans>
      </h4>
      {!authContext.user || authContext.user.isAnonymous ? (
        <div css={{ textAlign: 'center' }}>
          <p>
            <Trans>Sign in with google to leave a comment of your own:</Trans>
          </p>
          {authContext.user ? (
            <GoogleLinkButton user={authContext.user} />
          ) : (
            <GoogleSignInButton />
          )}
        </div>
      ) : (
        <CommentForm
          {...props}
          username={authContext.constructorPage?.i}
          user={authContext.user}
        />
      )}
      <ul
        css={{
          listStyleType: 'none',
          margin: '2em 0 0 0',
          padding: 0,
        }}
      >
        {toShow.map((a, i) => (
          <li key={i}>
            <CommentWithReplies
              user={authContext.user}
              constructorPage={authContext.constructorPage}
              comment={a}
              {...props}
            />
          </li>
        ))}
      </ul>
    </div>
  );
};
