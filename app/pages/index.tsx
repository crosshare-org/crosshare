import Head from 'next/head';
import { GetServerSideProps } from 'next';
import { isRight } from 'fp-ts/lib/Either';
import { PathReporter } from 'io-ts/lib/PathReporter';

import { getDailyMinis } from '../lib/dailyMinis';
import { Link } from '../components/Link';
import { puzzleFromDB, ServerPuzzleResult } from '../lib/types';
import { DBPuzzleV, getDateString } from '../lib/dbtypes';
import { App } from '../lib/firebaseWrapper';
import { DefaultTopBar } from '../components/TopBar';
import { PuzzleResultLink } from '../components/PuzzleLink';
import { getPuzzlesForFeatured, userIdToPage } from '../lib/serverOnly';
import { PAGE_SIZE } from './featured/[pageNumber]';
import { useContext } from 'react';
import { AuthContext } from '../components/AuthContext';
import { Button } from '../components/Buttons';
import { ContactLinks } from '../components/ContactLinks';
import { CreateShareSection } from '../components/CreateShareSection';
import { SMALL_AND_UP } from '../lib/style';
import { UnfinishedPuzzleList } from '../components/UnfinishedPuzzleList';

interface HomePageProps {
  dailymini: ServerPuzzleResult;
  featured: Array<ServerPuzzleResult>;
}

export const getServerSideProps: GetServerSideProps<HomePageProps> = async ({
  res,
}) => {
  const db = App.firestore();
  const minis = await getDailyMinis();
  const today = getDateString(new Date());
  const todaysMini = Object.entries(minis)
    .filter(([date]) => date <= today)
    .sort(([a], [b]) => b.localeCompare(a))?.[0]?.[1];
  if (!todaysMini) {
    throw new Error('no minis scheduled!');
  }

  const [puzzlesWithoutConstructor] = await getPuzzlesForFeatured(0, PAGE_SIZE);
  const featured = await Promise.all(
    puzzlesWithoutConstructor.map(async (p) => ({
      ...p,
      constructorPage: await userIdToPage(p.authorId),
    }))
  );

  return db
    .collection('c')
    .doc(todaysMini)
    .get()
    .then(async (dmResult) => {
      const data = dmResult.data();
      const validationResult = DBPuzzleV.decode(data);
      if (isRight(validationResult)) {
        res.setHeader('Cache-Control', 'public, max-age=1800, s-maxage=3600');
        const dm = {
          ...puzzleFromDB(validationResult.right),
          id: dmResult.id,
          constructorPage: await userIdToPage(validationResult.right.a),
        };
        return { props: { dailymini: dm, featured } };
      } else {
        console.error(PathReporter.report(validationResult).join(','));
        throw new Error('Malformed daily mini');
      }
    });
};

export default function HomePage({ dailymini, featured }: HomePageProps) {
  const today = new Date();
  const { user, loading } = useContext(AuthContext);

  return (
    <>
      <Head>
        <title>
          Crosshare - Free Crossword Constructor and Daily Mini Crossword
          Puzzles
        </title>
      </Head>

      <DefaultTopBar />

      <div css={{ margin: '1em' }}>
        <p css={{ marginBottom: '1em' }}>
          Crosshare is a <b>free</b>, <b>ad-free</b>, and{' '}
          <a href="https://github.com/mdirolf/crosshare/">open-source</a> place
          to create, share and solve crossword puzzles.
        </p>
        <p>
          If you&apos;re enjoying Crosshare please consider{' '}
          <a href="/donate">donating</a> to support its continuing development.
        </p>
        <div
          css={{
            display: 'flex',
            flexDirection: 'column',
            [SMALL_AND_UP]: {
              flexDirection: 'row',
            },
          }}
        >
          <div css={{ flex: '50%' }}>
            <h2>Daily Mini</h2>
            <PuzzleResultLink
              fullWidth
              puzzle={dailymini}
              showAuthor={true}
              constructorPage={dailymini.constructorPage}
              title={'Today\'s daily mini crossword'}
            />
            <p>
              <Link
                href={`/dailyminis/${today.getUTCFullYear()}/${
                  today.getUTCMonth() + 1
                }`}
              >
                Previous daily minis &rarr;
              </Link>
            </p>
          </div>
          <div css={{ flex: '50%' }}>
            <CreateShareSection halfWidth={true} />
          </div>
        </div>
        <h2>Featured Puzzles</h2>
        {featured.map((p, i) => (
          <PuzzleResultLink
            key={i}
            puzzle={p}
            showDate={true}
            constructorPage={p.constructorPage}
            showAuthor={true}
          />
        ))}
        <p>
          <Link href="/featured/1">Previous featured puzzles &rarr;</Link>
        </p>
        <UnfinishedPuzzleList user={user} />
        <p css={{ marginTop: '1em', textAlign: 'center' }}>
          If you have questions or suggestions please contact us via{' '}
          <ContactLinks />.
        </p>
        {!loading && !user?.email ? (
          <form
            css={{ textAlign: 'center' }}
            action="https://crosshare.us2.list-manage.com/subscribe/post?u=00ed30fa1e63ee37b6baf232c&amp;id=de9a6d6b7a"
            method="post"
            target="_blank"
          >
            <label>
              <p>
                Subscribe to get a once-per-week email listing the best new
                puzzles and constructors on Crosshare:
              </p>
              <input
                type="email"
                placeholder="Your email address"
                name="EMAIL"
              />
              <Button
                css={{ marginLeft: '1em' }}
                type="submit"
                text="Subscribe"
              />
            </label>
            <div
              style={{ position: 'absolute', left: '-5000px' }}
              aria-hidden="true"
            >
              <input
                type="text"
                name="b_00ed30fa1e63ee37b6baf232c_de9a6d6b7a"
                tabIndex={-1}
              />
            </div>
          </form>
        ) : (
          ''
        )}
      </div>
    </>
  );
}
