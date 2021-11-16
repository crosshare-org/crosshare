import Head from 'next/head';
import { useState, FormEvent, useContext } from 'react';

import { DefaultTopBar } from './TopBar';
import { ConstructorPageT } from '../lib/constructorPage';
import { LinkablePuzzle, PuzzleResultLink } from './PuzzleLink';
import { Link, LinkButtonSimpleA } from './Link';
import { Markdown } from './Markdown';
import { AuthContext } from './AuthContext';
import { App, ServerTimestamp, DeleteSentinal } from '../lib/firebaseWrapper';
import { Button } from './Buttons';
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
      t: ServerTimestamp,
    };
    return App.firestore()
      .collection('cp')
      .doc(lower)
      .set(cp)
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

interface BioEditorProps {
  constructorPage: ConstructorPageT;
  addProfilePic: () => void;
  addCoverPic: () => void;
}

const BIO_LENGTH_LIMIT = 1500;
const PAYPAL_LENGTH_LIMIT = 140;
const SIG_LENGTH_LIMIT = 500;

export const BioEditor = (props: BioEditorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSigOpen, setIsSigOpen] = useState(false);
  const [showPaypalEditor, setShowPaypalEditor] = useState(false);
  const [bioText, setBioText] = useState(props.constructorPage.b);
  const [sigText, setSigText] = useState(props.constructorPage.sig || '');
  const [paypalEmail, setPaypalEmail] = useState(
    props.constructorPage.pp || ''
  );
  const [paypalText, setPaypalText] = useState(props.constructorPage.pt || '');
  const [submitting, setSubmitting] = useState(false);

  function deleteTipButton() {
    console.log('Removing tip button');
    const db = App.firestore();
    db.collection('cp')
      .doc(props.constructorPage.id)
      .update({
        pp: DeleteSentinal,
        pt: DeleteSentinal,
        m: true,
        t: ServerTimestamp,
      })
      .then(() => {
        console.log('Updated');
        setIsOpen(false);
      });
  }

  function deleteSig() {
    console.log('Removing sig');
    const db = App.firestore();
    db.collection('cp')
      .doc(props.constructorPage.id)
      .update({ sig: DeleteSentinal, m: true, t: ServerTimestamp })
      .then(() => {
        console.log('Updated');
        setIsOpen(false);
      });
  }

  function submitPaypalInfo(event: FormEvent) {
    event.preventDefault();
    if (!paypalText.trim() || !paypalEmail || !paypalEmail.includes('@')) {
      return;
    }
    setSubmitting(true);
    console.log('Submitting new paypal info');
    const db = App.firestore();
    db.collection('cp')
      .doc(props.constructorPage.id)
      .update({
        pp: paypalEmail,
        pt: paypalText.trim(),
        m: true,
        t: ServerTimestamp,
      })
      .then(() => {
        console.log('Updated');
        setShowPaypalEditor(false);
        setSubmitting(false);
      });
  }

  function submitEdit(event: FormEvent) {
    event.preventDefault();
    const textToSubmit = bioText.trim();
    if (!textToSubmit) {
      return;
    }
    console.log('Submitting bio');
    const db = App.firestore();
    db.collection('cp')
      .doc(props.constructorPage.id)
      .update({ b: bioText, m: true, t: ServerTimestamp })
      .then(() => {
        console.log('Updated');
        setIsOpen(false);
      });
  }

  function submitSigEdit(event: FormEvent) {
    event.preventDefault();
    const textToSubmit = sigText.trim();
    if (!textToSubmit) {
      return;
    }
    console.log('Submitting sig');
    const db = App.firestore();
    db.collection('cp')
      .doc(props.constructorPage.id)
      .update({ sig: textToSubmit, m: true, t: ServerTimestamp })
      .then(() => {
        console.log('Updated');
        setIsSigOpen(false);
      });
  }

  return (
    <div
      css={{
        marginBottom: '1em',
        ['p:last-of-type']: {
          marginBottom: '0.25em',
        },
        '& h4': {
          marginTop: '1.5em',
        },
      }}
    >
      <h4>Bio</h4>
      {isOpen ? (
        <>
          <div
            css={{
              backgroundColor: 'var(--secondary)',
              borderRadius: '0.5em',
              padding: '1em',
              marginTop: '1em',
            }}
          >
            <h4>Live Preview:</h4>
            <Markdown text={bioText} />
          </div>
          <form css={{ margin: '1em 0' }} onSubmit={submitEdit}>
            <label css={{ width: '100%', margin: 0 }}>
              Enter new bio text:
              <textarea
                css={{ width: '100%', display: 'block', height: '5em' }}
                value={bioText}
                onChange={(e) =>
                  setBioText(e.target.value.substring(0, BIO_LENGTH_LIMIT))
                }
              />
            </label>
            <div
              css={{
                textAlign: 'right',
                color:
                  BIO_LENGTH_LIMIT - bioText.length > 10
                    ? 'var(--default-text)'
                    : 'var(--error)',
              }}
            >
              {bioText.length}/{BIO_LENGTH_LIMIT}
            </div>
            <Button
              type="submit"
              css={{ marginRight: '0.5em' }}
              disabled={bioText.trim().length === 0}
              text="Save"
            />
            <Button
              boring={true}
              css={{ marginRight: '0.5em' }}
              onClick={() => {
                setIsOpen(false);
              }}
              text="Cancel"
            />
          </form>
        </>
      ) : (
        <>
          <p>
            Your bio appears on the top of your blog page - use it to introduce
            yourself to solvers!
          </p>
          {props.constructorPage.b ? (
            <Button onClick={() => setIsOpen(true)} text="Edit bio" />
          ) : (
            <Button onClick={() => setIsOpen(true)} text="Add bio" />
          )}
        </>
      )}

      <h4>Pics</h4>
      <p>
        Your profile pic appears on your puzzle pages and your blog page. Your
        cover pic is a large photo that appears at the top of your blog page.
      </p>
      <Button
        css={{ marginRight: '1.5em' }}
        onClick={props.addProfilePic}
        text="Edit profile pic"
      />
      <Button onClick={props.addCoverPic} text="Edit cover pic" />

      <h4>Tips</h4>
      <p>
        A tip button appears on your puzzle pages and your blog page and is a
        way for solvers to give you a little cash to show their appreciation for
        your puzzles!
      </p>
      {props.constructorPage.pp && props.constructorPage.pt ? (
        <>
          <Button
            css={{ marginRight: '1.5em' }}
            onClick={() => setShowPaypalEditor(true)}
            text="Edit tip button"
          />
          <Button
            boring={true}
            onClick={deleteTipButton}
            text="Delete tip button"
          />
        </>
      ) : (
        <Button
          onClick={() => setShowPaypalEditor(true)}
          text="Add tip button"
        />
      )}

      <h4>Signature</h4>
      {isSigOpen ? (
        /* Todo share this w/ bio editor above */
        <>
          <div
            css={{
              backgroundColor: 'var(--secondary)',
              borderRadius: '0.5em',
              padding: '1em',
              marginTop: '1em',
            }}
          >
            <h4>Live Preview:</h4>
            <Markdown inline={true} text={sigText} />
          </div>
          <form css={{ margin: '1em 0' }} onSubmit={submitSigEdit}>
            <label css={{ width: '100%', margin: 0 }}>
              Enter new signature:
              <textarea
                css={{ width: '100%', display: 'block', height: '5em' }}
                value={sigText}
                onChange={(e) =>
                  setSigText(e.target.value.substring(0, SIG_LENGTH_LIMIT))
                }
              />
            </label>
            <div
              css={{
                textAlign: 'right',
                color:
                  SIG_LENGTH_LIMIT - sigText.length > 10
                    ? 'var(--default-text)'
                    : 'var(--error)',
              }}
            >
              {sigText.length}/{SIG_LENGTH_LIMIT}
            </div>
            <Button
              type="submit"
              css={{ marginRight: '0.5em' }}
              disabled={sigText.trim().length === 0}
              text="Save"
            />
            <Button
              boring={true}
              css={{ marginRight: '0.5em' }}
              onClick={() => {
                setIsSigOpen(false);
              }}
              text="Cancel"
            />
          </form>
        </>
      ) : (
        <>
          <p>
            A sig appears on each of your puzzle pages. You can use it to link
            to your social media accounts or give other important information
            about your puzzles.
          </p>
          {props.constructorPage.sig ? (
            <>
              <Button
                css={{ marginRight: '1.5em' }}
                onClick={() => setIsSigOpen(true)}
                text="Edit sig"
              />
              <Button boring={true} onClick={deleteSig} text="Delete sig" />
            </>
          ) : (
            <Button onClick={() => setIsSigOpen(true)} text="Add sig" />
          )}
        </>
      )}
      {showPaypalEditor ? (
        <Overlay closeCallback={() => setShowPaypalEditor(false)}>
          <form onSubmit={submitPaypalInfo}>
            <div>
              <label>
                <p>Paypal email address:</p>
                <input
                  type="text"
                  value={paypalEmail}
                  onChange={(e) => setPaypalEmail(e.target.value.trim())}
                />
              </label>
            </div>
            <div css={{ marginTop: '2em' }}>
              <label css={{ width: '100%' }}>
                <p>Message to show in paypal dialogue:</p>
                <input
                  css={{ width: '100%' }}
                  type="text"
                  value={paypalText}
                  onChange={(e) =>
                    setPaypalText(
                      e.target.value.substring(0, PAYPAL_LENGTH_LIMIT)
                    )
                  }
                />
                <div
                  css={{
                    textAlign: 'right',
                    color:
                      PAYPAL_LENGTH_LIMIT - paypalText.length > 10
                        ? 'var(--default-text)'
                        : 'var(--error)',
                  }}
                >
                  {paypalText.length}/{PAYPAL_LENGTH_LIMIT}
                </div>
              </label>
            </div>
            <Button type="submit" text="Save" disabled={submitting} />
          </form>
        </Overlay>
      ) : (
        ''
      )}
    </div>
  );
};

