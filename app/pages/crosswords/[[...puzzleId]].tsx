import { PuzzlePage } from '../../components/PuzzlePage';
import { getPuzzlePageProps } from '../../lib/serverOnly';
import { withTranslation } from '../../lib/translation';

export const getServerSideProps = withTranslation(getPuzzlePageProps);

export default PuzzlePage;
