import { Trans } from '@lingui/react/macro';
import { FaCloudUploadAlt, FaHammer } from 'react-icons/fa';
import { Link } from '../components/Link.js';
import styles from './CreateShareSection.module.scss';

export function CreateShareSection(props: { halfWidth: boolean }) {
  return (
    <>
      <h2>
        <Trans>Create or Share a Puzzle</Trans>
      </h2>
      <div data-half-width={props.halfWidth} className={styles.wrapper}>
        <Link className={styles.button} href="/construct">
          <FaHammer className={styles.icon} />
          <div className="flex1">
            <Trans>
              <h4>Create a new puzzle</h4>
              <div className={styles.subtext}>
                Build a crossword puzzle with the Crosshare constructor
              </div>
            </Trans>
          </div>
        </Link>
        <Link className={styles.button} href="/upload">
          <FaCloudUploadAlt className={styles.icon} />
          <div className="flex1">
            <Trans>
              <h4>Upload a .puz file</h4>
              <div className={styles.subtext}>
                Get a Crosshare link to share with solvers
              </div>
            </Trans>
          </div>
        </Link>
      </div>
    </>
  );
}
