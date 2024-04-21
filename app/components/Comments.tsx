import {
  useState,
  useEffect,
  useContext,
  ReactNode,
  FormEvent,
  Fragment,
} from 'react';
import * as iot from 'io-ts';
import type { User } from 'firebase/auth';
import { AuthContext } from './AuthContext';
import { PartialBy, Comment, Direction } from '../lib/types';
import { PatronIcon } from './Icons';
import { logAsyncErrors, timeString } from '../lib/utils';
import { Emoji } from './Emoji';
import { DisplayNameForm, useDisplayName } from './DisplayNameForm';
import {
  CommentForModerationT,
  CommentForModerationWithIdV,
  CommentForModerationWithIdT,
  CommentDeletionT,
} from '../lib/dbtypes';
import { GoogleLinkButton, GoogleSignInButton } from './GoogleButtons';
import { Markdown } from './Markdown';
import { ConstructorPageT } from '../lib/constructorPage';
import { Link } from './Link';
import { ButtonAsLink, Button } from './Buttons';
import { LengthLimitedTextarea, LengthView } from './Inputs';
import { Trans, t } from '@lingui/macro';
import { PastDistanceToNow } from './TimeDisplay';
import { Timestamp } from '../lib/timestamp';
import { getCollection, getDocRef } from '../lib/firebaseWrapper';
import { addDoc, updateDoc } from 'firebase/firestore';
import type { Root } from 'hast';
import { ReportOverlay } from './ReportOverlay';
import { Overlay } from './Overlay';
import { arrayFromLocalStorage } from '../lib/storage';
import styles from './Comments.module.css';

export const COMMENT_LENGTH_LIMIT = 2048;

interface LocalComment extends Omit<Comment, 'replies'> {
  replyTo: string | null;
  isLocal: true;
}
type CommentWithPossibleLocalReplies = Omit<Comment, 'replies'> & {
  replies?: CommentOrLocalComment[];
};
type CommentOrLocalComment = CommentWithPossibleLocalReplies | LocalComment;

function isComment(
  comment: CommentOrLocalComment
): comment is CommentWithPossibleLocalReplies {
  return !('isLocal' in comment);
}

// Get a dummy hast tree for the comments we need to modify to mark deleted
function getHast(text: string): Root {
  return {
    type: 'root',
    children: [
      {
        type: 'element',
        tagName: 'p',
        properties: {},
        children: [
          {
            type: 'element',
            tagName: 'em',
            properties: {},
            children: [{ type: 'text', value: text }],
          },
        ],
      },
    ],
  };
}

