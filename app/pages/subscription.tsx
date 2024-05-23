import Head from 'next/head';
import Link from 'next/link';
import { GetServerSideProps } from 'next/types';
import { FormEvent, useState } from 'react';
import { ErrorPage } from '../components/ErrorPage';
import { useSnackbar } from '../components/Snackbar';
import { getCollection, getUser } from '../lib/firebaseAdminWrapper';
import { PathReporter } from '../lib/pathReporter';
import { AccountPrefsV, UnsubscribeFlags } from '../lib/prefs';
import { SubscriptionParamsV, getSig } from '../lib/subscriptions';
import { logAsyncErrors } from '../lib/utils';

interface SuccessProps {
  userId: string;
  sig: string;
  email: string;
  unsubs: (keyof typeof UnsubscribeFlags)[];
  message?: boolean;
}

interface ErrorProps {
  error: string;
}

type PageProps = SuccessProps | ErrorProps;

// TODO unify w/ functions/queueEmails.ts
async function getEmail(userId: string): Promise<string | undefined> {
  try {
    const user = await getUser(userId);
    return user.email;
  } catch (e) {
    console.log(e);
    console.warn('error getting user ', userId);
    return undefined;
  }
}

export const getServerSideProps: GetServerSideProps<PageProps> = async ({
  res,
  query,
}) => {
  const validationResult = SubscriptionParamsV.decode(query);
  if (validationResult._tag !== 'Right') {
    console.error(PathReporter.report(validationResult).join(','));
    res.statusCode = 400;
    return { props: { error: 'Bad params' } };
  }

  const params = validationResult.right;
  const sig = await getSig(params.u);
  if (sig !== params.s) {
    res.statusCode = 400;
    return { props: { error: 'Bad sig' } };
  }

  const email = await getEmail(params.u);
  if (!email) {
    res.statusCode = 500;
    return { props: { error: 'Missing email' } };
  }

  const accountPrefsDoc = await getCollection('prefs').doc(params.u).get();
  if (!accountPrefsDoc.exists) {
    return { props: { userId: params.u, sig: params.s, email, unsubs: [] } };
  }

  const prefsValidationResult = AccountPrefsV.decode(accountPrefsDoc.data());
  if (prefsValidationResult._tag !== 'Right') {
    console.error(PathReporter.report(prefsValidationResult).join(','));
    res.statusCode = 500;
    return { props: { error: 'Invalid prefs' } };
  }

  return {
    props: {
      userId: params.u,
      sig: params.s,
      email,
      unsubs: prefsValidationResult.right.unsubs ?? [],
      message: Boolean(query.m),
    },
  };
};

export default function ManageSubscriptions(props: PageProps) {
  if ('error' in props) {
    return (
      <ErrorPage title="Error loading subscriptions">
        <p>We&apos;re sorry, there was an error: {props.error}</p>
        <p>
          Try the <Link href="/">homepage</Link>.
        </p>
      </ErrorPage>
    );
  }
  return <Success {...props} />;
}

function Success(props: SuccessProps) {
  const [unsubs, setUnsubs] = useState(props.unsubs);
  const [showMessage, setShowMessage] = useState(props.message);
  const [submitting, setSubmitting] = useState(false);
  const { showSnackbar } = useSnackbar();

  async function submitForm(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await postUpdate(unsubs).then(() => {
      showSnackbar('Updated preferences');
    });
  }

  async function postUpdate(newUnsubs: (keyof typeof UnsubscribeFlags)[]) {
    setShowMessage(false);
    setSubmitting(true);
    const fs = newUnsubs.length
      ? '&' + newUnsubs.map((n) => `f=${n}`).join('&')
      : '';
    return fetch(`/api/subscription?u=${props.userId}&s=${props.sig}${fs}`, {
      method: 'POST',
      redirect: 'manual',
    }).then(() => {
      setSubmitting(false);
    });
  }

  async function unsubAll() {
    setUnsubs(['all', 'weekly']);
    await postUpdate(['all', 'weekly']).then(() => {
      showSnackbar('Unsubscribed from all');
    });
  }

  const toggle = (unsub: keyof typeof UnsubscribeFlags) => {
    const newUnsubs = [...unsubs];
    const index = newUnsubs.indexOf(unsub);
    if (index === -1) {
      newUnsubs.push(unsub);
    } else {
      newUnsubs.splice(index, 1);
    }
    setUnsubs(newUnsubs);
  };

  return (
    <div className="margin1em">
      <Head>
        <title>{`Manage Subscriptions | Crosshare Crossword Constructor and Puzzles`}</title>
      </Head>
      {showMessage ? (
        <p className="colorBlue">Your preferences have been updated!</p>
      ) : (
        ''
      )}
      <form onSubmit={logAsyncErrors(submitForm)}>
        <h3>Newsletter</h3>
        <p>Email me (to {props.email}, at most once per week):</p>
        <label>
          <input
            checked={!unsubs.includes('weekly')}
            type="checkbox"
            onChange={() => {
              toggle('weekly');
            }}
          />{' '}
          A write up of the most popular puzzles in the previous week along with
          any Crosshare announcements
        </label>

        <h3 className="marginTop2em">Notifications</h3>
        <p>Email me (to {props.email}, at most once per day):</p>
        <p>
          <label>
            <input
              disabled={unsubs.includes('all')}
              checked={!unsubs.includes('comments')}
              type="checkbox"
              onChange={() => {
                toggle('comments');
              }}
            />{' '}
            I have unseen comments on my puzzles or replies to my comments
          </label>
        </p>
        <p>
          <label>
            <input
              disabled={unsubs.includes('all')}
              checked={!unsubs.includes('newpuzzles')}
              type="checkbox"
              onChange={() => {
                toggle('newpuzzles');
              }}
            />{' '}
            A constructor I follow publishes a new puzzle
          </label>
        </p>
        <p>
          <label>
            <input
              disabled={unsubs.includes('all')}
              checked={!unsubs.includes('featured')}
              type="checkbox"
              onChange={() => {
                toggle('featured');
              }}
            />{' '}
            One of my puzzles is chosen as a Crosshare featured puzzle or daily
            mini
          </label>
        </p>
        <p>
          <label>
            <input
              checked={unsubs.includes('all')}
              type="checkbox"
              onChange={() => {
                toggle('all');
              }}
            />{' '}
            Never notify me by email (even for any future notification types)
          </label>
        </p>

        <p>
          <input
            disabled={submitting}
            type="submit"
            value="Update Preferences"
          />
          <input
            disabled={submitting}
            onClick={logAsyncErrors(unsubAll)}
            className="marginLeft1em"
            type="button"
            value="Unsubscribe From All Crosshare Emails"
          />
        </p>
      </form>
    </div>
  );
}
