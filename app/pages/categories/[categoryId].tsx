import Head from 'next/head';
import { GetServerSideProps } from 'next';
import { isRight } from 'fp-ts/lib/Either';
import { PathReporter } from 'io-ts/lib/PathReporter';

import { Link } from '../../components/Link';
import { ErrorPage } from '../../components/ErrorPage';
import { App } from '../../lib/firebaseWrapper';
import { Category } from '../../components/Category';
import { CategoryIndexT, CategoryIndexV } from '../../lib/dbtypes';

const CategoryNames: { [key: string]: string } = {
  dailymini: 'Daily Mini'
};

interface CategoryPageProps {
  puzzles: CategoryIndexT | null,
  categoryName: string,
}

export const getServerSideProps: GetServerSideProps<CategoryPageProps> = async (context) => {
  const categoryId = context.params ?.categoryId;
  if (!categoryId || Array.isArray(categoryId)) {
    console.error('bad category param');
    return { props: { puzzles: null, categoryName: '' } };
  }
  return { props: await propsForCategoryId(categoryId) };
};

// We export this so we can use it for testing
export async function propsForCategoryId(categoryId: string): Promise<CategoryPageProps> {
  const db = App.firestore();
  if (!Object.prototype.hasOwnProperty.call(CategoryNames, categoryId)) {
    return { puzzles: null, categoryName: '' };
  }
  const dbres = await db.collection('categories').doc(categoryId).get();
  if (!dbres.exists) {
    return { puzzles: null, categoryName: '' };
  }
  const validationResult = CategoryIndexV.decode(dbres.data());
  if (isRight(validationResult)) {
    console.log('loaded category index from db');
    return { puzzles: validationResult.right, categoryName: CategoryNames[categoryId] };
  } else {
    console.error(PathReporter.report(validationResult).join(','));
    return { puzzles: null, categoryName: '' };
  }
}

export default function CategoryPage(props: CategoryPageProps) {
  if (props.puzzles === null) {
    return <ErrorPage title='Category Not Found'>
      <p>We&apos;re sorry, we couldn&apos;t find the category page you requested.</p>
      <p>Try the <Link href="/" passHref>homepage</Link>.</p>
    </ErrorPage>;
  }
  return <>
    <Head>
      <title>{props.categoryName} Puzzles | Crosshare crosswords</title>
    </Head>
    <Category puzzles={props.puzzles} categoryName={props.categoryName} />
  </>;
}
