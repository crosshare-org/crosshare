import { ReactElement, ComponentType } from 'react';
import { render, RenderOptions, RenderResult } from '@testing-library/react';

import { AuthContext } from '../components/AuthContext';

import type firebaseTypes from 'firebase';

export const anonymousUser = {
  uid: 'anonymous-user-id',
  isAnonymous: true
} as firebaseTypes.User;

const WithAllProviders: ComponentType = ({ children }) => {
  return (
    <AuthContext.Provider value={{ user: anonymousUser, isAdmin: false, loadingUser: false, error: undefined }}>
      {children}
    </AuthContext.Provider>
  )
}

function wrappedRender(
  ui: ReactElement,
  options?: RenderOptions
): RenderResult {

  return render(ui, {
    wrapper: WithAllProviders,
    ...options,
  });
}
// re-export everything
export * from '@testing-library/react';

// override render method
export { wrappedRender as render };
