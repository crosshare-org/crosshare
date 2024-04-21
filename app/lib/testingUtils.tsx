import { i18n } from '@lingui/core';
import { I18nProvider } from '@lingui/react';
import { RenderOptions, RenderResult, render } from '@testing-library/react';
import type { User } from 'firebase/auth';
import { GetServerSidePropsResult } from 'next';
import { ComponentType, ReactElement, ReactNode } from 'react';
import { AuthContext } from '../components/AuthContext';
import { SnackbarProvider } from '../components/Snackbar';
import { messages as messagesEn } from '../locales/en/messages';
import { hasOwnProperty } from './types';

export const getUser = (uid: string, isAnonymous: boolean) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
  const u = { uid, isAnonymous } as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
  u.updateProfile = (_profile: { displayName?: string }) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    u.displayName = _profile.displayName;
    return Promise.resolve();
  };
  return u as User;
};

export const anonymousUser = getUser('anonymous-user-id', true);

i18n.load({
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  en: messagesEn,
});
i18n.activate('en');

const WithAllProviders: (
  opts: AuthOptions,
  includeSnackbar?: boolean
) => ComponentType = (opts: AuthOptions, includeSnackbar?: boolean) =>
  function WithAllProviders({ children }: { children?: ReactNode }) {
    return (
      <I18nProvider i18n={i18n}>
        <AuthContext.Provider
          value={{
            user: undefined,
            isAdmin: false,
            isPatron: false,
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
  user?: User;
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
// eslint-disable-next-line import/export
export * from '@testing-library/react';

// override render method
// eslint-disable-next-line import/export
export { wrappedRender as render };

export async function getProps<T>(a: GetServerSidePropsResult<T>) {
  if (!hasOwnProperty(a, 'props')) {
    throw new Error('should have props');
  }
  return await Promise.resolve(a.props);
}
