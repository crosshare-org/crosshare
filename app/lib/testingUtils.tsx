import { ReactElement, ComponentType } from 'react';
import { render, RenderOptions, RenderResult } from '@testing-library/react';

import { AuthContext } from '../components/AuthContext';
import { SnackbarProvider } from '../components/Snackbar';

import type firebaseTypes from 'firebase';
import { GetServerSidePropsResult } from 'next';

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

function hasOwnProperty<
  X extends Record<string, unknown>,
  Y extends PropertyKey
>(obj: X, prop: Y): obj is X & Record<Y, unknown> {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

export function getProps<T>(a: GetServerSidePropsResult<T>) {
  if (!hasOwnProperty(a, 'props')) {
    throw new Error('should have props');
  }
  return a.props;
}
