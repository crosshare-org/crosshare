import Head from 'next/head';
import { useRef } from 'react';
import { useCollectionData } from 'react-firebase-hooks/firestore';
import { requiresAdmin } from '../../components/AuthHelpers.js';
import { Link } from '../../components/Link.js';
import { DefaultTopBar } from '../../components/TopBar.js';
import { ArticleT, ArticleV } from '../../lib/article.js';
import { getValidatedCollection } from '../../lib/firebaseWrapper.js';

const ArticleListItem = (props: ArticleT | null) => {
  if (!props) {
    return <li>Bad article in DB!</li>;
  }
  return (
    <li key={props.s}>
      <Link href={`/articles/${props.s}`}>{props.t}</Link> (
      <Link href={`/articles/${props.s}/edit`}>edit</Link>)
    </li>
  );
};

export default requiresAdmin(() => {
  const articleQuery = useRef(getValidatedCollection('a', ArticleV));
  const [articles] = useCollectionData(articleQuery.current);

  return (
    <>
      <Head>
        <title>{`Articles | Crosshare`}</title>
        <meta name="robots" content="noindex" />
      </Head>
      <DefaultTopBar />
      <div className="margin1em">
        <h4>All Articles:</h4>
        <ul>{articles?.map(ArticleListItem)}</ul>
      </div>
    </>
  );
});
