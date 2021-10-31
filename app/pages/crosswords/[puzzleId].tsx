import { getPuzzlePageProps } from '../../lib/serverOnly';
import { PuzzlePage } from '../../components/PuzzlePage';
import { withTranslation } from '../../lib/utils';

export const getServerSideProps = withTranslation(getPuzzlePageProps);

export default PuzzlePage;
