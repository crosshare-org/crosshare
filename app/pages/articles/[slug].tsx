import { ArticlePage } from '../../components/ArticlePage';
import { getArticlePageProps } from '../../lib/serverOnly';
import { withTranslation } from '../../lib/translation';

export const getServerSideProps = withTranslation(getArticlePageProps);

export default ArticlePage;
