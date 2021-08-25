import Head from 'next/head';
import { ArticleT } from '../lib/article';
import { ArticlePageProps } from '../lib/serverOnly';
import { HUGE_AND_UP, MAX_WIDTH } from '../lib/style';
import { ErrorPage } from './ErrorPage';
import { Link } from './Link';
import { Markdown } from './Markdown';
import { DefaultTopBar } from './TopBar';

export function ArticlePage(props: ArticlePageProps) {
  if ('error' in props) {
    return (
      <ErrorPage title="Article Not Found">
        <p>
          We&apos;re sorry, we couldn&apos;t find the article you requested.
        </p>
        <p>{props.error}</p>
        <p>
          Try the <Link href="/">homepage</Link>.
        </p>
      </ErrorPage>
    );
  }
  return <Article key={props.s} {...props} />;
}

function Article(props: ArticleT) {
  return (
    <>
      <Head>
        <title>{props.t}</title>
        <meta key="og:title" property="og:title" content={props.t} />
        <link
          rel="canonical"
          href={'https://crosshare.org/article/' + props.s}
        />
      </Head>
      <DefaultTopBar />
      <Markdown
        text={props.c}
        css={{
          margin: '2em 1em',
          [HUGE_AND_UP]: {
            maxWidth: MAX_WIDTH,
            margin: '2em auto',
          },
        }}
      />
    </>
  );
}
