import { useRouter } from 'next/router';
import { useCallback } from 'react';
import { ConstructorPageBarebones } from '../lib/constructorPage.js';
import { logAsyncErrors } from '../lib/utils.js';
import styles from './ConstructorList.module.css';
import { FollowButton } from './FollowButton.js';
import { PatronIcon } from './Icons.js';

export const ConstructorList = ({
  pages,
  close,
}: {
  pages: (ConstructorPageBarebones & { isPatron: boolean })[];
  close: () => void;
}) => {
  return (
    <ul className={styles.followersList}>
      {pages.map((f) => (
        <ConstructorListItem key={f.i} page={f} close={close} />
      ))}
    </ul>
  );
};

const ConstructorListItem = ({
  page,
  close,
}: {
  page: ConstructorPageBarebones & { isPatron: boolean };
  close: () => void;
}) => {
  const router = useRouter();

  const click = useCallback(async () => {
    close();
    await router.push(`/${page.i}`);
  }, [page.i, router, close]);

  return (
    <li>
      <div
        tabIndex={0}
        role="button"
        onClick={logAsyncErrors(click)}
        onKeyDown={logAsyncErrors(click)}
        className={styles.follower}
      >
        <div className="marginRight1em">
          <div>
            <b className={styles.pageName}>
              {page.isPatron ? <PatronIcon /> : ''} {page.n}
            </b>
          </div>
          <div>@{page.i}</div>
        </div>
        <FollowButton className={styles.followBtn} page={page} />
      </div>
    </li>
  );
};
