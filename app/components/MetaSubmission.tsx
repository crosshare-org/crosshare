import { FormEvent, useContext, useState } from 'react';
import { AuthContext } from './AuthContext';
import { getDisplayName, DisplayNameForm } from './DisplayNameForm';
import { GoogleLinkButton, GoogleSignInButton } from './GoogleButtons';
import type firebase from 'firebase/app';
import { Button, ButtonAsLink } from './Buttons';
import { useSnackbar } from './Snackbar';
import { writeMetaSubmission } from '../lib/plays';

function normalize(n: string) {
  return n.toLowerCase().replace(/ /g, '');
}

function isSolution(submission: string, solutions: Array<string>) {
  const normalized = normalize(submission);
  for (const solution of solutions) {
    if (normalize(solution) === normalized) {
      return true;
    }
  }
  return false;
}

export const MetaSubmissionForm = (props: {
  user: firebase.User;
  hasPrize: boolean;
  puzzleId: string;
  solutions: Array<string>;
  displayName: string;
}) => {
  const [submission, setSubmission] = useState('');
  const [displayName, setDisplayName] = useState(props.displayName);
  const [editingDisplayName, setEditingDisplayName] = useState(false);
  const [enteringForPrize, setEnteringForPrize] = useState(false);
  const { addToast } = useSnackbar();

  function submitMeta(event: FormEvent) {
    event.preventDefault();
    writeMetaSubmission(
      props.user,
      props.puzzleId,
      submission,
      displayName,
      props.hasPrize && enteringForPrize && props.user.email
        ? props.user.email
        : undefined
    ).then(() => {
      if (isSolution(submission, props.solutions)) {
        addToast('🚀 Solved a meta puzzle!');
      }
    });
  }

  return (
    <>
      <form onSubmit={submitMeta}>
        <p>
          <label>
            Your meta submission (you only get to submit once!):
            <br />
            <input
              placeholder="Submission (case insensitive)"
              type="text"
              value={submission}
              onChange={(e) => setSubmission(e.target.value)}
            />
          </label>
        </p>
        {props.hasPrize && props.user.email ? (
          <p>
            This puzzle has a prize. If you choose to enter, your email will be
            made available to the constructor so they can select a winner.
            <br />
            <label>
              <input
                css={{ marginRight: '1em' }}
                type="checkbox"
                checked={enteringForPrize}
                onChange={(e) => {
                  setEnteringForPrize(e.target.checked);
                }}
              />{' '}
              Enter my email address ({props.user.email}) for the prize
            </label>
          </p>
        ) : (
          ''
        )}
        {editingDisplayName ? (
          ''
        ) : (
          <>
            <p>
              <Button
                type="submit"
                css={{ marginRight: '0.5em' }}
                disabled={submission.length === 0}
                text="Submit"
              />
              submitting as {displayName} (
              <ButtonAsLink
                onClick={() => setEditingDisplayName(true)}
                text="change name"
              />
              )
            </p>
          </>
        )}
      </form>
      {editingDisplayName ? (
        <>
          <DisplayNameForm
            user={props.user}
            onChange={(s) => {
              setDisplayName(s);
              setEditingDisplayName(false);
            }}
            onCancel={() => setEditingDisplayName(false)}
          />
        </>
      ) : (
        ''
      )}
    </>
  );
};

export const MetaSubmission = (props: {
  contestSubmission?: string;
  hasPrize: boolean;
  puzzleId: string;
  solutions: Array<string>;
}) => {
  const authContext = useContext(AuthContext);
  const displayName = getDisplayName(
    authContext.user,
    authContext.constructorPage
  );

  return (
    <div css={{ marginTop: '1em' }}>
      <h4 css={{ borderBottom: '1px solid var(--black)' }}>Contest</h4>

      {!authContext.user || authContext.user.isAnonymous ? (
        <>
          <p>
            This is a meta puzzle! Sign in with google to submit your solution,
            view the solution, view the leaderboard, and read or submit
            comments:
          </p>
          {authContext.user ? (
            <GoogleLinkButton user={authContext.user} />
          ) : (
            <GoogleSignInButton />
          )}
        </>
      ) : (
        <>
          <p>
            This is a meta puzzle! Submit your solution to see if you got it,
            view the leaderboard, and read or submit comments:
          </p>
          <MetaSubmissionForm
            user={authContext.user}
            displayName={displayName}
            {...props}
          />
        </>
      )}
    </div>
  );
};
