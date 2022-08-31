import { where, query, updateDoc, Timestamp } from 'firebase/firestore';
import Head from 'next/head';
import NextJSRouter, { useRouter } from 'next/router';
import { useMemo } from 'react';
import { useCollection } from 'react-firebase-hooks/firestore';
import { requiresAdmin } from '../../../components/AuthContext';
import { EditableText } from '../../../components/EditableText';
import { ErrorPage } from '../../../components/ErrorPage';
import { useSnackbar } from '../../../components/Snackbar';
import { DefaultTopBar } from '../../../components/TopBar';
import { validate, ArticleT } from '../../../lib/article';
import { getCollection, getDocRef } from '../../../lib/firebaseWrapper';
import { slugify } from '../../../lib/utils';

export default requiresAdmin(() => {
  const router = useRouter();
  const { slug } = router.query;
  // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
  if (!slug) {
    return <div />;
  }
  if (Array.isArray(slug)) {
    return <ErrorPage title="Bad Article Id" />;
  }
  return <ArticleLoader key={slug} slug={slug} />;
});

const ArticleLoader = ({ slug }: { slug: string }) => {
  const [snapshot, loading, error] = useCollection(
    query(getCollection('a'), where('s', '==', slug))
  );
  const doc = useMemo(() => {
    return snapshot?.docs[0];
  }, [snapshot]);
  const article = useMemo(() => {
    return validate(doc?.data());
  }, [doc]);

  if (loading) {
    return <div>Loading...</div>;
  }
  if (error || !article || !doc) {
    return (
      <ErrorPage title="Something Went Wrong">
        <p>{error?.message || 'Missing / invalid article'}</p>
      </ErrorPage>
    );
  }
  return <ArticleEditor key={slug} article={article} articleId={doc.id} />;
};

const ArticleEditor = ({
  article,
  articleId,
}: {
  article: ArticleT;
  articleId: string;
}) => {
  const { showSnackbar } = useSnackbar();
  return (
    <>
      <Head>
        <title>Editing | {article.t} | Crosshare</title>
      </Head>
      <DefaultTopBar />
      <div css={{ margin: '1em' }}>
        <p>
          Note: changes may take up to an hour to appear on the site - we cache
          pages to keep Crosshare fast!
        </p>
        <h3>Slug</h3>
        <EditableText
          title="Slug"
          css={{ marginBottom: '1em' }}
          text={article.s}
          maxLength={100}
          handleSubmit={async (newSlug) => {
            const slug = slugify(newSlug, 100, true);
            updateDoc(getDocRef('a', articleId), {
              s: slug,
              ua: Timestamp.now(),
            }).then(() => {
              NextJSRouter.push(`/articles/${slug}/edit`);
            });
          }}
        />
        <h3>Title</h3>
        <EditableText
          title="Title"
          css={{ marginBottom: '1em' }}
          text={article.t}
          maxLength={300}
          handleSubmit={(newTitle) =>
            updateDoc(getDocRef('a', articleId), {
              t: newTitle,
              ua: Timestamp.now(),
            })
          }
        />
        <h3>Content</h3>
        <EditableText
          textarea={true}
          title="Content"
          css={{ marginBottom: '1em' }}
          text={article.c}
          maxLength={1000000}
          handleSubmit={(post) =>
            updateDoc(getDocRef('a', articleId), {
              c: post,
              ua: Timestamp.now(),
            })
          }
        />
        <h3>Featured</h3>
        <p>
          <label>
            <input
              css={{ marginRight: '1em' }}
              type="checkbox"
              checked={article.f}
              onChange={(e) => {
                updateDoc(getDocRef('a', articleId), {
                  f: e.target.checked,
                  ua: Timestamp.now(),
                }).then(() => {
                  showSnackbar('updated');
                });
              }}
            />{' '}
            Featured
          </label>
        </p>
      </div>
    </>
  );
};
