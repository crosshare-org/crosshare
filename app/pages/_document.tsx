import Document, { Html, Head, Main, NextScript } from 'next/document';

export default class CrosshareDocument extends Document {
  render(): JSX.Element {
    return (
      <Html>
        <Head />
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
