import Head from 'next/head';
import { useState, FormEvent, useContext } from 'react';

import { DefaultTopBar } from './TopBar';
import { ConstructorPageT } from '../lib/constructorPage';
import { PuzzleResult } from '../lib/types';
import { PuzzleResultLink } from './PuzzleLink';
import { Link } from './Link';
import { Markdown } from './Markdown';
import { AuthPropsOptional, AuthContext } from './AuthContext';
import { buttonAsLink } from '../lib/style';
import { App, ServerTimestamp } from '../lib/firebaseWrapper';


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
  help: 1
};

export const CreatePageForm = () => {
  const ctx = useContext(AuthContext);
  const [username, setUsername] = useState('');
  const [showError, setShowError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function sanitize(input: string): string {
    const res = input.match(/^([a-zA-Z]\w*)/);
    if (res) {
      return res[0];
    }
    return '';
  }

  function isInvalid(u: string) {
    if (u.length < 3 || u.length > 20) {
      return true;
    }
    return false;
  }

  function createPage(event: FormEvent) {
    event.preventDefault();
    const user = ctx.user;
    if (!user) {
      return;
    }
    const lower = username.toLowerCase();
    if (lower.includes('admin') || lower.includes('crosshare') ||
      Object.prototype.hasOwnProperty.call(BANNED_USERNAMES, lower)) {
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
      t: ServerTimestamp
    };
    App.firestore().collection('cp').doc(lower).set(cp)
      .catch((e) => {
        console.log(e);
        setShowError(true);
      })
      .finally(() => {
        setSubmitting(false);
      });
  }

  return <>
    <form onSubmit={createPage}>
      <label css={{ width: '100%', margin: 0 }}>
        <p>Create a constructor blog to keep all of your puzzles on one page.</p>
        <p>Your blog&apos;s url (choose carefully, you can&apos;t change this later):</p>
        <p><span css={{ fontWeight: 'bold', marginRight: '0.15em' }}>https://crosshare.org/</span><input type='text' value={username} placeholder='username' onChange={e => { setShowError(false); setUsername(sanitize(e.target.value)); }} /></p>
      </label>
      <p>
        <input type="submit" disabled={isInvalid(username) || submitting} value="Create" />
        {showError ?
          <span css={{ color: 'var(--error)', marginLeft: '1em' }}>That username is unavailable. Please try something different.</span>
          : ''
        }
      </p>
    </form>
  </>;
};

interface BioEditorProps {
  text: string,
  userId: string
}

const BIO_LENGTH_LIMIT = 1500;

const BioEditor = (props: BioEditorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [text, setText] = useState(props.text);

  if (!isOpen) {
    return <div css={{
      marginBottom: '1em',
      ['p:last-of-type']: {
        marginBottom: '0.25em',
      }
    }} >
      <Markdown text={text} />
      <button css={buttonAsLink} onClick={() => setIsOpen(true)}>edit bio</button>
    </div>;
  }

  function submitEdit(event: FormEvent) {
    event.preventDefault();
    const textToSubmit = text.trim();
    if (!textToSubmit) {
      return;
    }
    console.log('Submitting bio');
    const db = App.firestore();
    db.collection('cp').doc(props.userId).update({ b: text, m: true, t: ServerTimestamp }).then(() => {
      console.log('Updated');
      setIsOpen(false);
    });
  }

  function sanitize(input: string) {
    return input.substring(0, BIO_LENGTH_LIMIT);
  }

  return <>
    <Markdown text={text} />
    <form css={{ marginBottom: '1em' }} onSubmit={submitEdit}>
      <label css={{ width: '100%', margin: 0 }}>
        Enter new bio text:
        <textarea css={{ width: '100%', display: 'block', height: '5em' }} value={text} onChange={e => setText(sanitize(e.target.value))} />
      </label>
      <div css={{
        textAlign: 'right',
        color: (BIO_LENGTH_LIMIT - text.length) > 10 ? 'var(--default-text)' : 'var(--error)',
      }}>{text.length}/{BIO_LENGTH_LIMIT}</div>
      <input css={{ marginRight: '0.5em', }} type="submit" disabled={text.trim().length === 0} value="Save" />
      <button type="button" css={{ marginRight: '0.5em' }} onClick={() => { setText(props.text); setIsOpen(false); }}>Cancel</button>
    </form>
  </>;
};

export interface ConstructorPageProps {
  constructor: ConstructorPageT,
  puzzles: Array<PuzzleResult>,
  hasMore: boolean,
  currentIndex: number | null,
}

export const ConstructorPage = (props: ConstructorPageProps & AuthPropsOptional) => {
  const username = props.constructor.i || props.constructor.id;
  const description = 'The latest crossword puzzles from ' + props.constructor.n + ' (@' + username + '). ' + props.constructor.b;
  const title = props.constructor.n + ' (@' + username + ') | Crosshare Crossword Puzzles';
  return <>
    <Head>
      <title>{title}</title>
      <meta key="og:title" property="og:title" content={title} />
      <meta key="og:description" property="og:description" content={description} />
      <meta key="description" name="description" content={description} />
      <link rel="canonical" href={'https://crosshare.org/' + username + (props.currentIndex !== null ? '/' + props.currentIndex : '')} />
      {props.hasMore ?
        <link rel='next' href={'https://crosshare.org/' + username + '/' + props.puzzles[props.puzzles.length - 1].publishTime} />
        : ''}
    </Head>
    <DefaultTopBar />
    <div css={{
      margin: '1em',
    }}>
      <h2 css={{ marginBottom: 0 }}>{props.constructor.n}</h2>
      <h4><Link href='/[...slug]' as={'/' + username} passHref>@{username}</Link></h4>
      <div css={{ marginBottom: '1.5em' }}>
        {props.user ?.uid === props.constructor.u ?
          <BioEditor text={props.constructor.b} userId={props.constructor.id} />
          :
          <Markdown text={props.constructor.b} />
        }
      </div>
      {props.puzzles.map((p, i) => <PuzzleResultLink key={i} puzzle={p} showAuthor={false} />)}
      {props.hasMore ?
        <p css={{ textAlign: 'center' }}>
          <Link href='/[...slug]' as={'/' + username + '/' + props.puzzles[props.puzzles.length - 1].publishTime} passHref>More</Link>
        </p>
        : ''}
    </div>
  </>;
};
