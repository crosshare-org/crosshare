import { ReactElement, ComponentType } from 'react';
import { render, RenderOptions, RenderResult } from '@testing-library/react';

import { AuthContext } from '../components/AuthContext';
import { SnackbarProvider } from '../components/Snackbar';
import { AdminTimestamp } from '../lib/firebaseWrapper';

import type firebaseTypes from 'firebase';
import { DBPuzzleT } from './dbtypes';

export const getUser = (uid: string, isAnonymous: boolean) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const u = { uid, isAnonymous } as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  u.updateProfile = (_profile: { displayName?: string }) => {
    u.displayName = _profile.displayName;
    return Promise.resolve();
  };
  return u as firebaseTypes.User;
};

export const anonymousUser = getUser('anonymous-user-id', true);

const WithAllProviders: (
  opts: AuthOptions,
  includeSnackbar?: boolean
) => ComponentType = (opts: AuthOptions, includeSnackbar?: boolean) => ({
  children,
}) => {
  return (
    <AuthContext.Provider
      value={{
        user: opts.user,
        isAdmin: opts.isAdmin || false,
        loading: false,
        error: undefined,
      }}
    >
      {includeSnackbar ? (
        <SnackbarProvider>{children}</SnackbarProvider>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};

interface AuthOptions {
  user?: firebaseTypes.User;
  isAdmin?: boolean;
}

export function getMockedPuzzle(
  fields?: Partial<DBPuzzleT>,
  timestampClass?: typeof AdminTimestamp
): DBPuzzleT {
  return {
    ...{
      c: null,
      m: false,
      t: 'Raises, as young',
      dn: [1, 2, 3, 4, 5],
      ac: [
        ' Cobbler\'s forms',
        'Absolutely perfect',
        'Spike Lee\'s "She\'s ___ Have It"',
        'English class assignment',
        'Raises, as young',
      ],
      dc: [
        'Hybrid whose father is a lion',
        '___ of reality (wake-up call)',
        '___ date (makes wedding plans)',
        'Middle Ages invader',
        'Has a great night at the comedy club',
      ],
      p: (timestampClass || AdminTimestamp).now(),
      a: 'fSEwJorvqOMK5UhNMHa4mu48izl1',
      an: [1, 6, 7, 8, 9],
      g: [
        'L',
        'A',
        'S',
        'T',
        'S',
        'I',
        'D',
        'E',
        'A',
        'L',
        'G',
        'O',
        'T',
        'T',
        'A',
        'E',
        'S',
        'S',
        'A',
        'Y',
        'R',
        'E',
        'A',
        'R',
        'S',
      ],
      h: 5,
      w: 5,
      cs: [
        {
          c:
            'A couple of two-worders today which I don\'t love, but I hope you all got it anyway!',
          i: 'LwgoVx0BAskM4wVJyoLj',
          t: 36.009,
          p: (timestampClass || AdminTimestamp).now(),
          a: 'fSEwJorvqOMK5UhNMHa4mu48izl1',
          n: 'Mike D',
          ch: false,
        },
      ],
      n: 'Mike D',
    },
    ...fields,
  };
}

function wrappedRender(
  ui: ReactElement,
  auth: AuthOptions,
  options?: RenderOptions
): RenderResult {
  return render(ui, {
    wrapper: WithAllProviders(auth),
    ...options,
  });
}

export function renderWithSnackbar(
  ui: ReactElement,
  auth: AuthOptions,
  options?: RenderOptions
): RenderResult {
  return render(ui, {
    wrapper: WithAllProviders(auth, true),
    ...options,
  });
}

// re-export everything
export * from '@testing-library/react';

// override render method
export { wrappedRender as render };
