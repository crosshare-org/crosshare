import { ArticlePage } from '../../components/ArticlePage.js';
import { getArticlePageProps } from '../../lib/serverOnly.js';
import { withTranslation } from '../../lib/translation.js';

export const getServerSideProps = withTranslation(getArticlePageProps);

export default ArticlePage;
