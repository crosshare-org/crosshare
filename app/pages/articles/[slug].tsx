import { ArticlePage } from '../../components/ArticlePage';
import { getArticlePageProps } from '../../lib/serverOnly';

export const getServerSideProps = getArticlePageProps;

export default ArticlePage;