export interface ConstructorPageProps {
  constructor: ConstructorPageT;
  followCount: number;
  profilePicture: string | null;
  coverPicture: string | null;
  puzzles: Array<LinkablePuzzle>;
  nextPage: number | null;
  currentPage: number;
  prevPage: number | null;
}

export const ConstructorPage = (props: ConstructorPageProps) => {
  const { locale } = useRouter();
  const { isAdmin } = useContext(AuthContext);
  const coverPic = props.coverPicture;
  const profilePic = props.profilePicture;
  const username = props.constructor.i || props.constructor.id;
  const description =
    'The latest crossword puzzles from ' +
    props.constructor.n +
    ' (@' +
    username +
    '). ' +
    props.constructor.b;
  const title =
    props.constructor.n + ' (@' + username + ') | Crosshare Crossword Puzzles';
  const paypalEmail = props.constructor.pp;
  const paypalText = props.constructor.pt;
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
        <I18nTags locale={loc} canonicalPath={`/${username}${props.currentPage !== 0 ? '/page/' + props.currentPage : ''}`} />
        {props.prevPage === 0 ? (
          <link rel="prev" href={`https://crosshare.org${loc == 'en' ? '' : '/' + loc}/${username}`} />
        ) : (
          ''
        )}
        {props.prevPage ? (
          <link
            rel="prev"
            href={
              `https://crosshare.org${loc == 'en' ? '' : '/' + loc}/${username}/page/${props.prevPage}`
            }
          />
        ) : (
          ''
        )}
        {props.nextPage !== null ? (
          <link
            rel="next"
            href={
              `https://crosshare.org${loc == 'en' ? '' : '/' + loc}/${username}/page/${props.nextPage}`
            }
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
          topLine={props.constructor.n}
          byLine={
            <>
              <h2 css={{ fontSize: '1em', fontWeight: 'normal', marginBottom: '0.25em' }}>
                <Link href={'/' + username}>@{username}</Link>
              </h2>
              <p><Plural id="follower-count" value={props.followCount} one="1 Follower" other="# Followers" /></p>
            </>
          }
        />
        <div css={{ textAlign: 'center', marginBottom: '1.5em' }}>
          <FollowButton page={props.constructor} />
        </div>
        <div css={{ marginBottom: '1.5em' }}>
          <Markdown text={props.constructor.b} />
          {paypalEmail && paypalText ? (
            <div>
              <LinkButtonSimpleA
                css={{ marginRight: '0.5em' }}
                href={`https://www.paypal.com/cgi-bin/webscr?cmd=_donations&business=${encodeURIComponent(
                  paypalEmail
                )}&item_name=${encodeURIComponent(
                  paypalText
                )}&currency_code=USD&source=url`}
                text={t({ message: `Tip ${props.constructor.n}`, comment: 'The variable is the name of the user who will recieve the $ tip' })}
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
        {isAdmin ? <ConstructorStats userId={props.constructor.u} /> : ''}
      </div>
    </>
  );
};
