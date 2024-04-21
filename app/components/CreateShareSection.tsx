import { FaCloudUploadAlt, FaHammer } from 'react-icons/fa';
import { Link } from '../components/Link';
import { LARGE_AND_UP, SMALL_AND_UP } from '../lib/style';
import { Trans } from '@lingui/macro';

const getCreateShareButtonCss = (halfWidth: boolean) => ({
  width: '100%',
  [halfWidth ? LARGE_AND_UP : SMALL_AND_UP]: {
    width: 'calc(50% - 0.5em)',
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
});

export function CreateShareSection(props: { halfWidth: boolean }) {
  const createShareButtonCss = getCreateShareButtonCss(props.halfWidth);

  return (
    <>
      <h2>
        <Trans>Create or Share a Puzzle</Trans>
      </h2>
      <div
        css={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexDirection: 'column',
          [props.halfWidth ? LARGE_AND_UP : SMALL_AND_UP]: {
            flexDirection: 'row',
          },
        }}
      >
        <Link css={createShareButtonCss} href="/construct">
          <FaHammer
            css={{ alignSelf: 'center', marginRight: '0.5em', fontSize: '2em' }}
          />
          <div className="flex1">
            <Trans>
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
            </Trans>
          </div>
        </Link>
        <Link css={createShareButtonCss} href="/upload">
          <FaCloudUploadAlt
            css={{ alignSelf: 'center', marginRight: '0.5em', fontSize: '2em' }}
          />
          <div className="flex1">
            <Trans>
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
            </Trans>
          </div>
        </Link>
      </div>
    </>
  );
}
