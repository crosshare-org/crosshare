import Head from 'next/head';
import { Emoji } from '../components/Emoji.js';
import { DefaultTopBar } from '../components/TopBar.js';
import { withStaticTranslation } from '../lib/translation.js';

export const getStaticProps = withStaticTranslation(() => {
  return { props: {} };
});

export default function ThankYouPage() {
  return (
    <>
      <Head>
        <title>{`Thank you | Crosshare Crossword Constructor and Puzzles`}</title>
      </Head>
      <DefaultTopBar />
      <div className="margin1em">
        <h2>
          Thank you! <Emoji symbol="🥰" />
        </h2>
        <p>Your donation will help keep Crosshare going!</p>
      </div>
    </>
  );
}
