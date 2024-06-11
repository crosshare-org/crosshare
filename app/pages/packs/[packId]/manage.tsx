import Head from 'next/head';
import { DefaultTopBar } from '../../../components/TopBar.js';
import { withTranslation } from '../../../lib/translation.js';

export const getServerSideProps = withTranslation(() => {
  return Promise.resolve({ props: {} });
});

export default function Page() {
  return (
    <>
      <Head>
        <title>{`Manage Pack Access | Crosshare Crossword Constructor and Puzzles`}</title>
      </Head>
      <DefaultTopBar />
      <div className="margin1em">
        <h2>Coming soon...</h2>
      </div>
    </>
  );
}
