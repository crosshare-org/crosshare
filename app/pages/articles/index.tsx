import { addDoc, Timestamp } from 'firebase/firestore';
import Head from 'next/head';
import { useRef } from 'react';
import { useCollectionData } from 'react-firebase-hooks/firestore';
import { requiresAdmin } from '../../components/AuthContext';
import { Button } from '../../components/Buttons';
import { Link } from '../../components/Link';
import { useSnackbar } from '../../components/Snackbar';
import { DefaultTopBar } from '../../components/TopBar';
import { ArticleT, ArticleV } from '../../lib/article';
import { getCollection, getValidatedCollection } from '../../lib/firebaseWrapper';

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
      <div css={{ margin: '1em' }}>
        <Button
          css={{ marginBottom: '2em' }}
          text="New Article"
          onClick={() => {
            const newArticle: ArticleT = {
              s: `new-article-${Math.round(Math.random() * 10000)}`,
              t: 'New Article',
              c: 'article content',
              f: false,
            };
            addDoc(getCollection('a'), {
              ...newArticle,
              ua: Timestamp.now(),
            }).then(() => {
              showSnackbar('Article created');
            });
          }}
        />
        <h4>All Articles:</h4>
        <ul>{articles?.map(ArticleListItem)}</ul>
      </div>
    </>
  );
});
