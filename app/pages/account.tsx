import { useState, useEffect, useMemo, useCallback } from 'react';
import Head from 'next/head';

import { getDisplayName, DisplayNameForm } from '../components/DisplayNameForm';
import { requiresAuth, AuthProps } from '../components/AuthContext';
import { DBPuzzleV, LegacyPlayV } from '../lib/dbtypes';
import { App, FieldValue } from '../lib/firebaseWrapper';
import { DefaultTopBar } from '../components/TopBar';
import { PuzzleResultLink } from '../components/PuzzleLink';
import { Link } from '../components/Link';
import { getPuzzle } from '../lib/puzzleCache';
import { CreatePageForm, BioEditor } from '../components/ConstructorPage';
import { puzzleFromDB } from '../lib/types';
import { Button } from '../components/Buttons';
import { PROFILE_PIC, COVER_PIC } from '../lib/style';
import { UnsubscribeFlags, AccountPrefsT } from '../lib/prefs';

import dynamic from 'next/dynamic';
import type { ImageCropper as ImageCropperType } from '../components/ImageCropper';
import { useSnackbar } from '../components/Snackbar';
import { usePaginatedQuery } from '../lib/usePagination';
const ImageCropper = dynamic(
  () => import('../components/ImageCropper').then((mod) => mod.ImageCropper as any),  // eslint-disable-line @typescript-eslint/no-explicit-any
  { ssr: false }
) as typeof ImageCropperType;

interface PrefSettingProps {
  prefs: AccountPrefsT | undefined,
  userId: string,
  flag: keyof (typeof UnsubscribeFlags),
  text: string,
  invert?: boolean,
  neverDisable?: boolean
}

const PrefSetting = (props: PrefSettingProps) => {
  const { showSnackbar } = useSnackbar();
  const unsubbed = props.prefs ?.unsubs ?.includes(props.flag);
  const unsubbedAll = props.prefs ?.unsubs ?.includes('all');
  return <label>
    <input css={{ marginRight: '1em' }} type='checkbox' disabled={!props.neverDisable && unsubbedAll} checked={props.invert ? unsubbed : !unsubbed && !unsubbedAll} onChange={e =>
      App.firestore().doc(`prefs/${props.userId}`).set({ unsubs: e.target.checked !== !!props.invert ? FieldValue.arrayRemove(props.flag) : FieldValue.arrayUnion(props.flag) }, { merge: true }).then(() => {
        showSnackbar('Email Preferences Updated');
      })
    } />
    {props.text}
  </label>;
};

