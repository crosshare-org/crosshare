import { useState, useCallback, useEffect, useMemo } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useCollection } from 'react-firebase-hooks/firestore';

import { isRight } from 'fp-ts/lib/Either';
import { PathReporter } from 'io-ts/lib/PathReporter';
import { App } from './firebaseWrapper';
import { ConstructorPageV, } from './constructorPage';

export function usePersistedBoolean(key: string, defaultValue: boolean): [boolean, (b: boolean) => void] {
  const [state, setState] = useState<boolean>(defaultValue);

  useEffect(() => {
    const initialValue = localStorage.getItem(key);
    setState(initialValue !== null ? initialValue === 'true' : defaultValue);
  }, [defaultValue, key]);

  const setStateAndPersist = useCallback((newValue: boolean) => {
    localStorage.setItem(key, newValue ? 'true' : 'false');
    setState(newValue);
  }, [key, setState]);
  return [state, setStateAndPersist];
}

export function useAuth() {
  const [isAdmin, setIsAdmin] = useState(false);

  // Current user
  const [user, loadingUser, authError] = useAuthState(App.auth());

  // Is admin
  useEffect(() => {
    if (user && user.email) {
      user.getIdTokenResult()
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

  // Constructor page
  const docRef = useMemo(
    () => (user && user.email && !user.isAnonymous) ? App.firestore().collection('cp').where('u', '==', user.uid) : null,
    [user]
  );
  const [cpSnapshot, loadingCP, cpError] = useCollection(docRef);
  const [constructorPage, cpDecodeError] = useMemo(() => {
    if (cpSnapshot === undefined || cpSnapshot.empty) {
      return [undefined, undefined];
    }
    if (cpSnapshot.size !== 1) {
      return [undefined, 'Multiple matching constructor pages'];
    }
    const validationResult = ConstructorPageV.decode(cpSnapshot.docs[0].data({ serverTimestamps: 'previous' }));
    if (isRight(validationResult)) {
      return [{ ...validationResult.right, id: cpSnapshot.docs[0].id }, undefined];
    } else {
      console.log(PathReporter.report(validationResult).join(','));
      return [undefined, undefined];
    }
  }, [cpSnapshot]);

  return { user, isAdmin, constructorPage, loading: loadingUser || loadingCP, error: authError ?.message || cpError ?.message || cpDecodeError };
}
