import { ReactNode, createContext, useContext } from 'react';
import { ErrorPage } from '../components/ErrorPage';
import type { User } from 'firebase/auth';
import { GoogleLinkButton, GoogleSignInButton } from './GoogleButtons';
import { TopBar } from './TopBar';
import { ConstructorPageT } from '../lib/constructorPage';
import { NotificationT } from '../lib/notificationTypes';
import { AccountPrefsT } from '../lib/prefs';
import { WithConditionalCSSProp } from '@emotion/react/types/jsx-namespace';

export interface AuthProps {
  isAdmin: boolean;
  user: User;
  constructorPage?: ConstructorPageT;
  prefs?: AccountPrefsT;
}

export interface AuthPropsOptional {
  isAdmin: boolean;
  user?: User;
  constructorPage?: ConstructorPageT;
  prefs?: AccountPrefsT;
}

export function renderLoginButtonIfNeeded({
  user,
  loading,
  error,
}: AuthContextValue): React.ReactNode | null {
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

function renderLoginIfNeeded({
  user,
  loading,
  error,
}: AuthContextValue): React.ReactNode | null {
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
        <div css={{ margin: '1em' }}>
          <p>
            Please sign-in with your Google account to continue. We use your
            account to keep track of the puzzles you&apos;ve played and your
            solve streaks.
          </p>
          <GoogleSignInButton />
        </div>
      </>
    );
  }
  if (user.isAnonymous) {
    return (
      <>
        <TopBar />
        <div css={{ margin: '1em' }}>
          <p>
            Please sign-in with your Google account to continue. We use your
            account to keep track of the puzzles you&apos;ve played and your
            solve streaks.
          </p>
          <GoogleLinkButton user={user} />
        </div>
      </>
    );
  }
  return null;
}

/* Ensure we have a non-anonymous user, upgrading an anonymous user if we have one. */
export function requiresAuth<T>(WrappedComponent: React.ComponentType<T>) {
  return (props: T & WithConditionalCSSProp<T>): ReactNode => {
    const ctx = useContext(AuthContext);
    const login = renderLoginIfNeeded(ctx);
    if (login) {
      return login;
    }
    return (
      <WrappedComponent
        {...props}
        isAdmin={ctx.isAdmin}
        user={ctx.user}
        constructorPage={ctx.constructorPage}
        prefs={ctx.prefs}
      />
    );
  };
}

/* Ensure we have an admin user, upgrading an anonymous user if we have one. */
export function requiresAdmin<T>(WrappedComponent: React.ComponentType<T>) {
  return (props: T & WithConditionalCSSProp<T>): ReactNode => {
    const ctx = useContext(AuthContext);
    const login = renderLoginIfNeeded(ctx);
    if (login) {
      return login;
    }
    if (!ctx.isAdmin) {
      return (
        <ErrorPage title="Not Allowed">
          <p>You do not have permission to view this page</p>
        </ErrorPage>
      );
    }
    return (
      <WrappedComponent
        {...props}
        isAdmin={true}
        user={ctx.user}
        constructorPage={ctx.constructorPage}
        prefs={ctx.prefs}
      />
    );
  };
}

export interface AuthContextValue {
  user?: User;
  notifications?: Array<NotificationT>;
  isAdmin: boolean;
  isPatron: boolean;
  loading: boolean;
  error?: string;
  constructorPage?: ConstructorPageT;
  prefs?: AccountPrefsT;
  displayName?: string | null;
  updateDisplayName?: (n: string) => Promise<void>;
}
export const AuthContext = createContext<AuthContextValue>({
  user: undefined,
  isAdmin: false,
  isPatron: false,
  loading: false,
  error: 'using default context',
  constructorPage: undefined,
  prefs: undefined,
});
