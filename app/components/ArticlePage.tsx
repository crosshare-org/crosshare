import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ArticlePageProps } from '../lib/serverOnly.js';
import styles from './ArticlePage.module.css';
import { Markdown } from './Markdown.js';
import { DefaultTopBar } from './TopBar.js';

export function ArticlePage(props: ArticlePageProps) {
  return <Article key={props.s} {...props} />;
}

function Article(props: ArticlePageProps) {
  const { locale } = useRouter();
  const loc = locale || 'en';

  const weeklySlug = props.s.match(/weekly-email-([0-9]+)/);
  let weeklyYear = new Date().getFullYear();
  if (weeklySlug && weeklySlug[1]) {
    weeklyYear = parseInt(weeklySlug[1]);
  }

  return (
    <>
      <Head>
        <title>{props.t}</title>
        <meta key="og:title" property="og:title" content={props.t} />
        <link
          rel="canonical"
          href={'https://crosshare.org/article/' + props.s}
        />
        {props.prevSlug ? (
          <link
            rel="prev"
            href={`https://crosshare.org${
              loc == 'en' ? '' : '/' + loc
            }/articles/${props.prevSlug}`}
          />
        ) : (
          ''
        )}
        {props.nextSlug ? (
          <link
            rel="next"
            href={`https://crosshare.org${
              loc == 'en' ? '' : '/' + loc
            }/articles/${props.nextSlug}`}
          />
        ) : (
          ''
        )}
      </Head>
      <DefaultTopBar />
      <div className={styles.page}>
        <Markdown className={styles.markdown} hast={props.hast} />
        {props.prevSlug || props.nextSlug ? (
          <p className="textAlignCenter paddingBottom1em">
            {props.prevSlug ? (
              <Link
                className={props.nextSlug ? "marginRight1em" : ""}
                href={'/articles/' + props.prevSlug}
              >
                Previous
              </Link>
            ) : (
              ''
            )}
            {props.nextSlug ? (
              <Link href={'/articles/' + props.nextSlug}>Next</Link>
            ) : (
              ''
            )}
            {/* It's not clear if only weekly emails have prevSlug and nextSlug.
              * They're the only articles where this link makes sense. Hmm */}
            <br/>
            <Link href={`/weekly/${weeklyYear}`}>More from {weeklyYear}</Link>
          </p>
        ) : (
          ''
        )}
      </div>
    </>
  );
}
