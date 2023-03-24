import type { Root } from 'hast';
import Head from 'next/head';
import { ArticleT } from '../lib/article';
import { ArticlePageProps } from '../lib/serverOnly';
import { HUGE_AND_UP, MAX_WIDTH } from '../lib/style';
import { ContactLinks } from './ContactLinks';
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

function Article(props: ArticleT & { hast: Root }) {
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
      <div
        css={{
          margin: '2em 1em',
          [HUGE_AND_UP]: {
            maxWidth: MAX_WIDTH,
            margin: '2em auto',
          },
        }}
      >
        <Markdown
          css={{ marginBottom: '2em', '& h2': { marginTop: '1em' } }}
          hast={props.hast}
        />
        <p>
          This article is part of a series of posts designed to teach visitors
          about crosswords in general as well as some Crosshare specific
          features. If you have any questions or suggestions for this or other
          articles please contact us via <ContactLinks />.
        </p>
        <p>
          We&apos;re seeking volunteers to help expand and edit this
          knowledgebase so it becomes more useful for constructors and solvers.
          If you&apos;re interested please reach out!
        </p>
      </div>
    </>
  );
}
