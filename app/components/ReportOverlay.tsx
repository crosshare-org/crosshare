import { Markdown } from './Markdown';
import { Overlay } from './Overlay';
import { LengthLimitedTextarea, LengthView } from './Inputs';
import { COMMENT_LENGTH_LIMIT } from './Comments';
import { FormEvent, useContext, useState } from 'react';
import { logAsyncErrors } from '../lib/utils';
import * as t from 'io-ts';
import { timestamp, Timestamp } from '../lib/timestamp';
import { Comment } from '../lib/types';
import { AuthContext } from './AuthContext';
import { setDoc } from 'firebase/firestore';
import { getDocRef } from '../lib/firebaseWrapper';
import { useSnackbar } from './Snackbar';
import { Button } from './Buttons';
import { GoogleLinkButton, GoogleSignInButton } from './GoogleButtons';

export const CommentReportV = t.type({
  /** comment id */
  cid: t.string,
  /** comment author display name */
  cn: t.string,
  /** comment text */
  ct: t.string,
  /** puzzle id */
  pid: t.string,
  /** reporter user id */
  u: t.string,
  /** reporter notes */
  n: t.string,
  /** report timestamp */
  t: timestamp,
  /** handled? */
  h: t.boolean,
});
type CommentReportT = t.TypeOf<typeof CommentReportV>;

export const ReportOverlay = (props: {
  closeOverlay: () => void;
  comment: Omit<Comment, 'replies'>;
  puzzleId: string;
}) => {
  const authContext = useContext(AuthContext);
  const { showSnackbar } = useSnackbar();

  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submitReport(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);

    const uid = authContext.user?.uid;
    if (authContext.user?.isAnonymous || !uid) {
      console.error('cannot submit report w/o user!');
      return;
    }
    const report: CommentReportT = {
      cid: props.comment.id,
      cn: props.comment.authorDisplayName,
      ct: props.comment.commentText,
      pid: props.puzzleId,
      u: uid,
      n: notes,
      t: Timestamp.now(),
      h: false,
    };

    await setDoc(getDocRef('cr', `${props.comment.id}-${uid}`), report).then(
      () => {
        setSubmitting(false);
        showSnackbar('Comment reported - thank you!');
        props.closeOverlay();
      }
    );
  }

  return (
    <Overlay closeCallback={props.closeOverlay}>
      <h2>Report Comment for Moderation</h2>
      <p>
        Crosshare&apos;s goal is to be a respectful and inclusive place for
        people to share, solve, and discuss puzzles. You can help to keep it
        that way by reporting any comments that you feel break Crosshare&apos;s
        only rule: &ldquo;please be nice&rdquo;.
      </p>
      {!authContext.user || authContext.user.isAnonymous ? (
        <>
          <p>Please sign in with google to report a comment.</p>
          {authContext.user ? (
            <GoogleLinkButton user={authContext.user} />
          ) : (
            <GoogleSignInButton />
          )}
        </>
      ) : (
        <>
          <h3>Comment you&apos;re reporting</h3>
          <div
            css={{
              borderRadius: '0.5em',
              backgroundColor: 'var(--secondary)',
              padding: '1em',
              margin: '1em 0 2em',
            }}
          >
            <Markdown hast={props.comment.commentHast} />
            <div>
              <i>- {props.comment.authorDisplayName}</i>
            </div>
          </div>
          <h3>Notes</h3>
          <form onSubmit={logAsyncErrors(submitReport)}>
            <div css={{ marginBottom: '1em' }}>
              <label css={{ width: '100%', margin: 0 }}>
                <p>
                  (Optional) Add any notes that you think might be helpful to
                  our moderation team:
                </p>
                <LengthLimitedTextarea
                  css={{ width: '100%', display: 'block' }}
                  maxLength={COMMENT_LENGTH_LIMIT}
                  value={notes}
                  updateValue={setNotes}
                />
              </label>
              <div css={{ textAlign: 'right' }}>
                <LengthView
                  maxLength={COMMENT_LENGTH_LIMIT}
                  value={notes}
                  hideUntilWithin={200}
                />
              </div>
            </div>
            <Button
              type="submit"
              css={{ marginRight: '0.5em' }}
              disabled={submitting}
              text={'Report comment'}
            />
            <Button
              boring={true}
              disabled={submitting}
              css={{ marginRight: '0.5em' }}
              onClick={props.closeOverlay}
              text={'Cancel'}
            />
          </form>

          <p css={{ marginTop: '2em' }}>
            <i>
              False reports waste our moderators&apos;s time and will eventually
              lead to your account being banned.
            </i>
          </p>
        </>
      )}
    </Overlay>
  );
};
