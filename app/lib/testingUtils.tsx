import { ReactElement, ComponentType } from 'react';
import { render, RenderOptions, RenderResult } from '@testing-library/react';
import { matchers, createSerializer } from 'jest-emotion';

import { AuthContext } from '../components/AuthContext';

import type firebaseTypes from 'firebase';

// Add the custom matchers provided by 'jest-emotion'
expect.extend(matchers);
expect.addSnapshotSerializer(createSerializer());

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
