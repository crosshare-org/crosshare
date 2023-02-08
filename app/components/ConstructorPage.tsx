import Head from 'next/head';
import { useState, FormEvent, useContext, useCallback } from 'react';

import { DefaultTopBar } from './TopBar';
import { ConstructorPageBase, ConstructorPageT } from '../lib/constructorPage';
import { LinkablePuzzle, PuzzleResultLink } from './PuzzleLink';
import { Link, LinkButtonSimpleA } from './Link';
import { Markdown } from './Markdown';
import { AuthContext } from './AuthContext';
import { getDocRef } from '../lib/firebaseWrapper';
import { ButtonAsLink } from './Buttons';
import { HUGE_AND_UP, MAX_WIDTH } from '../lib/style';
import { CoverPic, ProfilePicAndName } from './Images';
import { ToolTipText } from './ToolTipText';
import { FollowButton } from './FollowButton';
import { FaInfoCircle } from 'react-icons/fa';
import { Overlay } from './Overlay';
import { ConstructorStats } from './ConstructorStats';
import { Trans, t, Plural } from '@lingui/macro';
import { I18nTags } from './I18nTags';
import { useRouter } from 'next/router';
import { PatronIcon } from './Icons';
import {
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import type { Root } from 'hast';

const BANNED_USERNAMES = {
  api: 1,
  categories: 1,
  category: 1,
  crosswords: 1,
  crossword: 1,
  puzzle: 1,
  app: 1,
  blog: 1,
  404: 1,
  account: 1,
  user: 1,
  admin: 1,
  construct: 1,
  constructor: 1,
  icons: 1,
  privacy: 1,
  tos: 1,
  square: 1,
  rebuild: 1,
  words: 1,
  word: 1,
  entry: 1,
  grid: 1,
  wordlist: 1,
  upload: 1,
  ios: 1,
  test: 1,
  testing: 1,
  android: 1,
  help: 1,
  mini: 1,
  dailymini: 1,
  featured: 1,
  daily: 1,
  wwmc: 1,
  meta: 1,
  themeless: 1,
  midi: 1,
  cryptic: 1,
  themed: 1,
  hard: 1,
  easy: 1,
  medium: 1,
  beginner: 1,
  tags: 1,
  edit: 1,
  clues: 1,
  entries: 1,
  clue: 1,
  feed: 1,
  articles: 1,
  article: 1,
  dailyminis: 1,
  embed: 1,
  newest: 1,
  stats: 1,
  dashboard: 1,
};

export const CreatePageForm = (props: { className?: string }) => {
  const ctx = useContext(AuthContext);
  const [username, setUsername] = useState('');
  const [showError, setShowError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState(false);

  function sanitize(input: string): string {
    const res = input.match(/^([a-zA-Z]\w*)/);
    return res?.[0] || '';
  }

  function isInvalid(u: string) {
    if (u.length < 3 || u.length > 20) {
      return true;
    }
    return false;
  }

  async function createPage(event: FormEvent) {
    event.preventDefault();
    const user = ctx.user;
    if (!user) {
      return;
    }
    const lower = username.toLowerCase();
    if (
      lower.includes('admin') ||
      lower.includes('crosshare') ||
      Object.prototype.hasOwnProperty.call(BANNED_USERNAMES, lower)
    ) {
      setShowError(true);
      return;
    }
    setSubmitting(true);

    const cp = {
      i: username,
      u: user.uid,
      n: user.displayName || 'Anonymous Crossharer',
      b: '',
      m: true,
      t: serverTimestamp(),
    };
    return setDoc(getDocRef('cp', lower), cp)
      .then(() => {
        setCreated(true);
      })
      .catch((e) => {
        console.log(e);
        setShowError(true);
      })
      .finally(() => {
        setSubmitting(false);
      });
  }

  if (created) {
    return <p className={props.className}>Created successfully!</p>;
  }

  return (
    <div className={props.className}>
      <form onSubmit={createPage}>
        <label css={{ width: '100%', margin: 0 }}>
          <p>
            Create a constructor blog to keep all of your public puzzles on one
            page.
          </p>
          <p>
            Your blog&apos;s url (choose carefully, you can&apos;t change this
            later):
          </p>
          <p>
            <span css={{ fontWeight: 'bold', marginRight: '0.15em' }}>
              https://crosshare.org/
            </span>
            <input
              type="text"
              value={username}
              placeholder="username"
              onChange={(e) => {
                setShowError(false);
                setUsername(sanitize(e.target.value));
              }}
            />
          </p>
        </label>
        <p>
          <input
            type="submit"
            disabled={isInvalid(username) || submitting}
            value="Create"
          />
          {showError ? (
            <span css={{ color: 'var(--error)', marginLeft: '1em' }}>
              That username is unavailable. Please try something different.
            </span>
          ) : (
            ''
          )}
        </p>
      </form>
    </div>
  );
};

export interface ConstructorPageProps {
  constructorData: ConstructorPageT;
  bioHast: Root;
  isPatron: boolean;
  followCount: number;
  followers: Array<ConstructorPageBase & { isPatron: boolean }>;
  following: Array<ConstructorPageBase & { isPatron: boolean }>;
  profilePicture: string | null;
  coverPicture: string | null;
  puzzles: Array<LinkablePuzzle>;
  nextPage: number | null;
  currentPage: number;
  prevPage: number | null;
}

const FollowersList = ({
  pages,
  close,
}: {
  pages: Array<ConstructorPageBase & { isPatron: boolean }>;
  close: () => void;
}) => {
  return (
    <ul
      css={{
        width: '100%',
        maxWidth: '40em',
        listStyleType: 'none',
        padding: 0,
        margin: 'auto',
        textAlign: 'left',
      }}
    >
      {pages.map((f) => (
        <FollowersListItem key={f.i} page={f} close={close} />
      ))}
    </ul>
  );
};

const FollowersListItem = ({
  page,
  close,
}: {
  page: ConstructorPageBase & { isPatron: boolean };
  close: () => void;
}) => {
  const router = useRouter();

  const click = useCallback(() => {
    close();
    router.push(`/${page.i}`);
  }, [page.i, router, close]);

  return (
    <li>
      <div
        tabIndex={0}
        role="button"
        onClick={click}
        onKeyPress={click}
        css={{
          padding: '1.5em 1em',
          display: 'flex',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          '&:hover': {
            backgroundColor: 'var(--secondary)',
          },
          cursor: 'pointer',
        }}
      >
        <div css={{ marginRight: '1em' }}>
          <div>
            <b
              css={{
                fontSize: '1.1em',
                '&:hover': { textDecoration: 'underline' },
              }}
            >
              {page.isPatron ? <PatronIcon /> : ''} {page.n}
            </b>
          </div>
          <div>@{page.i}</div>
        </div>
        <FollowButton css={{ marginLeft: 'auto' }} page={page} />
      </div>
    </li>
  );
};

export const ConstructorPage = (props: ConstructorPageProps) => {
  const { locale } = useRouter();
  const { isAdmin } = useContext(AuthContext);
  const [showOverlay, setShowOverlay] = useState(false);
  const [overlayIsFollowing, setOverlayIsFollowing] = useState(false);
  const coverPic = props.coverPicture;
  const profilePic = props.profilePicture;
  const username = props.constructorData.i || props.constructorData.id;
  const description =
    'The latest crossword puzzles from ' +
    props.constructorData.n +
    ' (@' +
    username +
    '). ' +
    props.constructorData.b;
  const title =
    props.constructorData.n + ' (@' + username + ') | Crosshare Crossword Puzzles';
  const paypalEmail = props.constructorData.pp;
  const paypalText = props.constructorData.pt;
  const loc = locale || 'en';

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta key="og:title" property="og:title" content={title} />
        <meta
          key="og:description"
          property="og:description"
          content={description}
        />
        {profilePic ? (
          <>
            <meta key="og:image" property="og:image" content={profilePic} />
            <meta
              key="og:image:width"
              property="og:image:width"
              content="200"
            />
            <meta
              key="og:image:height"
              property="og:image:height"
              content="200"
            />
          </>
        ) : (
          ''
        )}
        <meta key="description" name="description" content={description} />
        <link
          rel="alternate"
          type="application/rss+xml"
          title={title}
          href={`https://crosshare.org/api/feed/${username}`}
        />
        <I18nTags
          locale={loc}
          canonicalPath={`/${username}${
            props.currentPage !== 0 ? '/page/' + props.currentPage : ''
          }`}
        />
        {props.prevPage === 0 ? (
          <link
            rel="prev"
            href={`https://crosshare.org${
              loc == 'en' ? '' : '/' + loc
            }/${username}`}
          />
        ) : (
          ''
        )}
        {props.prevPage ? (
          <link
            rel="prev"
            href={`https://crosshare.org${
              loc == 'en' ? '' : '/' + loc
            }/${username}/page/${props.prevPage}`}
          />
        ) : (
          ''
        )}
        {props.nextPage !== null ? (
          <link
            rel="next"
            href={`https://crosshare.org${
              loc == 'en' ? '' : '/' + loc
            }/${username}/page/${props.nextPage}`}
          />
        ) : (
          ''
        )}
      </Head>
      <DefaultTopBar />
      {coverPic ? <CoverPic coverPicture={coverPic} /> : ''}
      <div
        css={{
          margin: '2em 1em',
          [HUGE_AND_UP]: {
            maxWidth: MAX_WIDTH,
            margin: '2em auto',
          },
        }}
      >
        <ProfilePicAndName
          coverImage={coverPic}
          profilePic={profilePic}
          topLine={
            <>
              {props.isPatron ? (
                <PatronIcon css={{ marginRight: '0.3em' }} linkIt={true} />
              ) : (
                ''
              )}
              {props.constructorData.n}
            </>
          }
          byLine={
            <>
              <h2
                css={{
                  fontSize: '1em',
                  fontWeight: 'normal',
                  marginBottom: '0.25em',
                }}
              >
                <Link href={'/' + username}>@{username}</Link>
              </h2>
              {showOverlay ? (
                <Overlay closeCallback={() => setShowOverlay(false)}>
                  <div css={{ textAlign: 'center' }}>
                    {overlayIsFollowing ? (
                      <>
                        <h2>
                          <Trans id="following-count">
                            {props.following.length} Following
                          </Trans>
                        </h2>
                        <FollowersList
                          pages={props.following}
                          close={() => setShowOverlay(false)}
                        />
                      </>
                    ) : (
                      <>
                        <h2>
                          <Plural
                            id="follower-count"
                            value={props.followCount}
                            one="1 Follower"
                            other="# Followers"
                          />
                        </h2>
                        <h3>
                          <Plural
                            id="follower-blog-count"
                            value={props.followers.length}
                            one="1 with a Crosshare blog:"
                            other="# with Crosshare blogs:"
                          />
                        </h3>
                        <FollowersList
                          pages={props.followers}
                          close={() => setShowOverlay(false)}
                        />
                      </>
                    )}
                  </div>
                </Overlay>
              ) : (
                ''
              )}
              <p>
                <ButtonAsLink
                  disabled={props.following.length === 0}
                  onClick={() => {
                    setShowOverlay(true);
                    setOverlayIsFollowing(true);
                  }}
                  text={
                    <Trans id="following-count">
                      {props.following.length} Following
                    </Trans>
                  }
                />
                {' · '}
                <ButtonAsLink
                  disabled={props.followCount === 0}
                  onClick={() => {
                    setShowOverlay(true);
                    setOverlayIsFollowing(false);
                  }}
                  text={
                    <Plural
                      id="follower-count"
                      value={props.followCount}
                      one="1 Follower"
                      other="# Followers"
                    />
                  }
                />
              </p>
            </>
          }
        />
        <div css={{ textAlign: 'center', marginBottom: '1.5em' }}>
          <FollowButton page={props.constructorData} />
        </div>
        <div css={{ marginBottom: '1.5em' }}>
          <Markdown hast={props.bioHast} />
          {paypalEmail && paypalText ? (
            <div>
              <LinkButtonSimpleA
                css={{ marginRight: '0.5em' }}
                href={`https://www.paypal.com/cgi-bin/webscr?cmd=_donations&business=${encodeURIComponent(
                  paypalEmail
                )}&item_name=${encodeURIComponent(
                  paypalText
                )}&currency_code=USD&source=url`}
                text={t({
                  message: `Tip ${props.constructorData.n}`,
                  comment:
                    'The variable is the name of the user who will recieve the $ tip',
                })}
              />
              <ToolTipText
                text={<FaInfoCircle />}
                tooltip={t`All donations go directly to the constructor via PayPal`}
              />
            </div>
          ) : (
            ''
          )}
        </div>
        {props.puzzles.map((p, i) => (
          <PuzzleResultLink
            key={i}
            puzzle={p}
            showDate={true}
            showBlogPost={true}
            showAuthor={false}
            constructorIsPatron={props.isPatron}
            filterTags={[]}
          />
        ))}
        {props.nextPage || props.prevPage !== null ? (
          <p css={{ textAlign: 'center' }}>
            {props.prevPage === 0 ? (
              <Link css={{ marginRight: '2em' }} href={'/' + username}>
                ← <Trans>Newer Puzzles</Trans>
              </Link>
            ) : (
              ''
            )}
            {props.prevPage ? (
              <Link
                css={{ marginRight: '2em' }}
                href={'/' + username + '/page/' + props.prevPage}
              >
                ← <Trans>Newer Puzzles</Trans>
              </Link>
            ) : (
              ''
            )}
            {props.nextPage !== null ? (
              <Link href={'/' + username + '/page/' + props.nextPage}>
                <Trans>Older Puzzles</Trans> →
              </Link>
            ) : (
              ''
            )}
          </p>
        ) : (
          ''
        )}
        {isAdmin ? <ConstructorStats userId={props.constructorData.u} /> : ''}
      </div>
    </>
  );
};
