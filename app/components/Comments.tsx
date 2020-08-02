import { useState, useEffect, ReactNode, FormEvent } from 'react';
import * as t from 'io-ts';
import { isRight } from 'fp-ts/lib/Either';
import { PathReporter } from 'io-ts/lib/PathReporter';

import { PartialBy, Comment } from '../lib/types';
import { Identicon } from './Icons';
import { timeString } from '../lib/utils';
import { Emoji } from './Emoji';
import { buttonAsLink } from '../lib/style';
import { DisplayNameForm, getDisplayName } from './DisplayNameForm';
import { App, TimestampClass } from '../lib/firebaseWrapper';
import { CommentForModerationT, CommentForModerationWithIdV, CommentForModerationWithIdT } from '../lib/dbtypes';


const COMMENT_LENGTH_LIMIT = 140;

type LocalComment = Omit<Comment, 'id' | 'replies'>;
type CommentWithPossibleLocalReplies = Omit<Comment, 'replies'> & {
  replies?: Array<CommentOrLocalComment>
}
type CommentOrLocalComment = CommentWithPossibleLocalReplies | LocalComment

const SpoilerText = ({ text }: CommentTextProps) => {
  return <span css={{
    backgroundColor: 'var(--text)',
    '&:hover': {
      backgroundColor: 'var(--bg)',
    }
  }}>{text}</span>;
};

interface CommentTextProps {
  text: string
}
export const CommentText = ({ text }: CommentTextProps) => {
  const pieces: Array<ReactNode> = [];
  const tagFinder = /(?<item>(?<tag_begin>>!)(?<content>.+?)(?<tag_end>!<))/gm;
  let lastMatchedPosition = 0;
  let i = 0;
  function breaker(match: string, _item: string, _tag_begin: string, content: string, _tag_end: string, offset: number, string: string) {
    if (lastMatchedPosition < offset) {
      pieces.push(<span key={i++}>{string.substring(lastMatchedPosition, offset)}</span>);
    }
    pieces.push(<SpoilerText key={i++} text={content} />);
    lastMatchedPosition = offset + match.length;
    return match;
  }
  text.replace(tagFinder, breaker);
  pieces.push(<span key={i++}>{text.substring(lastMatchedPosition)}</span>);
  return <div>{pieces}</div>;
};

interface CommentProps {
  puzzleAuthorId: string,
  comment: CommentOrLocalComment,
  children?: ReactNode
}
const CommentView = (props: CommentProps) => {
  return (
    <div css={{
      marginTop: '1em',
    }}>
      <div><CommentFlair displayName={props.comment.authorDisplayName} userId={props.comment.authorId} puzzleAuthorId={props.puzzleAuthorId} solveTime={props.comment.authorSolveTime} didCheat={props.comment.authorCheated} /></div>
      <CommentText text={props.comment.commentText} />
      {props.children}
    </div>
  );
};

const CommentWithReplies = (props: PartialBy<CommentFormProps, 'user'> & { comment: CommentOrLocalComment }) => {
  const [showingForm, setShowingForm] = useState(false);
  const commentId = isComment(props.comment) ? props.comment.id : null;
  const replies = isComment(props.comment) ? props.comment.replies : undefined;
  return (
    <CommentView puzzleAuthorId={props.puzzleAuthorId} comment={props.comment}>
      {(!props.user || props.user.isAnonymous || !commentId) ?
        ''
        :
        (showingForm ?
          <div css={{ marginLeft: '2em' }}>
            <CommentForm {...props} onCancel={() => setShowingForm(false)} replyToId={commentId} user={props.user} />
          </div>
          :
          <div><button css={buttonAsLink} onClick={() => setShowingForm(true)}>Reply</button></div>
        )
      }
      {replies ?
        <ul css={{
          listStyleType: 'none',
          margin: '0 0 0 2em',
          padding: 0,
        }}>
          {replies.map((a, i) => <li key={i}><CommentWithReplies {... { ...props, comment: a }} /></li>)}
        </ul>
        :
        ''
      }
    </CommentView>
  );
};

function commentsKey(puzzleId: string) {
  return 'comments/' + puzzleId;
}

function commentsFromStorage(puzzleId: string): Array<CommentForModerationWithIdT> {
  const inSession = localStorage.getItem(commentsKey(puzzleId));
  if (inSession) {
    const res = t.array(CommentForModerationWithIdV).decode(JSON.parse(inSession));
    if (isRight(res)) {
      return res.right;
    } else {
      console.error('Couldn\'t parse object in local storage');
      console.error(PathReporter.report(res).join(','));
    }
  }
  return [];
}

interface CommentFlairProps {
  solveTime: number,
  didCheat: boolean,
  displayName: string,
  userId: string,
  puzzleAuthorId: string,
}
const CommentFlair = (props: CommentFlairProps) => {
  return (
    <>
      <span css={{ verticalAlign: 'text-bottom' }}><Identicon id={props.userId} /></span>
      <i> {props.displayName} </i>
      {(props.userId === props.puzzleAuthorId) ?
        <span css={{
          fontSize: '0.75em',
          backgroundColor: 'var(--primary)',
          color: 'white',
          borderRadius: 5,
          padding: '0.1em 0.2em',
        }}>constructor</span>
        :
        <>
          {props.didCheat ? <Emoji title='Used helpers' symbol='😏' /> : <Emoji title='Solved without helpers' symbol='🤓' />}
          < span css={{
            fontSize: '0.75em',
            backgroundColor: 'var(--caption)',
            color: 'white',
            borderRadius: 5,
            padding: '0.1em 0.2em',
          }}>{timeString(props.solveTime, false)}</span>
        </>
      }
    </ >
  );
};

