import { Timestamp, addDoc } from 'firebase/firestore';
import Head from 'next/head';
import { useRef } from 'react';
import { useCollectionData } from 'react-firebase-hooks/firestore';
import { requiresAdmin } from '../../components/AuthHelpers.js';
import { Button } from '../../components/Buttons.js';
import { Link } from '../../components/Link.js';
import { useSnackbar } from '../../components/Snackbar.js';
import { DefaultTopBar } from '../../components/TopBar.js';
import { ArticleT, ArticleV } from '../../lib/article.js';
import {
  getCollection,
  getValidatedCollection,
} from '../../lib/firebaseWrapper.js';
import { logAsyncErrors } from '../../lib/utils.js';

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
  const { showSnackbar } = useSnackbar();

  return (
    <>
      <Head>
        <title>{`Articles | Crosshare`}</title>
        <meta name="robots" content="noindex" />
      </Head>
      <DefaultTopBar />
      <div className="margin1em">
        <Button
          className="marginBottom2em"
          text="New Article"
          onClick={logAsyncErrors(async () => {
            const newArticle: ArticleT = {
              s: `new-article-${Math.round(Math.random() * 10000)}`,
              t: 'New Article',
              c: 'article content',
              f: false,
            };
            await addDoc(getCollection('a'), {
              ...newArticle,
              ua: Timestamp.now(),
            }).then(() => {
              showSnackbar('Article created');
            });
          })}
        />
        <h4>All Articles:</h4>
        <ul>{articles?.map(ArticleListItem)}</ul>
      </div>
    </>
  );
});
