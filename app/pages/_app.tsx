import { useCallback, useState, useEffect, useRef } from 'react';
import { AppProps, NextWebVitalsMetric } from 'next/app';
import NextJSRouter, { useRouter } from 'next/router';
import Head from 'next/head';

import * as gtag from '../lib/gtag';
import { useAuth } from '../lib/hooks';
import { AuthContext } from '../components/AuthContext';
import { CrosshareAudioContext } from '../components/CrosshareAudioContext';
import { Snackbar, SnackbarProvider } from '../components/Snackbar';
import { Global } from '@emotion/react';

import '../lib/style.css';
import { colorTheme, LINK, PRIMARY } from '../lib/style';
import { BrowserWarning } from '../components/BrowserWarning';
import { i18n } from '@lingui/core';
import { initTranslation } from '../lib/translation';
import { I18nProvider } from '@lingui/react';

initTranslation(i18n);

export function reportWebVitals(metric: NextWebVitalsMetric) {
  console.log(metric);
  if (
    process.env.NODE_ENV !== 'production' &&
    metric.name === 'CLS' &&
    metric.value
  ) {
    console.error('NONZERO CLS ', metric.value);
  }
  gtag.event({
    action: metric.name,
    category:
      metric.label === 'web-vital' ? 'Web Vitals' : 'Next.js custom metric',
    label: metric.id,
    value: Math.round(
      metric.name === 'CLS' ? metric.value * 1000 : metric.value
    ),
    nonInteraction: true,
  });
}

// `err` is a workaround for https://github.com/vercel/next.js/issues/8592
export default function CrosshareApp({
  Component,
  pageProps,
  err,
}: AppProps & { err: Error }): JSX.Element {
  let authStatus = useAuth();
  const [loading, setLoading] = useState(false);

  if (typeof window === 'undefined') {
    authStatus = {
      loading: true,
      isAdmin: false,
      isPatron: false,
      notifications: [],
    };
  }

  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const initAudioContext = useCallback(() => {
    if (!audioContext) {
      const constructor =
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/strict-boolean-expressions
        window.AudioContext || (window as any).webkitAudioContext;
      setAudioContext(new constructor());
    }
  }, [audioContext, setAudioContext]);

  useEffect(() => {
    if (!("container" in document.documentElement.style)) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      import('container-query-polyfill');
    }

    if ("virtualKeyboard" in navigator) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      navigator.virtualKeyboard.overlaysContent = true;
    }

    const handleStart = () => {
      setLoading(true);
    };
    const handleError = () => {
      setLoading(false);
    };
    const handleRouteChange = (url: string) => {
      setLoading(false);
      gtag.pageview(url);
    };
    NextJSRouter.events.on('routeChangeStart', handleStart);
    NextJSRouter.events.on('routeChangeComplete', handleRouteChange);
    NextJSRouter.events.on('routeChangeError', handleError);

    return () => {
      NextJSRouter.events.off('routeChangeStart', handleStart);
      NextJSRouter.events.off('routeChangeComplete', handleRouteChange);
      NextJSRouter.events.off('routeChangeError', handleError);
    };
  }, []);

  const { locale } = useRouter();

  const firstRender = useRef(true);
  if (firstRender.current) {
    firstRender.current = false;
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (pageProps.translation) {
      i18n.load(locale || 'en', pageProps.translation);
      i18n.activate(locale || 'en');
    } else {
      i18n.activate('en');
    }
  }

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (pageProps.translation && locale) {
      i18n.load(locale, pageProps.translation);
      i18n.activate(locale);
    }
  }, [locale, pageProps.translation]);

  useEffect(() => {
    const resize = () => {
      document.documentElement.style.setProperty(
        '--vh',
        `${window.innerHeight}px`
      );
    };
    resize();
    window.addEventListener('resize', resize);
    return () => {
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <>
      <Head>
        <title>{`Crosshare - Free Crossword Constructor and Daily Mini Crossword Puzzles`}
        </title>
        <meta
          key="og:title"
          property="og:title"
          content="Crosshare Crosswords"
        />
        <meta
          key="description"
          name="description"
          content="Crosshare is a community for crossword constructors and solvers. Each day we post a new mini crossword puzzle you can play for free."
        />
        <meta
          key="og:description"
          property="og:description"
          content="Crosshare is a community for crossword constructors and solvers. Each day we post a new mini crossword puzzle you can play for free."
        />
        <meta
          name="viewport"
          content="minimum-scale=1, initial-scale=1, width=device-width, height=device-height"
        />
        <meta property="fb:pages" content="100687178303443" />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:site" content="@crosshareapp" />
        <meta
          key="og:image"
          property="og:image"
          content="https://crosshare.org/apple-splash-1334-750.png"
        />
        <meta property="og:image:type" content="image/png" />
        <meta key="og:image:width" property="og:image:width" content="1334" />
        <meta key="og:image:height" property="og:image:height" content="750" />
        <meta
          key="og:image:alt"
          property="og:image:alt"
          content="The crosshare logo"
        />
      </Head>
      <Global
        styles={{
          html: [
            colorTheme(PRIMARY, LINK, false, false),
            {
              '@media (prefers-color-scheme: dark)': colorTheme(
                PRIMARY,
                LINK,
                true,
                false
              ),
            },
          ],
          'body.dark-mode': colorTheme(PRIMARY, LINK, true, false),
          'body.light-mode': colorTheme(PRIMARY, LINK, false, false),
        }}
      />
      <CrosshareAudioContext.Provider value={[audioContext, initAudioContext]}>
        <AuthContext.Provider value={authStatus}>
          <SnackbarProvider>
            <BrowserWarning />
            <I18nProvider i18n={i18n}>
              <Component {...pageProps} err={err} />
            </I18nProvider>
          </SnackbarProvider>
        </AuthContext.Provider>
      </CrosshareAudioContext.Provider>
      <Snackbar message="Loading..." isOpen={loading} />
    </>
  );
}
