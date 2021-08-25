import Head from 'next/head';
import { useMemo } from 'react';
import { useCollection } from 'react-firebase-hooks/firestore';
import { requiresAdmin } from '../../components/AuthContext';
import { Button } from '../../components/Buttons';
import { Link } from '../../components/Link';
import { useSnackbar } from '../../components/Snackbar';
import { DefaultTopBar } from '../../components/TopBar';
import { ArticleT, validate } from '../../lib/article';
import { App, TimestampClass } from '../../lib/firebaseWrapper';

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
  const db = App.firestore();
  const [articlesSnapshot] = useCollection(db.collection('a'));
  const { showSnackbar } = useSnackbar();

  const articles: Array<ArticleT | null> = useMemo(() => {
    if (articlesSnapshot === undefined || articlesSnapshot.empty) {
      return [];
    }
    return articlesSnapshot.docs.map((a) => {
      return validate(a.data());
    });
  }, [articlesSnapshot]);

  return (
    <>
      <Head>
        <title>Articles | Crosshare</title>
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
            db.collection('a')
              .add({ ...newArticle, ua: TimestampClass.now() })
              .then(() => {
                showSnackbar('Article created');
              });
          }}
        />
        <h4>All Articles:</h4>
        <ul>{articles.map(ArticleListItem)}</ul>
      </div>
    </>
  );
});
