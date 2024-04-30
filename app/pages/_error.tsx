import * as Sentry from '@sentry/nextjs';
import { NextPageContext } from 'next';
import NextErrorComponent from 'next/error';
import { ErrorPage } from '../components/ErrorPage';

const LocalStorageErrorPage = () => (
  <ErrorPage title="Couldn't Store Data">
    <p>
      Crosshare needs permission to store data in your browser to keep track of
      your solve progress on puzzles. Please grant access in your browsers
      settings (e.g. in settings/cookies for Chrome).
    </p>
    <p>
      If you&apos;re having trouble figuring this out please send us an{' '}
      <a
        target="_blank"
        rel="noopener noreferrer"
        href="mailto:help@crosshare.org"
      >
        email
      </a>
    </p>
  </ErrorPage>
);

const isLocalStorageError = (err: Error): boolean => {
  return err.message.includes("Failed to read the 'localStorage' property");
};

const MyError = ({
  title,
  statusCode,
  err,
}: {
  title?: string;
  err: Error | undefined;
  statusCode: number;
}) => {
  if (err && isLocalStorageError(err)) {
    return <LocalStorageErrorPage />;
  }

  return (
    <ErrorPage title="Something Went Wrong">
      <p>
        Sorry! An error with Crosshare occurred - you can get in touch for help
        via{' '}
        <a
          target="_blank"
          rel="noopener noreferrer"
          href="mailto:help@crosshare.org"
        >
          email
        </a>
        .
      </p>
      <p>
        {statusCode} {title}
      </p>
    </ErrorPage>
  );
};

MyError.getInitialProps = async (contextData: NextPageContext) => {
  // In case this is running in a serverless function, await this in order to give Sentry
  // time to send the error before the lambda exits
  await Sentry.captureUnderscoreErrorException(contextData);

  // This will contain the status code of the response
  return NextErrorComponent.getInitialProps(contextData);
};

export default MyError;
