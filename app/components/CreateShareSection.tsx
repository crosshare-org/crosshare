import { Link } from '../components/Link';
import { LARGE_AND_UP } from '../lib/style';

const createShareButtonCss = {
  display: 'inline-flex',
  alignItems: 'flex-start',
  width: '100%',
  [LARGE_AND_UP]: {
    width: '50%',
  },
  marginBottom: '1em',
};

export function CreateShareSection() {
  return (
    <>
      <h2>Create or Share a Puzzle</h2>
      <div>
        <Link css={createShareButtonCss} href="/construct">
          Construct a new puzzle with the Crosshare constructor
        </Link>
        <Link css={createShareButtonCss} href="/upload">
          Upload a .puz to get a Crosshare link to share with solvers
        </Link>
      </div>
    </>
  );
}
