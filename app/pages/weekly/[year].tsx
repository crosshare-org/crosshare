import { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { DefaultTopBar } from '../../components/TopBar.js';
import { ArticleT } from '../../lib/article.js';
import { getWeeklyEmailsFromYear } from '../../lib/serverOnly';
import { withTranslation } from '../../lib/translation.js';

interface YearsEmailProps {
  articles: ArticleT[];
  year: string;
}

const gssp: GetServerSideProps<YearsEmailProps> = async ({ res, params }) => {
  // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
  if (!params?.year || Array.isArray(params.year)) {
    return { notFound: true };
  }

  let articles: ArticleT[] = [];

  const yearStr = params.year;
  try {
    const year = parseInt(params.year);
    const articlesFromYear = await getWeeklyEmailsFromYear(year);
    if (Array.isArray(articlesFromYear)) {
      articles = articlesFromYear;
    }
  } catch {
    return { notFound: true };
  }

  res.setHeader('Cache-Control', 'public, max-age=1800, s-maxage=3600');

  return {
    props: { articles, year: yearStr },
  };
};

export const getServerSideProps = withTranslation(gssp);

export default function WeeklyEmails(props: YearsEmailProps) {
  const articleList = [];
  for (const article of props.articles) {
    const published = /weekly-email-([0-9]+)-([0-9]+)-([0-9]+)/.exec(article.s);
    if (!published?.[1] || !published[2] || !published[3]) {
      console.error(
        "Weekly article slug didn't follow expected format",
        article.s
      );
      continue;
    }

    const creationDate = new Date(
      parseInt(published[1]),
      parseInt(published[2]) - 1, // JS months are 0-indexed
      parseInt(published[3])
    );
    const creation = creationDate.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    articleList.push(
      <li key={creationDate.getTime()}>
        <Link href={`/articles/${article.s}`}>
          {creation}: {article.t}
        </Link>
      </li>
    );
  }

  const year = parseInt(props.year);
  const thisYear = new Date().getFullYear();
  const lastYear = year - 1;
  const nextYear = year + 1;

  return (
    <>
      <Head>
        <title>{'Weekly emails | Crosshare'}</title>
        <meta name="robots" content="noindex" />
      </Head>
      <DefaultTopBar />
      <div className="margin1em">
        <h4>Weekly emails from {props.year}</h4>
        <ul>{articleList}</ul>
      </div>
      <div className="textAlignCenter paddingBottom1em">
        <Link href={`/weekly/${lastYear}`}>← {lastYear}</Link>
        {year < thisYear ? (
          <>
            {' '}
            {year} <Link href={`/weekly/${nextYear}`}>{nextYear} →</Link>
          </>
        ) : (
          ''
        )}
      </div>
    </>
  );
}
