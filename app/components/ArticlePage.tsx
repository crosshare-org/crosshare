import type { Root } from 'hast';
import Head from 'next/head';
import { ArticleT } from '../lib/article.js';
import { ArticlePageProps } from '../lib/serverOnly.js';
import styles from './ArticlePage.module.css';
import { ContactLinks } from './ContactLinks.js';
import { Markdown } from './Markdown.js';
import { DefaultTopBar } from './TopBar.js';

export function ArticlePage(props: ArticlePageProps) {
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
      <div className={styles.page}>
        <Markdown className={styles.markdown} hast={props.hast} />
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
