import Head from 'next/head';
import { useState, FormEvent } from 'react';

import { DefaultTopBar } from './TopBar';
import { ConstructorPageT } from '../lib/constructorPage';
import { PuzzleResult } from '../lib/types';
import { PuzzleResultLink } from './PuzzleLink';
import { Link } from './Link';
import { Markdown } from './Markdown';
import { AuthPropsOptional } from './AuthContext';
import { buttonAsLink } from '../lib/style';
import { App, ServerTimestamp } from '../lib/firebaseWrapper';

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
    db.collection('cp').doc(props.userId).update({ b: text, t: ServerTimestamp }).then(() => {
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
      {props.isAdmin ?
        <BioEditor text={props.constructor.b} userId={props.constructor.id} />
        :
        <Markdown text={props.constructor.b} />
      }
      {props.puzzles.map((p, i) => <PuzzleResultLink key={i} puzzle={p} showAuthor={false} />)}
      {props.hasMore ?
        <p css={{ textAlign: 'center' }}>
          <Link href='/[...slug]' as={'/' + username + '/' + props.puzzles[props.puzzles.length - 1].publishTime} passHref>More</Link>
        </p>
        : ''}
    </div>
  </>;
};
