import { ReactElement, ComponentType } from 'react';
import { render, RenderOptions, RenderResult } from '@testing-library/react';

import { AuthContext } from '../components/AuthContext';
import { SnackbarProvider } from '../components/Snackbar';

import type firebaseTypes from 'firebase';
import { GetServerSidePropsResult } from 'next';
import { I18nProvider } from '@lingui/react';
import { i18n } from '@lingui/core';

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
) => ComponentType =
  (opts: AuthOptions, includeSnackbar?: boolean) =>
    ({ children }) => {
      return (
        <I18nProvider i18n={i18n} forceRenderOnLocaleChange={false}>
          <AuthContext.Provider
            value={{
              user: undefined,
              isAdmin: false,
              loading: false,
              error: undefined,
              ...opts,
            }}
          >
            {includeSnackbar ? (
              <SnackbarProvider>{children}</SnackbarProvider>
            ) : (
              children
            )}
          </AuthContext.Provider>
        </I18nProvider>
      );
    };

interface AuthOptions {
  user?: firebaseTypes.User;
  isAdmin?: boolean;
  displayName?: string;
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
