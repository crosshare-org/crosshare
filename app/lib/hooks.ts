import {
  useState,
  useCallback,
  useEffect,
  useMemo,
  MouseEvent,
  RefObject,
} from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useCollection, useDocument } from 'react-firebase-hooks/firestore';
import { isRight } from 'fp-ts/lib/Either';
import { PathReporter } from 'io-ts/lib/PathReporter';
import { App } from './firebaseWrapper';
import { ConstructorPageV } from './constructorPage';
import { NotificationV, NotificationT } from './notifications';
import useResizeObserver from 'use-resize-observer';
import { AccountPrefsV } from './prefs';

// pass a query like `(min-width: 768px)`
export function useMatchMedia(query: string) {
  const [matches, setMatches] = useState(
    () => typeof window !== 'undefined' && matchMedia(query).matches
  );

  useEffect(() => {
    const mediaQueryList = matchMedia(query);
    const onChange = (event: MediaQueryListEvent) => setMatches(event.matches);

    // note 1: safari currently doesn't support add/removeEventListener so we use add/removeListener
    // note 2: add/removeListener are maybe marked as deprecated, but that could be wrong
    //         see https://github.com/microsoft/TypeScript/issues/32210
    mediaQueryList.addListener(onChange);
    return () => mediaQueryList.removeListener(onChange);
  }, [query]);

  return matches;
}

export function usePolyfilledResizeObserver(ref: RefObject<HTMLElement>) {
  const [hasResizeObserver, setHasResizeObserver] = useState(false);
  useEffect(() => {
    let didCancel = false;

    const loadRO = async () => {
      if (hasResizeObserver) {
        return;
      }
      if ('ResizeObserver' in window) {
        setHasResizeObserver(true);
      } else {
        // Loads polyfill asynchronously, only if required.
        import('@juggle/resize-observer').then((module) => {
          window.ResizeObserver = (module.ResizeObserver as unknown) as typeof ResizeObserver;
          if (!didCancel) {
            setHasResizeObserver(true);
          }
        });
      }
    };
    loadRO();
    return () => {
      didCancel = true;
    };
  }, [hasResizeObserver]);
  return useResizeObserver({ ref: hasResizeObserver ? ref : null });
}

export function usePersistedBoolean(
  key: string,
  defaultValue: boolean
): [boolean, (b: boolean) => void] {
  const [state, setState] = useState<boolean>(defaultValue);

  useEffect(() => {
    const initialValue = localStorage.getItem(key);
    setState(initialValue !== null ? initialValue === 'true' : defaultValue);
  }, [defaultValue, key]);

  const setStateAndPersist = useCallback(
    (newValue: boolean) => {
      localStorage.setItem(key, newValue ? 'true' : 'false');
      setState(newValue);
    },
    [key, setState]
  );
  return [state, setStateAndPersist];
}

export function useAuth() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Current user
  const [user, loadingUser, authError] = useAuthState(App.auth());

  // Is admin
  useEffect(() => {
    if (user && user.email) {
      user
        .getIdTokenResult()
        .then((idTokenResult) => {
          if (idTokenResult.claims.admin) {
            setIsAdmin(true);
          } else {
            setIsAdmin(false);
          }
        })
        .catch((error) => {
          setIsAdmin(false);
          console.error(error);
        });
    }
  }, [user]);

  // Constructor page + notifications + prefs
  const [cpDocRef, notificationsDocRef, prefsDocRef] = useMemo(() => {
    if (user && user.email && !user.isAnonymous) {
      setIsLoading(true);
      return [
        App.firestore().collection('cp').where('u', '==', user.uid),
        App.firestore()
          .collection('n')
          .where('u', '==', user.uid)
          .where('r', '==', false),
        App.firestore().doc(`prefs/${user.uid}`),
      ];
    }
    setIsLoading(false);
    return [null, null, null];
  }, [user]);
  const [
    accountPrefsDoc,
    loadingAccountPrefs,
    accountPrefsDBError,
  ] = useDocument(prefsDocRef);
  const [accountPrefs, accountPrefsDecodeError] = useMemo(() => {
    if (!accountPrefsDoc?.exists) {
      return [undefined, undefined];
    }
    const validationResult = AccountPrefsV.decode(accountPrefsDoc.data());
    if (isRight(validationResult)) {
      return [validationResult.right, undefined];
    } else {
      console.log(PathReporter.report(validationResult).join(','));
      return [undefined, 'failed to decode account prefs'];
    }
  }, [accountPrefsDoc]);
  const accountPrefsError =
    accountPrefsDBError?.message || accountPrefsDecodeError;

  const [notificationsSnapshot, , notificationError] = useCollection(
    notificationsDocRef
  );
  if (notificationError) {
    console.log(notificationError);
  }
  const notifications: Array<NotificationT> = useMemo(() => {
    if (notificationsSnapshot === undefined || notificationsSnapshot.empty) {
      return [];
    }
    return notificationsSnapshot.docs
      .map((d) => NotificationV.decode(d.data()))
      .filter(isRight)
      .map((r) => r.right);
  }, [notificationsSnapshot]);
  const [cpSnapshot, loadingCP, cpError] = useCollection(cpDocRef);
  const [constructorPage, cpDecodeError] = useMemo(() => {
    if (cpSnapshot === undefined) {
      return [undefined, undefined];
    }
    setIsLoading(false);
    if (cpSnapshot.empty) {
      return [undefined, undefined];
    }
    if (cpSnapshot.size !== 1) {
      return [undefined, 'Multiple matching constructor pages'];
    }
    const validationResult = ConstructorPageV.decode(
      cpSnapshot.docs[0].data({ serverTimestamps: 'previous' })
    );
    if (isRight(validationResult)) {
      return [
        { ...validationResult.right, id: cpSnapshot.docs[0].id },
        undefined,
      ];
    } else {
      console.log(PathReporter.report(validationResult).join(','));
      return [undefined, 'Failed to decode constructor page'];
    }
  }, [cpSnapshot]);

  return {
    user,
    isAdmin,
    constructorPage,
    notifications,
    prefs: accountPrefs,
    loading: isLoading || loadingUser || loadingCP || loadingAccountPrefs,
    error:
      authError?.message ||
      cpError?.message ||
      cpDecodeError ||
      accountPrefsError,
  };
}

export function useHover(): [
  boolean,
  {
    onClick: (e: MouseEvent) => void;
    onMouseMove: (e: MouseEvent) => void;
    onMouseLeave: (e: MouseEvent) => void;
  }
  ] {
  const [isHovered, setHovered] = useState(false);

  const bind = useMemo(
    () => ({
      onClick: (e: MouseEvent) => {
        e.stopPropagation();
      },
      onMouseMove: () => {
        setHovered(true);
      },
      onMouseLeave: () => setHovered(false),
    }),
    []
  );

  return [isHovered, bind];
}
