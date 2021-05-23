import { FaCloudUploadAlt, FaHammer } from 'react-icons/fa';
import { Link } from '../components/Link';
import { LARGE_AND_UP } from '../lib/style';

const createShareButtonCss = {
  width: '100%',
  [LARGE_AND_UP]: {
    width: '48%',
  },
  padding: '1em',
  display: 'flex',
  alignItems: 'flex-start',
  marginBottom: '1em',
  backgroundColor: 'var(--link-light-bg)',
  '&:hover': {
    backgroundColor: 'var(--link-light-bg-hover)',
  },
  borderRadius: '0.5em',
};

export function CreateShareSection() {
  return (
    <>
      <h2>Create or Share a Puzzle</h2>
      <div
        css={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexDirection: 'column',
          [LARGE_AND_UP]: {
            flexDirection: 'row',
          },
        }}
      >
        <Link css={createShareButtonCss} href="/construct">
          <FaHammer
            css={{ alignSelf: 'center', marginRight: '0.5em', fontSize: '2em' }}
          />
          <div css={{ flex: 1 }}>
            <h4>Create a new puzzle</h4>
            <p
              css={{
                color: 'var(--text)',
                display: 'inline-block',
                textDecoration: 'none !important',
              }}
            >
              Build a crossword puzzle with the Crosshare constructor
            </p>
          </div>
        </Link>
        <Link css={createShareButtonCss} href="/upload">
          <FaCloudUploadAlt
            css={{ alignSelf: 'center', marginRight: '0.5em', fontSize: '2em' }}
          />
          <div css={{ flex: 1 }}>
            <h4>Upload a .puz file</h4>
            <p
              css={{
                color: 'var(--text)',
                display: 'inline-block',
                textDecoration: 'none !important',
              }}
            >
              Get a Crosshare link to share with solvers
            </p>
          </div>
        </Link>
      </div>
    </>
  );
}