// TODO this is identical to the function in `serverOnly.ts` but operates on a different format of Comment - unify if possible
function filterDeletedComments<T extends CommentOrLocalComment>(
  comments: T[]
): T[] {
  return comments
    .map(
      (c: T): T => ({
        ...c,
        replies: filterDeletedComments((isComment(c) && c.replies) || []),
      })
    )
    .map((c) => {
      if (isComment(c) && !c.replies?.length) {
        delete c.replies;
        return c;
      } else {
        return {
          ...c,
          commentText: c.deleted
            ? c.removed
              ? '*Comment removed*'
              : '*Comment deleted*'
            : c.commentText,
          commentHast: c.deleted
            ? c.removed
              ? getHast('Comment removed')
              : getHast('Comment deleted')
            : c.commentHast,
        };
      }
    })
    .filter((x) => (isComment(x) && x.replies?.length) || !x.deleted);
}

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
    <div className="marginTop1em">
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
          isPatron={props.comment.authorIsPatron}
        />
      </div>
      <Markdown hast={props.comment.commentHast} />
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
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const [showingForm, setShowingForm] = useState(false);
  const [showingReportOverlay, setShowingReportOverlay] = useState(false);
  const [showingDeleteOverlay, setShowingDeleteOverlay] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const commentId = isComment(props.comment) ? props.comment.id : null;
  const replies = isComment(props.comment) ? props.comment.replies : undefined;

  const { isAdmin } = useContext(AuthContext);

  const actionButtons: ReactNode[] = [];
  if (!props.comment.deleted) {
    if (isMounted && props.user && !props.user.isAnonymous && commentId) {
      actionButtons.push(
        <ButtonAsLink
          onClick={() => {
            setShowingForm(true);
          }}
          text={t`Reply`}
        />
      );
    }
    if (isMounted && (props.comment.authorId === props.user?.uid || isAdmin)) {
      actionButtons.push(
        <ButtonAsLink
          onClick={() => {
            setShowingDeleteOverlay(true);
          }}
          text={'Delete'}
        />
      );
    }
    if (!isMounted || props.user?.uid !== props.comment.authorId) {
      actionButtons.push(
        <ButtonAsLink
          onClick={() => {
            setShowingReportOverlay(true);
          }}
          text={'Report'}
        />
      );
    }
  }

  async function deleteComment(event: FormEvent) {
    event.preventDefault();
    if (deleting) {
      return;
    }
    setDeleting(true);

    props.onDelete(props.comment.id);

    const deletion: CommentDeletionT = {
      pid: props.puzzleId,
      cid: props.comment.id,
      a: props.comment.authorId,
      // This will only be possible if user is admin and is removing a comment by somebody else
      removed: props.comment.authorId !== props.user?.uid,
    };

    await addDoc(getCollection('deleteComment'), deletion).then(() => {
      setShowingDeleteOverlay(false);
      setDeleting(false);
    });
  }

  return (
    <CommentView
      hasGuestConstructor={props.hasGuestConstructor}
      puzzlePublishTime={props.puzzlePublishTime}
      clueMap={props.clueMap}
      puzzleAuthorId={props.puzzleAuthorId}
      comment={props.comment}
    >
      {showingDeleteOverlay ? (
        <Overlay
          closeCallback={() => {
            setShowingDeleteOverlay(false);
          }}
        >
          <h2>Are you sure you want to delete your comment?</h2>
          <form onSubmit={logAsyncErrors(deleteComment)}>
            <Button
              type="submit"
              className={styles.leftButton}
              disabled={deleting}
              text={'Delete'}
            />
            <Button
              boring={true}
              disabled={deleting}
              onClick={() => {
                setShowingDeleteOverlay(false);
              }}
              text={'Cancel'}
            />
          </form>
        </Overlay>
      ) : (
        ''
      )}
      {showingReportOverlay ? (
        <ReportOverlay
          puzzleId={props.puzzleId}
          comment={props.comment}
          closeOverlay={() => {
            setShowingReportOverlay(false);
          }}
        />
      ) : (
        ''
      )}
      {showingForm && props.user && !props.user.isAnonymous && commentId ? (
        <div className={styles.formWrapper}>
          <CommentForm
            {...props}
            username={props.constructorPage?.i}
            onCancel={() => {
              setShowingForm(false);
            }}
            replyToId={commentId}
            user={props.user}
            onSubmit={(s) => {
              props.onSubmit(s);
              setShowingForm(false);
            }}
          />
        </div>
      ) : (
        <div>
          {actionButtons.map((btn, idx) => (
            <Fragment key={idx}>
              {!!idx && <> &middot; </>}
              {btn}
            </Fragment>
          ))}
        </div>
      )}
      {replies ? (
        <ul className={styles.repliesList}>
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
  return `comments/${puzzleId}`;
}

function deletesKey(puzzleId: string) {
  return `deletions/${puzzleId}`;
}

function commentsFromStorage(puzzleId: string): CommentForModerationWithIdT[] {
  return arrayFromLocalStorage(
    commentsKey(puzzleId),
    CommentForModerationWithIdV
  );
}

function deletesFromStorage(puzzleId: string) {
  return arrayFromLocalStorage(deletesKey(puzzleId), iot.string);
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
  isPatron: boolean;
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
      {props.isPatron ? <PatronIcon linkIt={true} /> : ''}
      <i>
        {' '}
        <CommentAuthor
          displayName={props.displayName}
          username={props.username}
        />{' '}
      </i>
      {props.userId === props.puzzleAuthorId ? (
        <span className={styles.constructorTag}>
          {props.hasGuestConstructor ? (
            <Trans>publisher</Trans>
          ) : (
            <Trans>constructor</Trans>
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
          <span className={styles.solveTime}>
            {timeString(props.solveTime, false)}
          </span>
        </>
      )}
      {publishDate !== false ? (
        <>
          &nbsp;·&nbsp;
          <span className={styles.publishDate}>
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
  isPatron: boolean;
  puzzlePublishTime: number;
  puzzleAuthorId: string;
  hasGuestConstructor: boolean;
  user: User;
  solveTime: number;
  didCheat: boolean;
  downsOnly: boolean;
  puzzleId: string;
  replyToId?: string;
  clueMap: Map<string, [number, Direction, string]>;
  onSubmit: (comment: LocalComment) => void;
  onDelete: (commentId: string) => void;
}

const CommentForm = ({
  onSubmit,
  onCancel,
  ...props
}: CommentFormProps & { onCancel?: () => void }) => {
  const [commentText, setCommentText] = useState('');
  const [commentHast, setCommentHast] = useState<Root>({
    type: 'root',
    children: [],
  });
  const displayName = useDisplayName();
  const [editingDisplayName, setEditingDisplayName] = useState(false);
  const [saving, setSaving] = useState(false);

  async function submitComment(event: FormEvent) {
    event.preventDefault();
    const textToSubmit = commentText.trim();
    if (!textToSubmit) {
      return;
    }
    setSaving(true);
    const comment: CommentForModerationT = {
      c: textToSubmit,
      a: props.user.uid,
      n: displayName || 'Anonymous Crossharer',
      t: props.solveTime,
      ch: props.didCheat,
      do: props.downsOnly,
      p: Timestamp.now(),
      pid: props.puzzleId,
      rt: props.replyToId !== undefined ? props.replyToId : null,
    };
    if (props.username) {
      comment.un = props.username;
    }
    console.log('Submitting comment', comment);
    // Add to moderation queue for long term
    await addDoc(getCollection('cfm'), comment).then((ref) => {
      console.log('Uploaded', ref.id);
      setSaving(false);

      // Store the comment in memory to display immediately
      onSubmit({
        isLocal: true,
        id: ref.id,
        commentText: comment.c,
        commentHast: commentHast,
        authorId: comment.a,
        authorUsername: comment.un,
        authorDisplayName: comment.n,
        authorSolveTime: comment.t,
        authorCheated: comment.ch,
        authorSolvedDownsOnly: comment.do || false,
        publishTime: comment.p.toMillis(),
        authorIsPatron: props.isPatron,
        replyTo: comment.rt,
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

      // Reset the form
      setCommentText('');
      setCommentHast({
        type: 'root',
        children: [],
      });
    });
  }

  return (
    <>
      <form onSubmit={logAsyncErrors(submitComment)}>
        <div className="marginBottom1em">
          <label className="width100 margin0">
            {(props.replyToId !== undefined
              ? t`Enter your reply`
              : t`Leave a comment`) +
              ' ' +
              t`(please be nice!):`}
            <LengthLimitedTextarea
              className="width100 displayBlock"
              maxLength={COMMENT_LENGTH_LIMIT}
              value={commentText}
              updateValue={logAsyncErrors(async (newVal) => {
                setCommentText(newVal);
                await import('../lib/markdown/markdown').then((mod) => {
                  setCommentHast(
                    mod.markdownToHast({ text: newVal, clueMap: props.clueMap })
                  );
                });
              })}
            />
          </label>
          <div className="textAlignRight">
            <LengthView
              maxLength={COMMENT_LENGTH_LIMIT}
              value={commentText}
              hideUntilWithin={200}
            />
          </div>
        </div>
        {editingDisplayName || !displayName ? (
          ''
        ) : (
          <>
            <Button
              type="submit"
              className={styles.leftButton}
              disabled={commentText.length === 0 || saving}
              text={t`Save`}
            />
            {onCancel ? (
              <Button
                boring={true}
                disabled={saving}
                className={styles.leftButton}
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
              isPatron={props.isPatron}
              displayName={displayName}
              userId={props.user.uid}
              puzzleAuthorId={props.puzzleAuthorId}
              solveTime={props.solveTime}
              didCheat={props.didCheat}
              downsOnly={props.downsOnly}
            />{' '}
            (
            <ButtonAsLink
              onClick={() => {
                setEditingDisplayName(true);
              }}
              text={t`change name`}
            />
            )
          </>
        )}
        {commentText.trim() ? (
          <div className={styles.preview}>
            <h4>
              <Trans>Live Preview:</Trans>
            </h4>
            <Markdown hast={commentHast} />
          </div>
        ) : (
          ''
        )}
      </form>
      {editingDisplayName || !displayName ? (
        <>
          <DisplayNameForm
            onCancel={() => {
              setEditingDisplayName(false);
            }}
          />
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
  comments: Comment[];
  clueMap: Map<string, [number, Direction, string]>;
}

function findCommentById(
  comments: CommentOrLocalComment[],
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
  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const authContext = useContext(AuthContext);
  const [toShow, setToShow] = useState<CommentOrLocalComment[]>(comments);
  const [submittedComments, setSubmittedComments] = useState<LocalComment[]>(
    []
  );
  const [submittedDeletes, setSubmittedDeletes] = useState<string[]>([]);

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
        updateDoc(getDocRef('n', notification.id), { r: true }).catch(
          (e: unknown) => {
            console.log('error updating', e);
          }
        );
      }
    }
  }, [comments, authContext.notifications]);

  useEffect(() => {
    function cmp(a: CommentOrLocalComment, b: CommentOrLocalComment) {
      return a.publishTime - b.publishTime;
    }

    const rebuiltComments: CommentOrLocalComment[] = [...comments];

    function mergeComment(localComment: LocalComment) {
      if (localComment.replyTo === null) {
        rebuiltComments.push(localComment);
      } else {
        const parent = findCommentById(rebuiltComments, localComment.replyTo);
        if (parent === null) {
          /* TODO figure out better behaivior here?
           * One possibility is that we saw the comment originally when
           * loading the puzzle via client side link but are now loading via
           * page refresh. If the content is cached at a different time the
           * parent comment might not be here yet. */
          return;
        }
        if (parent.replies) {
          parent.replies.push(localComment);
        } else {
          parent.replies = [localComment];
        }
        parent.replies.sort(cmp);
      }
    }

    for (const submittedComment of submittedComments) {
      if (!findCommentById(rebuiltComments, submittedComment.id)) {
        mergeComment(submittedComment);
      }
    }

    const unmoderatedComments = commentsFromStorage(props.puzzleId);
    const storedDeletes = deletesFromStorage(props.puzzleId);
    const toKeepInStorage: CommentForModerationWithIdT[] = [];

    rebuiltComments.sort(cmp);
    // Mark comments that have been deleted
    for (const deletion of submittedDeletes.concat(storedDeletes)) {
      const comment = findCommentById(rebuiltComments, deletion);
      if (comment) {
        comment.deleted = true;
      }
    }
    const filtered = filterDeletedComments(rebuiltComments);
    setToShow(filtered);

    if (unmoderatedComments.length > 0) {
      import('../lib/markdown/markdown')
        .then((mod) => {
          for (const c of unmoderatedComments) {
            const moderatedVersion = findCommentById(rebuiltComments, c.i);
            // The comment we saved in LS has already made it through moderation
            // so we don't need to merge it - by not adding to `toKeepInStorage` this
            // will also remove from LS
            if (moderatedVersion !== null) {
              console.log('found existing version, skipping one from LS');
              if (!isComment(moderatedVersion)) {
                // This is still a local comment so keep it in storage
                toKeepInStorage.push(c);
              }
              continue;
            }

            toKeepInStorage.push(c);
            const localComment: LocalComment = {
              isLocal: true,
              id: c.i,
              commentText: c.c,
              commentHast: mod.markdownToHast({
                text: c.c,
                clueMap: props.clueMap,
              }),
              authorId: c.a,
              authorDisplayName: c.n,
              authorUsername: c.un,
              authorSolveTime: c.t,
              authorCheated: c.ch,
              authorSolvedDownsOnly: c.do || false,
              publishTime: c.p.toMillis(),
              authorIsPatron: authContext.isPatron,
              replyTo: c.rt,
            };
            mergeComment(localComment);
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

          rebuiltComments.sort(cmp);
          // Mark comments that have been deleted
          for (const deletion of submittedDeletes.concat(storedDeletes)) {
            const comment = findCommentById(rebuiltComments, deletion);
            if (comment) {
              comment.deleted = true;
            }
          }
          const filtered = filterDeletedComments(rebuiltComments);
          setToShow(filtered);
        })
        .catch((e: unknown) => {
          console.error('error rebuilding comments', e);
        });
    }
  }, [
    props.puzzleId,
    props.clueMap,
    comments,
    authContext.isPatron,
    submittedComments,
    submittedDeletes,
  ]);

  function deleteLocally(commentId: string) {
    setSubmittedDeletes([...submittedDeletes, commentId]);
    const forStorage = deletesFromStorage(props.puzzleId);
    forStorage.push(commentId);
    try {
      localStorage.setItem(
        deletesKey(props.puzzleId),
        JSON.stringify(forStorage)
      );
    } catch {
      /* happens on incognito when iframed */
      console.warn('not saving delete in LS');
    }
  }

  return (
    <div className="marginTop1em">
      <h4 className="borderBottom1pxSolidBlack">
        <Trans>Comments</Trans>
      </h4>
      {!isMounted || !authContext.user || authContext.user.isAnonymous ? (
        <div className="textAlignCenter">
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
          isPatron={authContext.isPatron}
          onSubmit={(newComment) => {
            setSubmittedComments([...submittedComments, newComment]);
          }}
          onDelete={deleteLocally}
        />
      )}
      <ul className={styles.commentsList}>
        {toShow.map((a, i) => (
          <li key={i}>
            <CommentWithReplies
              user={authContext.user}
              constructorPage={authContext.constructorPage}
              isPatron={authContext.isPatron}
              comment={a}
              onSubmit={(newComment) => {
                setSubmittedComments([...submittedComments, newComment]);
              }}
              onDelete={deleteLocally}
              {...props}
            />
          </li>
        ))}
      </ul>
    </div>
  );
};
