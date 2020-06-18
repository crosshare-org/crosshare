import NextErrorComponent, { ErrorProps } from 'next/error';
import { NextPageContext } from 'next';
import * as Sentry from '@sentry/node';
import Head from 'next/head';

import { Logo } from '../components/Icons';

const MyError = ({ title, statusCode, hasGetInitialPropsRun, err }: { title?: string, err: Error, statusCode: number, hasGetInitialPropsRun: boolean }) => {
  if (!hasGetInitialPropsRun && err) {
    // getInitialProps is not called in case of
    // https://github.com/vercel/next.js/issues/8592. As a workaround, we pass
    // err via _app.js so it can be captured
    Sentry.captureException(err);
  }

  return <>
    <Head>
      <title>Error | Crosshare</title>
    </Head>
    <div css={{
      backgroundColor: 'var(--primary)',
      width: '100%',
      height: '100%',
      textAlign: 'center',
      paddingTop: '5em',
    }}>
      <Logo width='15em' height='15em' />
      <h1 css={{ marginTop: '1em' }}>Something went wrong.</h1>
      <p>Sorry! An error with Crosshare occurred - you can email us for help at crosshare@googlegroups.com.</p>
      <p>{statusCode} {title}</p>
    </div>
  </>;
};

MyError.getInitialProps = async ({ res, err, asPath }: NextPageContext) => {
  const errorInitialProps: ErrorProps = await NextErrorComponent.getInitialProps({ res, err } as NextPageContext);

  // Running on the server, the response object (`res`) is available.
  //
  // Next.js will pass an err on the server if a page's data fetching methods
  // threw or returned a Promise that rejected
  //
  // Running on the client (browser), Next.js will provide an err if:
  //
  //  - a page's `getInitialProps` threw or returned a Promise that rejected
  //  - an exception was thrown somewhere in the React lifecycle (render,
  //    componentDidMount, etc) that was caught by Next.js's React Error
  //    Boundary. Read more about what types of exceptions are caught by Error
  //    Boundaries: https://reactjs.org/docs/error-boundaries.html

  if (res ?.statusCode === 404) {
    // Opinionated: do not record an exception in Sentry for 404
    return { statusCode: 404 };
  }
  if (err) {
    Sentry.captureException(err);
    return { ...errorInitialProps, hasGetInitialPropsRun: true };
  }

  // If this point is reached, getInitialProps was called without any
  // information about what the error might be. This is unexpected and may
  // indicate a bug introduced in Next.js, so record it in Sentry
  Sentry.captureException(
    new Error(`_error.js getInitialProps missing data at path: ${asPath}`)
  );

  return { ...errorInitialProps, hasGetInitialPropsRun: true };
};

export default MyError;