export const AccountPage = ({ user, constructorPage, prefs }: AuthProps) => {
  const [settingProfilePic, setSettingProfilePic] = useState(false);
  const [settingCoverPic, setSettingCoverPic] = useState(false);
  const [hasAuthoredPuzzle, setHasAuthoredPuzzle] = useState(false);
  const [displayName, setDisplayName] = useState(getDisplayName(user, constructorPage));

  const db = App.firestore();
  const unfinishedQuery = useMemo(() =>
    db.collection('p').where('u', '==', user.uid).where('f', '==', false).orderBy('ua', 'desc'),
  [db, user.uid]);
  const playMapper = useCallback(async (play) => {
    const puzzleId = play.c;
    const puzzle = await getPuzzle(puzzleId);
    if (!puzzle || puzzle.a === user.uid) {
      console.log('deleting invalid play');
      await db.collection('p').doc(`${puzzleId}-${user.uid}`).delete();
      return undefined;
    } else {
      return { ...puzzleFromDB(puzzle), id: puzzleId };
    }
  }, [db, user.uid]);
  const {
    loading: loadingUnfinished,
    docs: unfinishedPuzzles,
    loadMore: loadMoreUnfinished,
    hasMore: hasMoreUnfinished,
  } = usePaginatedQuery(unfinishedQuery, LegacyPlayV, 4, playMapper);

  const authoredQuery = useMemo(() =>
    db.collection('c').where('a', '==', user.uid).orderBy('p', 'desc'),
  [db, user.uid]);
  const authoredMapper = useCallback(async (dbres, id) => ({ ...puzzleFromDB(dbres), id }), []);
  const {
    loading: loadingAuthored,
    docs: authoredPuzzles,
    loadMore: loadMoreAuthored,
    hasMore: hasMoreAuthored,
  } = usePaginatedQuery(authoredQuery, DBPuzzleV, 4, authoredMapper);

  useEffect(() => {
    if (!hasAuthoredPuzzle && authoredPuzzles.length) {
      setHasAuthoredPuzzle(true);
    }
  }, [hasAuthoredPuzzle, authoredPuzzles.length]);

  return (
    <>
      <Head>
        <title>Account | Crosshare</title>
        <meta name="robots" content="noindex" />
      </Head>
      <DefaultTopBar />
      <div css={{ margin: '1em', }}>
        <h2>Account</h2>
        <p>You&apos;re logged in as <b>{user.email}</b>. <Button onClick={() => App.auth().signOut()} text="Log out" /></p>
        <p>Your display name - <i>{displayName}</i> - is displayed next to any comments you make or puzzles you create.</p>
        <DisplayNameForm user={user} onChange={setDisplayName} />
        <h3>Notification Settings</h3>
        <p>Email me (to {user.email}, at most once per day) when:</p>
        <ul css={{ listStyleType: 'none' }}>
          <li>
            <PrefSetting prefs={prefs} userId={user.uid} flag='comments' text='I have unseen comments on my puzzles or replies to my comments' />
          </li>
          <li>
            <PrefSetting prefs={prefs} userId={user.uid} flag='all' invert neverDisable text='Never notify me by email (even for any future notification types)' />
          </li>
        </ul>
        <h2>Crossword Blog</h2>
        {constructorPage ?
          <>
            <p>Your blog is live at <Link href='/[...slug]' as={'/' + constructorPage.i} passHref>https://crosshare.org/{constructorPage.i}</Link></p>
            <h3>Blog settings</h3>
            <p>Note: changes may take up to an hour to appear on the site - we cache pages to keep Crosshare fast!</p>
            <BioEditor constructorPage={constructorPage} addProfilePic={() => setSettingProfilePic(true)} addCoverPic={() => setSettingCoverPic(true)} />
          </>
          :
          (hasAuthoredPuzzle ?
            <>
              <CreatePageForm />
            </>
            :
            <p>Start sharing your own puzzles by creating one with the <Link href='/construct' as='/construct' passHref>Crosshare constructor</Link> or <Link href='/upload' as='/upload' passHref>uploading a .puz file.</Link></p>
          )
        }
        {authoredPuzzles.length ?
          <>
            <h2>Your Constructions</h2>
            {authoredPuzzles.map((puzzle) => <PuzzleResultLink key={puzzle.id} puzzle={puzzle} showAuthor={false} constructorPage={null} />)}
            {loadingAuthored ? <p>Loading...</p> :
              hasMoreAuthored && <Button onClick={loadMoreAuthored} text='Older...' />
            }
          </>
          : ''}
        {unfinishedPuzzles.length ?
          <>
            <h2>Unfinished Solves</h2>
            {unfinishedPuzzles.map((puzzle) => <PuzzleResultLink key={puzzle.id} puzzle={puzzle} showAuthor={false} constructorPage={null} />)}
            {loadingUnfinished ? <p>Loading...</p> :
              hasMoreUnfinished && <Button onClick={loadMoreUnfinished} text='Older...' />
            }
          </>
          : ''}
      </div>
      {settingProfilePic ?
        <ImageCropper targetSize={PROFILE_PIC} isCircle={true} storageKey={`/users/${user.uid}/profile.jpg`} cancelCrop={() => setSettingProfilePic(false)} />
        : ''}
      {settingCoverPic ?
        <ImageCropper targetSize={COVER_PIC} isCircle={false} storageKey={`/users/${user.uid}/cover.jpg`} cancelCrop={() => setSettingCoverPic(false)} />
        : ''}
    </>
  );
};

export default requiresAuth(AccountPage);
