import { createContext, useContext } from 'react';
import Error from 'next/error'

import { GoogleLinkButton, GoogleSignInButton } from './GoogleButtons';
import { TopBar } from './TopBar';
import { Optionalize } from '../lib/types';

export interface AuthProps {
  isAdmin: boolean,
  user: firebase.User,
};

export interface AuthPropsOptional {
  isAdmin: boolean,
  user?: firebase.User,
};

function renderLoginIfNeeded({ user, loadingUser, error }: AuthContextValue): React.ReactNode | null {
  if (loadingUser) {
    return <div></div>;
  }
  if (error) {
    return <div>Error loading user: {error}</div>;
  }
  if (!user) {
    return (
      <>
        <TopBar />
        <div css={{ margin: '1em', }}>
          <p>Please sign-in with your Google account to continue. We use your account to keep track of the puzzles you've played and your solve streaks.</p>
          <GoogleSignInButton />
        </div>
      </>
    );
  }
  if (user.isAnonymous) {
    return (
      <>
        <TopBar />
        <div css={{ margin: '1em', }}>
          <p>Please sign-in with your Google account to continue. We use your account to keep track of the puzzles you've played and your solve streaks.</p>
          <GoogleLinkButton user={user} />
        </div>
      </>
    );
  }
  return null;
}

/* Ensure we have a non-anonymous user, upgrading an anonymous user if we have one. */
export function requiresAuth<T extends AuthProps>(WrappedComponent: React.ComponentType<T>) {
  return (props: Optionalize<T, AuthProps>) => {
    const ctx = useContext(AuthContext);
    const login = renderLoginIfNeeded(ctx);
    if (login) {
      return login;
    }
    return <WrappedComponent {...(props as T)} isAdmin={ctx.isAdmin} user={ctx.user} />
  }
}

/* Ensure we have an admin user, upgrading an anonymous user if we have one. */
export function requiresAdmin<T extends AuthProps>(WrappedComponent: React.ComponentType<T>) {
  return (props: Optionalize<T, AuthProps>) => {
    const ctx = useContext(AuthContext);
    const login = renderLoginIfNeeded(ctx);
    if (login) {
      return login;
    }
    if (!ctx.isAdmin) {
      return <Error statusCode={403} />
    }
    return <WrappedComponent {...(props as T)} isAdmin={true} user={ctx.user} />
  }
}

interface AuthContextValue {
  user: firebase.User | undefined,
  isAdmin: boolean,
  loadingUser: boolean,
  error: string | undefined
}
export const AuthContext = createContext({ user: undefined, loadingUser: false, error: "using default context" } as AuthContextValue);
