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
import { ConstructorPageT, ConstructorPageV } from './constructorPage';
import { NotificationV, NotificationT } from './notificationTypes';
import useResizeObserver from 'use-resize-observer';
import { AccountPrefsV } from './prefs';
import { AuthContextValue } from '../components/AuthContext';
import { parseUserInfo } from './userinfo';
import { updateProfile } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { query, where } from 'firebase/firestore';
import { getAuth, getCollection, getDocRef } from './firebaseWrapper';

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
        return import('@juggle/resize-observer').then((module) => {
          window.ResizeObserver =
            module.ResizeObserver as unknown as typeof ResizeObserver;
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

type DarkModePreference = 'dark' | 'light' | null;
const darkModeKey = 'colorScheme';
const darkClass = 'dark-mode';
const lightClass = 'light-mode';
export function useDarkModeControl(): [
  DarkModePreference,
  (preference: DarkModePreference) => void
] {
  const [pref, setPref] = useState<DarkModePreference>(null);

  useEffect(() => {
    try {
      const initialValue = localStorage.getItem(darkModeKey);
      if (initialValue !== null) {
        setPref(initialValue === 'dark' ? 'dark' : 'light');
      }
    } catch {
      /* happens on incognito when iframed */
      console.warn('not loading setting from LS');
    }
  }, []);

  const setPrefAndPersist = useCallback((newVal: DarkModePreference) => {
    try {
      if (newVal === null) {
        localStorage.removeItem(darkModeKey);
      } else {
        localStorage.setItem(darkModeKey, newVal);
      }
    } catch {
      console.warn('failed to store setting in LS');
    }
    setPref(newVal);
    if (newVal !== 'dark') {
      document.body.classList.remove(darkClass);
    }
    if (newVal !== 'light') {
      document.body.classList.remove(lightClass);
    }
    if (newVal === 'dark') {
      document.body.classList.add(darkClass);
    }
    if (newVal === 'light') {
      document.body.classList.add(lightClass);
    }
  }, []);

  return [pref, setPrefAndPersist];
}

export function usePersistedBoolean(
  key: string,
  defaultValue: boolean
): [boolean, (b: boolean) => void] {
  const [state, setState] = useState<boolean>(defaultValue);

  useEffect(() => {
    try {
      const initialValue = localStorage.getItem(key);
      setState(initialValue !== null ? initialValue === 'true' : defaultValue);
    } catch {
      /* happens on incognito when iframed */
      console.warn('not loading setting from LS');
    }
  }, [defaultValue, key]);

  const setStateAndPersist = useCallback(
    (newValue: boolean) => {
      try {
        localStorage.setItem(key, newValue ? 'true' : 'false');
      } catch {
        console.warn('failed to store setting in LS');
      }
      setState(newValue);
    },
    [key, setState]
  );
  return [state, setStateAndPersist];
}

const getDisplayName = (
  user: User | undefined,
  constructorPage: ConstructorPageT | undefined
) => {
  return constructorPage?.n || user?.displayName || null;
};

export function useAuth(): AuthContextValue {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Current user
  const [user, loadingUser, authError] = useAuthState(getAuth());

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
        query(getCollection('cp'), where('u', '==', user.uid)),
        query(
          getCollection('n'),
          where('u', '==', user.uid),
          where('r', '==', false)
        ),
        getDocRef('prefs', user.uid),
      ];
    }
    if (!loadingUser) {
      setIsLoading(false);
    }
    return [null, null, null];
  }, [user, loadingUser]);
  const [accountPrefsDoc, loadingAccountPrefs, accountPrefsDBError] =
    useDocument(prefsDocRef);
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

  const [notificationsSnapshot, , notificationError] =
    useCollection(notificationsDocRef);
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
    if (cpSnapshot.empty || cpSnapshot.docs[0] === undefined) {
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

  const [displayName, setDisplayName] = useState(
    getDisplayName(user || undefined, constructorPage)
  );
  const [didUpdateDN, setDidUpdateDN] = useState(false);

  // On change to user/cp, update display name if we haven't already set
  useEffect(() => {
    if (!didUpdateDN) {
      setDisplayName(getDisplayName(user || undefined, constructorPage));
    }
  }, [user, constructorPage, didUpdateDN]);

  // On logout, reset display name
  useEffect(() => {
    if (!user) {
      setDisplayName(null);
      setDidUpdateDN(false);
    }
  }, [user]);

  const updateDisplayName = useCallback(
    async (newDN: string) => {
      if (user) {
        setDisplayName(newDN);
        setDidUpdateDN(true);
        return updateProfile(user, {
          displayName: newDN,
        });
      }
    },
    [user]
  );

  const [isPatron, setIsPatron] = useState(false);
  useEffect(() => {
    if (!user) {
      return;
    }
    let didCancel = false;
    async function getUserInfo() {
      const res = await (await fetch(`/api/userinfo/${user?.uid}`))
        .json()
        .catch((e) => {
          console.log(e);
        });
      if (!didCancel && res) {
        setIsPatron(parseUserInfo(res).isPatron);
      }
    }
    getUserInfo();
    return () => {
      didCancel = true;
    };
  }, [user]);

  return {
    user: user || undefined,
    isPatron,
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
    displayName,
    updateDisplayName,
  };
}

export function useHover(): [
  boolean,
  {
    onClick: (e: MouseEvent) => void;
    onMouseMove: (e: MouseEvent) => void;
    onMouseLeave: (e: MouseEvent) => void;
  },
  () => void
] {
  const [isHovered, setHovered] = useState(false);
  const [clickWhileHovered, setClickWhileHovered] = useState(false);

  const bind = useMemo(
    () => ({
      onClick: (e: MouseEvent) => {
        if (clickWhileHovered) {
          setHovered(false);
          setClickWhileHovered(false);
        }
        e.stopPropagation();
      },
      onMouseMove: () => {
        if (isHovered) {
          setClickWhileHovered(true);
        }
        setHovered(true);
      },
      onMouseLeave: () => setHovered(false),
    }),
    [isHovered, clickWhileHovered]
  );

  return [isHovered, bind, () => setHovered(false)];
}
