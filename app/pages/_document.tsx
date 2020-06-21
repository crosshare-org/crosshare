import Document, { Html, Head, Main, NextScript } from 'next/document';

import { GA_TRACKING_ID } from '../lib/gtag';

export default class CrosshareDocument extends Document {
  render(): JSX.Element {
    return (
      <Html>
        <Head>
          {/* Global Site Tag (gtag.js) - Google Analytics */}
          <script
            async
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_TRACKING_ID}`}
          />
          <script
            dangerouslySetInnerHTML={{
              __html: `
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '${GA_TRACKING_ID}', {
    page_path: window.location.pathname,
  });
`,
            }}
          />
        </Head>
        <body>
          <Main />
          {/* eslint-disable-next-line @next/next/no-sync-scripts */}
          <script src="https://browser.sentry-cdn.com/5.17.0/bundle.min.js"></script>
          {/* eslint-disable-next-line @next/next/no-sync-scripts */}
          <script src="https://www.gstatic.com/firebasejs/7.14.4/firebase-app.js"></script>
          {/* eslint-disable-next-line @next/next/no-sync-scripts */}
          <script src="https://www.gstatic.com/firebasejs/7.14.4/firebase-analytics.js"></script>
          {/* eslint-disable-next-line @next/next/no-sync-scripts */}
          <script src="https://www.gstatic.com/firebasejs/7.14.4/firebase-auth.js"></script>
          {/* eslint-disable-next-line @next/next/no-sync-scripts */}
          <script src="https://www.gstatic.com/firebasejs/7.14.4/firebase-firestore.js"></script>
          {/* eslint-disable-next-line @next/next/no-sync-scripts */}
          <script src="https://www.gstatic.com/firebasejs/7.14.4/firebase-performance.js"></script>
          <NextScript />
        </body>
      </Html>
    );
  }
}
