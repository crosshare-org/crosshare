import Head from 'next/head';
import { DefaultTopBar } from '../../components/TopBar.js';
import { withStaticTranslation } from '../../lib/translation.js';

export const getStaticProps = withStaticTranslation(() => {
  return { props: {} };
});

export default function Page() {
  return (
    <>
      <Head>
        <title>{`Packs | Crosshare Crossword Constructor and Puzzles`}</title>
      </Head>
      <DefaultTopBar />
      <div className="margin1em">
        <h2>Coming soon...</h2>
      </div>
    </>
  );
}
