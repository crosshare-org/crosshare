import { FormEvent, useContext, useState, Dispatch } from 'react';
import { AuthContext } from './AuthContext';
import { getDisplayName, DisplayNameForm } from './DisplayNameForm';
import { GoogleLinkButton, GoogleSignInButton } from './GoogleButtons';
import type firebase from 'firebase/app';
import { Button, ButtonAsLink } from './Buttons';
import { useSnackbar } from './Snackbar';
import { Emoji } from './Emoji';
import { isMetaSolution } from '../lib/utils';
import { LengthLimitedInput, LengthView } from './Inputs';
import { MAX_META_SUBMISSION_LENGTH } from './ClueMode';
import { ContestSubmitAction } from '../reducers/reducer';

export const MetaSubmissionForm = (props: {
  user: firebase.User;
  hasPrize: boolean;
  dispatch: Dispatch<ContestSubmitAction>;
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
    props.dispatch({
      type: 'CONTESTSUBMIT',
      submission: submission,
      displayName: props.displayName,
      ...(props.hasPrize &&
        enteringForPrize &&
        props.user.email && { email: props.user.email }),
    });
    if (isMetaSolution(submission, props.solutions)) {
      addToast('🚀 Solved a meta puzzle!');
    }
  }

  return (
    <>
      <form onSubmit={submitMeta}>
        <p>
          {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
          <label>
            Your meta submission (you only get to submit once!):
            <br />
            <LengthLimitedInput
              placeholder="Submission (case insensitive)"
              type="text"
              value={submission}
              maxLength={MAX_META_SUBMISSION_LENGTH}
              updateValue={setSubmission}
            />
            <LengthView
              value={submission}
              maxLength={MAX_META_SUBMISSION_LENGTH}
              hideUntilWithin={30}
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
  dispatch: Dispatch<ContestSubmitAction>;
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
          <div css={{ textAlign: 'center' }}>
            {authContext.user ? (
              <GoogleLinkButton user={authContext.user} />
            ) : (
              <GoogleSignInButton />
            )}
          </div>
        </>
      ) : props.contestSubmission ? (
        isMetaSolution(props.contestSubmission, props.solutions) ? (
          <p>
            Your submission (<strong>{props.contestSubmission}</strong>) is
            correct!
          </p>
        ) : (
          <>
            <p>
              Your submission (<strong>{props.contestSubmission}</strong>) was
              incorrect <Emoji symbol="😭" />.
            </p>
            {props.solutions.length === 1 ? (
              <p>
                The solution is: <strong>{props.solutions[0]}</strong>
              </p>
            ) : (
              <p>
                The solutions are:{' '}
                {props.solutions.map((s, i) => [
                  i > 0 && ', ',
                  <strong key={i}>{s}</strong>,
                ])}
              </p>
            )}
          </>
        )
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
