import { PuzzlePage } from '../../components/PuzzlePage.js';
import { getPuzzlePageProps } from '../../lib/serverOnly.js';
import { withTranslation } from '../../lib/translation.js';

export const getServerSideProps = withTranslation(getPuzzlePageProps);

export default PuzzlePage;
