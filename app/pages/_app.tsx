import { useCallback, useState, useEffect } from 'react';
import * as Sentry from '@sentry/node';
import { AppProps } from 'next/app';
import { useAuthState } from 'react-firebase-hooks/auth';
import NextJSRouter from 'next/router';
import Head from 'next/head';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.min.css';

import * as gtag from '../lib/gtag';
import { App } from '../lib/firebaseWrapper';
import { AuthContext } from '../components/AuthContext';
import { CrosshareAudioContext } from '../components/CrosshareAudioContext';

import '../lib/style.css';

if (process.env.NODE_ENV === 'production') {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    release: process.env.NEXT_PUBLIC_SENTRY_RELEASE,
  });
}

// `err` is a workaround for https://github.com/vercel/next.js/issues/8592
export default function CrosshareApp({ Component, pageProps, err }: AppProps & { err: Error }): JSX.Element {
  let [user, loadingUser, error] = useAuthState(App.auth());
  const [isAdmin, setIsAdmin] = useState(false);

  if (typeof window === 'undefined') {
    [user, loadingUser, error] = [undefined, true, undefined];
  }

  useEffect(() => {
    if (user && user.email) {
      user.getIdTokenResult()
        .then((idTokenResult) => {
          if (idTokenResult.claims.admin) {
            setIsAdmin(true);
          } else {
            setIsAdmin(false);
          }
        })
        .catch((error) => {
          setIsAdmin(false);
          console.error(error);
        });
    }
  }, [user]);

  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const initAudioContext = useCallback(() => {
    if (!audioContext) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const constructor = window.AudioContext || (window as any).webkitAudioContext;
      setAudioContext(new constructor());
    }
  }, [audioContext, setAudioContext]);

  useEffect(() => {
    const handleRouteChange = (url: string) => {
      gtag.pageview(url);
    };
    NextJSRouter.events.on('routeChangeComplete', handleRouteChange);
    return () => {
      NextJSRouter.events.off('routeChangeComplete', handleRouteChange);
    };
  }, []);

  return (
    <>
      <Head>
        <title>Crosshare - Free Crossword Constructor and Daily Mini Crossword Puzzles</title>
        <meta key="og:title" property="og:title" content="Crosshare Crosswords" />
        <meta key="description" name="description" content="Crosshare is a community for crossword constructors and solvers. Each day we post a new mini crossword puzzle you can play for free." />
        <meta key="og:description" property="og:description" content="Crosshare is a community for crossword constructors and solvers. Each day we post a new mini crossword puzzle you can play for free." />
        <meta name="viewport" content="width=device-width, height=device-height" />
        <meta property="fb:pages" content="100687178303443" />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:site" content="@crosshareapp" />
        <meta key="og:image" property="og:image" content="https://crosshare.org/apple-splash-1334-750.png" />
        <meta property="og:image:type" content="image/png" />
        <meta key="og:image:width" property="og:image:width" content="1334" />
        <meta key="og:image:height" property="og:image:height" content="750" />
        <meta key="og:image:alt" property="og:image:alt" content="The crosshare logo" />
      </Head>
      <CrosshareAudioContext.Provider value={[audioContext, initAudioContext]}>
        <AuthContext.Provider value={{ user, isAdmin, loadingUser, error: error ?.message}}>
          <ToastContainer />
          <Component {...pageProps} err={err} />
        </AuthContext.Provider>
      </CrosshareAudioContext.Provider>
    </>
  );
}
