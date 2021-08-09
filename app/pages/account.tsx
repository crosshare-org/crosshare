import { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';

import { DisplayNameForm, useDisplayName } from '../components/DisplayNameForm';
import { requiresAuth, AuthProps } from '../components/AuthContext';
import { App, FieldValue } from '../lib/firebaseWrapper';
import { DefaultTopBar } from '../components/TopBar';
import { Link } from '../components/Link';
import { CreatePageForm, BioEditor } from '../components/ConstructorPage';
import { Button } from '../components/Buttons';
import { PROFILE_PIC, COVER_PIC } from '../lib/style';
import {
  UnsubscribeFlags,
  AccountPrefsT,
  AccountPrefsFlagsT,
} from '../lib/prefs';

import dynamic from 'next/dynamic';
import type { ImageCropper as ImageCropperType } from '../components/ImageCropper';
import { useSnackbar } from '../components/Snackbar';
import { useCollection } from 'react-firebase-hooks/firestore';
import { useDarkModeControl } from '../lib/hooks';
const ImageCropper = dynamic(
  () =>
    import('../components/ImageCropper').then((mod) => mod.ImageCropper as any), // eslint-disable-line @typescript-eslint/no-explicit-any
  { ssr: false }
) as typeof ImageCropperType;

interface UnsubSettingProps {
  prefs: AccountPrefsT | undefined;
  userId: string;
  flag: keyof typeof UnsubscribeFlags;
  text: string;
  invert?: boolean;
  neverDisable?: boolean;
}

const UnsubSetting = (props: UnsubSettingProps) => {
  const { showSnackbar } = useSnackbar();
  const unsubbed = props.prefs?.unsubs?.includes(props.flag);
  const unsubbedAll = props.prefs?.unsubs?.includes('all');
  return (
    <label>
      <input
        css={{ marginRight: '1em' }}
        type="checkbox"
        disabled={!props.neverDisable && unsubbedAll}
        checked={props.invert ? unsubbed : !unsubbed && !unsubbedAll}
        onChange={(e) =>
          App.firestore()
            .doc(`prefs/${props.userId}`)
            .set(
              {
                unsubs:
                  e.target.checked !== !!props.invert
                    ? FieldValue.arrayRemove(props.flag)
                    : FieldValue.arrayUnion(props.flag),
              },
              { merge: true }
            )
            .then(() => {
              showSnackbar('Email Preferences Updated');
            })
        }
      />
      {props.text}
    </label>
  );
};

interface PrefSettingProps {
  prefs: AccountPrefsT | undefined;
  userId: string;
  flag: keyof AccountPrefsFlagsT;
  text: string;
  invert?: boolean;
}

const PrefSetting = (props: PrefSettingProps) => {
  const { showSnackbar } = useSnackbar();
  const prefSet = props.prefs?.[props.flag] || false;
  return (
    <label>
      <input
        css={{ marginRight: '1em' }}
        type="checkbox"
        checked={props.invert ? !prefSet : prefSet}
        onChange={(e) =>
          App.firestore()
            .doc(`prefs/${props.userId}`)
            .set(
              {
                [props.flag]: props.invert
                  ? !e.target.checked
                  : e.target.checked,
              },
              { merge: true }
            )
            .then(() => {
              showSnackbar('Preferences Updated');
            })
        }
      />
      {props.text}
    </label>
  );
};

export const AccountPage = ({ user, constructorPage, prefs }: AuthProps) => {
  const [settingProfilePic, setSettingProfilePic] = useState(false);
  const [settingCoverPic, setSettingCoverPic] = useState(false);
  const [hasAuthoredPuzzle, setHasAuthoredPuzzle] = useState(false);
  const displayName = useDisplayName();

  const db = App.firestore();
  const authoredQuery = useMemo(
    () => db.collection('c').where('a', '==', user.uid).limit(1),
    [db, user.uid]
  );
  const [authoredSnap] = useCollection(authoredQuery);
  const [colorPref, setColorPref] = useDarkModeControl();

  useEffect(() => {
    if (authoredSnap && authoredSnap.size >= 0) {
      setHasAuthoredPuzzle(true);
    }
  }, [authoredSnap]);

  return (
    <>
      <Head>
        <title>Account | Crosshare</title>
        <meta name="robots" content="noindex" />
      </Head>
      <DefaultTopBar accountSelected />
      <div css={{ margin: '1em' }}>
        <h2>Account</h2>
        <p>
          You&apos;re logged in as <b>{user.email}</b>.{' '}
          <Button onClick={() => App.auth().signOut()} text="Log out" />
        </p>
        <p>
          Your display name{' '}
          {displayName ? (
            <>
              - <i>{displayName}</i> -{' '}
            </>
          ) : (
            ''
          )}
          is displayed next to any comments you make or puzzles you create.
        </p>
        <DisplayNameForm />
        <h3>Notification Settings</h3>
        <p>Email me (to {user.email}, at most once per day) when:</p>
        <ul css={{ listStyleType: 'none' }}>
          <li>
            <UnsubSetting
              prefs={prefs}
              userId={user.uid}
              flag="comments"
              text="I have unseen comments on my puzzles or replies to my comments"
            />
          </li>
          <li>
            <UnsubSetting
              prefs={prefs}
              userId={user.uid}
              flag="newpuzzles"
              text="A constructor I follow publishes a new puzzle"
            />
          </li>
          <li>
            <UnsubSetting
              prefs={prefs}
              userId={user.uid}
              flag="featured"
              text="One of my puzzles is chosen as a Crosshare featured puzzle or daily mini"
            />
          </li>
          <li>
            <UnsubSetting
              prefs={prefs}
              userId={user.uid}
              flag="all"
              invert
              neverDisable
              text="Never notify me by email (even for any future notification types)"
            />
          </li>
        </ul>
        <hr css={{ margin: '2em 0' }} />
        <h2>Solving Preferences</h2>
        <ul
          css={{
            listStyleType: 'none',
            padding: '0 0',
          }}
        >
          <li>
            <PrefSetting
              prefs={prefs}
              userId={user.uid}
              flag={'advanceOnPerpendicular'}
              text="Advance to next square when changing direction with arrow keys"
            />
          </li>
          <li>
            <PrefSetting
              prefs={prefs}
              userId={user.uid}
              flag={'dontSkipCompleted'}
              invert={true}
              text="Skip over completed squares after entering a letter"
            />
          </li>
          <li>
            <PrefSetting
              prefs={prefs}
              userId={user.uid}
              flag={'dontAdvanceWordAfterCompletion'}
              invert={true}
              text="Move to next clue after completing an entry"
            />
          </li>
          <li>
            <PrefSetting
              prefs={prefs}
              userId={user.uid}
              flag={'solveDownsOnly'}
              text="Start puzzles in downs-only mode"
            />
          </li>
        </ul>
        <hr css={{ margin: '2em 0' }} />
        <h2>Browser Specific Settings</h2>
        <h3>Color Theme</h3>
        <label>
          <input
            css={{ marginRight: '0.5em' }}
            type="radio"
            name="theme"
            value="default"
            checked={colorPref === null}
            onChange={(e) => {
              if (e.currentTarget.value !== 'default') return;
              setColorPref(null);
            }}
          />{' '}
          Use browser/OS setting
        </label>
        <br />
        <label>
          <input
            css={{ marginRight: '0.5em' }}
            type="radio"
            name="theme"
            value="dark"
            checked={colorPref === 'dark'}
            onChange={(e) => {
              if (e.currentTarget.value !== 'dark') return;
              setColorPref('dark');
            }}
          />{' '}
          Use dark mode
        </label>
        <br />
        <label>
          <input
            css={{ marginRight: '0.5em' }}
            type="radio"
            name="theme"
            value="light"
            checked={colorPref === 'light'}
            onChange={(e) => {
              if (e.currentTarget.value !== 'light') return;
              setColorPref('light');
            }}
          />{' '}
          Use light mode
        </label>
        <hr css={{ margin: '2em 0' }} />
        <h2>Crossword Blog</h2>
        {hasAuthoredPuzzle ? (
          <CreatePageForm
            css={{ display: constructorPage ? 'none' : 'block' }}
          />
        ) : (
          <p>
            Start sharing your own puzzles by creating one with the{' '}
            <Link href="/construct">Crosshare constructor</Link> or{' '}
            <Link href="/upload">uploading a .puz file.</Link>
          </p>
        )}
        {constructorPage ? (
          <>
            <p>
              Your blog is live at{' '}
              <Link href={'/' + constructorPage.i}>
                https://crosshare.org/{constructorPage.i}
              </Link>
            </p>
            <h3>Blog settings</h3>
            <p>
              Note: changes may take up to an hour to appear on the site - we
              cache pages to keep Crosshare fast!
            </p>
            <BioEditor
              constructorPage={constructorPage}
              addProfilePic={() => setSettingProfilePic(true)}
              addCoverPic={() => setSettingCoverPic(true)}
            />
          </>
        ) : (
          ''
        )}
      </div>
      {settingProfilePic ? (
        <ImageCropper
          targetSize={PROFILE_PIC}
          isCircle={true}
          storageKey={`/users/${user.uid}/profile.jpg`}
          cancelCrop={() => setSettingProfilePic(false)}
        />
      ) : (
        ''
      )}
      {settingCoverPic ? (
        <ImageCropper
          targetSize={COVER_PIC}
          isCircle={false}
          storageKey={`/users/${user.uid}/cover.jpg`}
          cancelCrop={() => setSettingCoverPic(false)}
        />
      ) : (
        ''
      )}
    </>
  );
};

export default requiresAuth(AccountPage);
