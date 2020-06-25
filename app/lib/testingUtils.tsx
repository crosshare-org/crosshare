import { ReactElement, ComponentType } from 'react';
import { render, RenderOptions, RenderResult } from '@testing-library/react';

import { AuthContext } from '../components/AuthContext';

import type firebaseTypes from 'firebase';

export const getUser = (uid: string, isAnonymous: boolean) => {
  return { uid, isAnonymous } as firebaseTypes.User;
};

export const anonymousUser = getUser('anonymous-user-id', true);

const WithAllProviders: (opts: AuthOptions) => ComponentType = (opts: AuthOptions) => ({ children }) => {
  return (
    <AuthContext.Provider value={{ user: opts.user, isAdmin: opts.isAdmin || false, loadingUser: false, error: undefined }}>
      {children}
    </AuthContext.Provider>
  );
};

interface AuthOptions {
  user?: firebaseTypes.User,
  isAdmin?: boolean,
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
// re-export everything
export * from '@testing-library/react';

// override render method
export { wrappedRender as render };
