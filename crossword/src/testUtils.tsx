import * as React from 'react';
import { render, RenderOptions, RenderResult } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { matchers, createSerializer } from 'jest-emotion';

import { AuthContext } from './App';

import type firebaseTypes from 'firebase';
import * as firebase from '@firebase/testing';
import { initFirebase } from './firebase';

// Add the custom matchers provided by 'jest-emotion'
expect.extend(matchers);
expect.addSnapshotSerializer(createSerializer());

const anonymousUser = {
  uid: 'anonymous-user-id',
  isAnonymous: true
} as firebaseTypes.User;

const WithAllProviders: React.ComponentType = ({ children }) => {
  return (
    <HelmetProvider>
      <AuthContext.Provider value={{ user: anonymousUser, isAdmin: false, loadingUser: false, error: undefined }}>
        {children}
      </AuthContext.Provider>
    </HelmetProvider>
  )
}

function wrappedRender(
  ui: React.ReactElement,
  options?: RenderOptions
): RenderResult {

  return render(ui, {
    wrapper: WithAllProviders,
    ...options,
  });
}

export function initFirebaseForTesting() {
  var app = firebase.initializeTestApp({
    projectId: "mdcrosshare",
    auth: { uid: "anonymous-user-id", admin: false }
  });

  var db = app.firestore();
  db.settings({
    host: "localhost:8080",
    ssl: false
  });

  function useAuthState(): [firebaseTypes.User | undefined, boolean, firebaseTypes.auth.Error | undefined] {
    return [anonymousUser, false, undefined];
  }

  initFirebase(app, firebase.firestore.Timestamp, null, firebase.firestore.FieldValue.delete(), useAuthState);
}

// re-export everything
export * from '@testing-library/react';

// override render method
export { wrappedRender as render };
