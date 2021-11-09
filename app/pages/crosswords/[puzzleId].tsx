import { getPuzzlePageProps } from '../../lib/serverOnly';
import { PuzzlePage } from '../../components/PuzzlePage';
import { withTranslation } from '../../lib/translation';

export const getServerSideProps = withTranslation(getPuzzlePageProps);

export default PuzzlePage;
