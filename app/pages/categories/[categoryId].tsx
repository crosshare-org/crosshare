import Error from 'next/error';
import { GetServerSideProps } from 'next';
import { isRight } from 'fp-ts/lib/Either';
import { PathReporter } from 'io-ts/lib/PathReporter';

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
  const db = App.firestore();
  const categoryId = context.params ?.categoryId;
  if (!categoryId || Array.isArray(categoryId)) {
    console.error('bad category param');
    return { props: { puzzles: null, categoryName: '' } };
  }
  if (!Object.prototype.hasOwnProperty.call(CategoryNames, categoryId)) {
    return { props: { puzzles: null, categoryName: '' } };
  }
  const dbres = await db.collection('categories').doc(categoryId).get();
  if (!dbres.exists) {
    return { props: { puzzles: null, categoryName: '' } };
  }
  const validationResult = CategoryIndexV.decode(dbres.data());
  if (isRight(validationResult)) {
    console.log('loaded category index from db');
    return { props: { puzzles: validationResult.right, categoryName: CategoryNames[categoryId] } };
  } else {
    console.error(PathReporter.report(validationResult).join(','));
    return { props: { puzzles: null, categoryName: '' } };
  }
};

export default function CategoryPage(props: CategoryPageProps) {
  if (props.puzzles === null) {
    return <Error statusCode={404} title="Invalid category" />;
  }
  return <Category puzzles={props.puzzles} categoryName={props.categoryName} />;
}
