import { ReactNode, createContext, useContext } from 'react';
import { ErrorPage } from '../components/ErrorPage';

import { GoogleLinkButton, GoogleSignInButton } from './GoogleButtons';
import { TopBar } from './TopBar';
import { Optionalize } from '../lib/types';
import { ConstructorPageT } from '../lib/constructorPage';

export interface AuthProps {
  isAdmin: boolean,
  user: firebase.User,
  constructorPage?: ConstructorPageT
}

export interface AuthPropsOptional {
  isAdmin: boolean,
  user?: firebase.User,
  constructorPage?: ConstructorPageT
}

export function renderLoginButtonIfNeeded({ user, loading, error }: AuthContextValue): React.ReactNode | null {
  if (loading) {
    return <div></div>;
  }
  if (error) {
    return <div>Error loading user: {error}</div>;
  }
  if (!user) {
    return <GoogleSignInButton />;
  }
  if (user.isAnonymous) {
    return <GoogleLinkButton user={user} />;
  }
  return null;
}

function renderLoginIfNeeded({ user, loading, error }: AuthContextValue): React.ReactNode | null {
  if (loading) {
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
          <p>Please sign-in with your Google account to continue. We use your account to keep track of the puzzles you&apos;ve played and your solve streaks.</p>
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
          <p>Please sign-in with your Google account to continue. We use your account to keep track of the puzzles you&apos;ve played and your solve streaks.</p>
          <GoogleLinkButton user={user} />
        </div>
      </>
    );
  }
  return null;
}

/* Ensure we have a non-anonymous user, upgrading an anonymous user if we have one. */
export function requiresAuth<T extends AuthProps>(WrappedComponent: React.ComponentType<T>) {
  return (props: Optionalize<T, AuthProps>): ReactNode => {
    const ctx = useContext(AuthContext);
    const login = renderLoginIfNeeded(ctx);
    if (login) {
      return login;
    }
    return <WrappedComponent {...(props as T)} isAdmin={ctx.isAdmin} user={ctx.user} constructorPage={ctx.constructorPage} />;
  };
}

/* Ensure we have an admin user, upgrading an anonymous user if we have one. */
export function requiresAdmin<T extends AuthProps>(WrappedComponent: React.ComponentType<T>) {
  return (props: Optionalize<T, AuthProps>): ReactNode => {
    const ctx = useContext(AuthContext);
    const login = renderLoginIfNeeded(ctx);
    if (login) {
      return login;
    }
    if (!ctx.isAdmin) {
      return (
        <ErrorPage title='Not Allowed'>
          <p>You do not have permission to view this page</p>
        </ErrorPage >
      );
    }
    return <WrappedComponent {...(props as T)} isAdmin={true} user={ctx.user} constructorPage={ctx.constructorPage} />;
  };
}

interface AuthContextValue {
  user?: firebase.User,
  isAdmin: boolean,
  loading: boolean,
  error?: string,
  constructorPage?: ConstructorPageT
}
export const AuthContext = createContext({ user: undefined, loading: false, error: 'using default context', constructorPage: undefined } as AuthContextValue);
