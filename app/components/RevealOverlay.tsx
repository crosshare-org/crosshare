import { useContext, useEffect, useState } from 'react';
import { logAsyncErrors } from '../lib/utils.js';
import { AuthContext } from './AuthContext.js';
import { Overlay } from './Overlay.js';

interface RevealOverlayProps {
  puzzleId: string;
  displayName: string;
  close: () => void;
}
export const RevealOverlay = (props: RevealOverlayProps) => {
  const [solutions, setSolutions] = useState<string[] | null>(null);
  const [error, setError] = useState(false);
  const loading = solutions === null && !error;
  const { user } = useContext(AuthContext);

  useEffect(() => {
    let didCancel = false;
    async function getSolutions() {
      if (!user) {
        setError(true);
        return;
      }
      const token = await user.getIdToken();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const res = await (
        await fetch(
          `/api/reveal/${props.puzzleId}?displayName=${encodeURIComponent(props.displayName)}&token=${token}`,
          {
            method: 'POST',
          }
        )
      )
        .json()
        .catch((e: unknown) => {
          console.log(e);
          setError(true);
        });
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/strict-boolean-expressions
      if (!res.solutions) {
        setError(true);
        return;
      }
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      if (!didCancel && res) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
        setSolutions(res.solutions);
      }
    }
    logAsyncErrors(getSolutions)();
    return () => {
      didCancel = true;
    };
  }, [props.displayName, props.puzzleId, user]);

  return (
    <Overlay closeCallback={props.close}>
      {error ? 'Something went wrong, please try again' : ''}
      {loading ? 'Loading solutions...' : ''}
      {solutions?.length ? (
        <>
          {' '}
          {solutions.length === 1 ? (
            <p>
              The solution is: <strong>{solutions[0]}</strong>
            </p>
          ) : (
            <p>
              The solutions are:{' '}
              {solutions.map((s, i) => [
                i > 0 && ', ',
                <strong key={i}>{s}</strong>,
              ])}
            </p>
          )}
        </>
      ) : (
        ''
      )}
    </Overlay>
  );
};
