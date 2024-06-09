import { signOut } from 'firebase/auth';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { AuthProps, requiresAuth } from '../../../components/AuthHelpers';
import { Button, ButtonAsLink } from '../../../components/Buttons';
import { ErrorPage } from '../../../components/ErrorPage';
import { DefaultTopBar } from '../../../components/TopBar';
import { getAuth } from '../../../lib/firebaseWrapper';
import { logAsyncErrors } from '../../../lib/utils';

export default requiresAuth(({ user, prefs }: AuthProps) => {
  const router = useRouter();
  const { packId, code } = router.query;

  // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
  if (!packId || Array.isArray(packId)) {
    return <ErrorPage title="Bad Pack Id" />;
  }

  // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
  if (!code || Array.isArray(code)) {
    return <ErrorPage title="Bad Code" />;
  }

  const checkedPackId = packId;

  useEffect(() => {
    async function redirect() {
      await router.push(`/packs/${checkedPackId}`);
    }
    if (prefs?.packs?.includes(checkedPackId)) {
      void redirect();
    }
  }, [router, user, prefs, checkedPackId]);

  const [adding, setAdding] = useState(false);

  return (
    <>
      <Head>
        <title>{`Add Pack | Crosshare`}</title>
        <meta name="robots" content="noindex" />
      </Head>
      <DefaultTopBar />
      <div className="margin1em">
        <h1>Add Pack</h1>
        <p>You&apos;ve been authorized to access a pack!</p>
        <p>
          Click the button below to add the pack to the Crosshare account for{' '}
          <b>{user.email}</b>. This link is single-use: once you add the pack to
          an account you cannot use it again for a different account. Click{' '}
          <ButtonAsLink
            onClick={logAsyncErrors(async () => signOut(getAuth()))}
            text="here"
          />{' '}
          and then sign in to switch to a different account.
        </p>
        <p>
          <Button
            disabled={adding}
            onClick={logAsyncErrors(async () => {
              setAdding(true);
              const token = await user.getIdToken();
              return fetch(
                `/api/addpack?packId=${packId}&code=${code}&token=${token}`,
                {
                  method: 'POST',
                  redirect: 'manual',
                }
              ).then((f) => {
                console.log(f);
                console.log('added pack');
              });
            })}
            text="Add Pack"
          />
        </p>
      </div>
    </>
  );
});
