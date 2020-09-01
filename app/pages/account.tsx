import { useState, useEffect } from 'react';
import Head from 'next/head';

import { getDisplayName, DisplayNameForm } from '../components/DisplayNameForm';
import { requiresAuth, AuthProps } from '../components/AuthContext';
import { PlayWithoutUserT, LegacyPlayV } from '../lib/dbtypes';
import { App } from '../lib/firebaseWrapper';
import { DefaultTopBar } from '../components/TopBar';
import { PuzzleLink } from '../components/PuzzleLink';
import { Link } from '../components/Link';
import { isRight } from 'fp-ts/lib/Either';
import { PathReporter } from 'io-ts/lib/PathReporter';
import { getPuzzle } from '../lib/puzzleCache';
import { CreatePageForm } from '../components/ConstructorPage';

const PlayListItem = ({ play }: { play: PlayWithoutUserT }) => {
  return <PuzzleLink id={play.c} title={play.n} />;
};

export default requiresAuth(({ user, constructorPage }: AuthProps) => {
  const [hasAuthoredPuzzle, setHasAuthoredPuzzle] = useState(false);
  const [unfinishedPlays, setUnfinishedPlays] = useState<Array<PlayWithoutUserT> | null>(null);
  const [error, setError] = useState(false);
  const [displayName, setDisplayName] = useState(getDisplayName(user, constructorPage));

  useEffect(() => {
    console.log('loading authored puzzle and plays');
    let ignore = false;

    async function fetchData() {
      const db = App.firestore();

      if (constructorPage) {
        setHasAuthoredPuzzle(true);
      } else {
        db.collection('c').where('a', '==', user.uid).limit(1).get()
          .then(res => {
            if (ignore) {
              return;
            }
            setHasAuthoredPuzzle(res.size > 0);
          }).catch(reason => {
            console.error(reason);
            if (ignore) {
              return;
            }
            setError(true);
          });
      }

      db.collection('p').where('u', '==', user.uid).where('f', '==', false).limit(10).get()
        .then(async playsResult => {
          const plays = [];
          if (ignore) {
            return;
          }
          if (playsResult === null) {
            setUnfinishedPlays([]);
          } else {
            for (const doc of playsResult.docs) {
              const playResult = LegacyPlayV.decode(doc.data());
              if (isRight(playResult)) {
                const puzzleId = playResult.right.c;
                const puzzle = await getPuzzle(puzzleId);
                if (ignore) {
                  return;
                }
                if (!puzzle || puzzle.a === user.uid) {
                  console.log('deleting invalid play');
                  db.collection('p').doc(`${puzzleId}-${user.uid}`).delete();
                } else {
                  plays.push({ ...playResult.right, n: puzzle.t });
                }
              } else {
                console.error(PathReporter.report(playResult).join(','));
                return Promise.reject('Malformed play');
              }
            }
            setUnfinishedPlays(plays);
          }
        }).catch(reason => {
          console.error(reason);
          if (ignore) {
            return;
          }
          setError(true);
        });
    }

    fetchData();
    return () => { ignore = true; };
  }, [user, constructorPage]);

  if (error) {
    return <div>Error loading plays / authored puzzles. Please try again.</div>;
  }
  return (
    <>
      <Head>
        <title>Account | Crosshare</title>
        <meta name="robots" content="noindex" />
      </Head>
      <DefaultTopBar />
      <div css={{ margin: '1em', }}>
        <h2>Account</h2>
        <p>You&apos;re logged in as <b>{user.email}</b>. <button onClick={() => App.auth().signOut()}>Log out</button></p>
        <p>Your display name - <i>{displayName}</i> - is displayed next to any comments you make or puzzles you create.</p>
        <DisplayNameForm user={user} onChange={setDisplayName} />
        <h2>Crossword Blog</h2>
        {constructorPage ?
          <>
            <p>Your blog is live at <Link href='/[...slug]' as={'/' + constructorPage.i} passHref>https://crosshare.org/{constructorPage.i}</Link></p>
            <p>Visit your blog page to edit your bio or view your constructed puzzles.</p>
          </>
          :
          (hasAuthoredPuzzle ?
            <>
              <CreatePageForm />
            </>
            :
            <p>Start sharing your own puzzles by <Link href='/construct' as='/construct' passHref>creating one with the Crosshare constructor (beta)</Link> or <Link href='/upload' as='/upload' passHref>uploading a .puz file.</Link></p>
          )
        }
        {unfinishedPlays && unfinishedPlays.length ?
          <>
            <h2>Unfinished Solves</h2>
            {unfinishedPlays.map((play) => <PlayListItem key={play.c} play={play} />)}
          </>
          :
          ''
        }
      </div>
    </>
  );
});