interface CommentFormProps {
  displayName: string,
  setDisplayName: (name: string) => void,
  puzzleAuthorId: string,
  user: firebase.User,
  solveTime: number,
  didCheat: boolean,
  puzzleId: string,
  replyToId?: string,
}

const CommentForm = ({ onCancel, ...props }: CommentFormProps & { onCancel?: () => void }) => {
  const [commentText, setCommentText] = useState('');
  const [editingDisplayName, setEditingDisplayName] = useState(false);
  const [submittedComment, setSubmittedComment] = useState<LocalComment | null>(null);

  if (props.user === null) {
    throw new Error('displaying comment form w/ no user');
  }

  function sanitize(input: string) {
    return input.substring(0, COMMENT_LENGTH_LIMIT);
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
      n: props.displayName,
      t: props.solveTime,
      ch: props.didCheat,
      p: TimestampClass.now(),
      pid: props.puzzleId,
      rt: props.replyToId !== undefined ? props.replyToId : null
    };
    console.log('Submitting comment', comment);
    const db = App.firestore();
    // Add to moderation queue for long term
    db.collection('cfm').add(comment).then((ref) => {
      console.log('Uploaded', ref.id);

      // Replace this form w/ the comment for the short term
      setSubmittedComment({
        commentText: comment.c,
        authorId: comment.a,
        authorDisplayName: comment.n,
        authorSolveTime: comment.t,
        authorCheated: comment.ch,
        publishTime: comment.p.toMillis(),
      });
      // Add the comment to localStorage for the medium term
      const forSession = commentsFromStorage(props.puzzleId);
      forSession.push({ i: ref.id, ...comment });
      localStorage.setItem(commentsKey(props.puzzleId), JSON.stringify(forSession));
    });
  }

  if (submittedComment) {
    return <CommentView puzzleAuthorId={props.puzzleAuthorId} comment={submittedComment} />;
  }

  return (
    <>
      <form onSubmit={submitComment}>
        <label css={{ width: '100%', margin: 0 }}>{(props.replyToId !== undefined ? 'Enter your reply ' : 'Leave a comment ') + '(please be nice!):'}
          <textarea css={{ width: '100%', display: 'block' }} value={commentText} onChange={e => setCommentText(sanitize(e.target.value))} />
        </label>
        <div css={{
          textAlign: 'right',
          color: (COMMENT_LENGTH_LIMIT - commentText.length) > 10 ? 'var(--default-text)' : 'var(--error)',
        }}>{commentText.length}/{COMMENT_LENGTH_LIMIT}</div>
        {
          editingDisplayName ?
            ''
            :
            <>
              <input css={{ marginRight: '0.5em', }} type="submit" disabled={commentText.length === 0} value="Save" />
              {onCancel ?
                <button type="button" css={{ marginRight: '0.5em' }} onClick={onCancel}>Cancel</button>
                : ''}
              commenting as <CommentFlair displayName={props.displayName} userId={props.user.uid} puzzleAuthorId={props.puzzleAuthorId} solveTime={props.solveTime} didCheat={props.didCheat} /> (
              <button css={buttonAsLink} onClick={() => setEditingDisplayName(true)}>change name</button>)
            </>
        }
      </form>
      {editingDisplayName ?
        <>
          <DisplayNameForm
            user={props.user}
            onChange={(s) => { props.setDisplayName(s); setEditingDisplayName(false); }}
            onCancel={() => setEditingDisplayName(false)}
          />
        </>
        :
        ''
      }
    </>
  );
};

interface CommentsProps {
  user?: firebase.User,
  solveTime: number,
  didCheat: boolean,
  puzzleId: string,
  puzzleAuthorId: string,
  comments: Array<Comment>
}

function isComment(comment: CommentOrLocalComment): comment is CommentWithPossibleLocalReplies {
  return 'id' in comment;
}

function findCommentById(comments: Array<CommentOrLocalComment>, id: string): CommentWithPossibleLocalReplies | null {
  for (const comment of comments) {
    if (!isComment(comment)) {
      continue;
    }
    if (comment.id === id) {
      return comment;
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

export const Comments = ({ comments, ...props }: CommentsProps): JSX.Element => {
  const [toShow, setToShow] = useState<Array<CommentOrLocalComment>>(comments);
  const [displayName, setDisplayName] = useState(getDisplayName(props.user));

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
        continue;
      }
      toKeepInStorage.push(c);
      const localComment: LocalComment = {
        commentText: c.c,
        authorId: c.a,
        authorDisplayName: c.n,
        authorSolveTime: c.t,
        authorCheated: c.ch,
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
    // This means one or more have made it through moderation - update LS
    if (toKeepInStorage.length !== unmoderatedComments.length) {
      if (toKeepInStorage.length === 0) {
        localStorage.removeItem(commentsKey(props.puzzleId));
      } else {
        localStorage.setItem(commentsKey(props.puzzleId), JSON.stringify(toKeepInStorage));
      }
    }
    setToShow(rebuiltComments);
  }, [props.puzzleId, comments]);
  return (
    <div css={{ marginTop: '1em' }}>
      <h4 css={{ borderBottom: '1px solid var(--black)' }}>Comments</h4>
      {!props.user || props.user.isAnonymous ?
        <div>Sign in with google (above) to leave a comment of your own</div>
        :
        <CommentForm {...props} displayName={displayName} setDisplayName={setDisplayName} user={props.user} />
      }
      <ul css={{
        listStyleType: 'none',
        margin: '2em 0 0 0',
        padding: 0,
      }}>
        {toShow.map((a, i) => <li key={i}><CommentWithReplies displayName={displayName} setDisplayName={setDisplayName} comment={a} {...props} /></li>)}
      </ul>
    </div>
  );
};
