import { updateProfile } from 'firebase/auth';
import { query, where } from 'firebase/firestore';
import type { Either, Right } from 'fp-ts/Either';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useCollection, useDocument } from 'react-firebase-hooks/firestore';
import { AuthContextValue } from '../components/AuthContext.js';
import { ConstructorPageV } from './constructorPage.js';
import { getAuth, getCollection, getDocRef } from './firebaseWrapper.js';
import { getDisplayName } from './hooks.js';
import { NotificationT, NotificationV } from './notificationTypes.js';
import { PathReporter } from './pathReporter.js';
import { AccountPrefsV } from './prefs.js';
import { parseUserInfo } from './userinfo.js';
import { logAsyncErrors } from './utils.js';

const isRight = <A>(ma: Either<unknown, A>): ma is Right<A> =>
  ma._tag === 'Right';

export function useAuth(): AuthContextValue {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Current user
  const [user, loadingUser, authError] = useAuthState(getAuth());

  // Is admin
  useEffect(() => {
    if (user?.email) {
      user
        .getIdTokenResult()
        .then((idTokenResult) => {
          // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
          if (idTokenResult.claims.admin) {
            setIsAdmin(true);
          } else {
            setIsAdmin(false);
          }
        })
        .catch((error: unknown) => {
          setIsAdmin(false);
          console.error(error);
        });
    } else {
      setIsAdmin(false);
    }
  }, [user]);

  // Constructor page + notifications + prefs
  const [cpDocRef, notificationsDocRef, prefsDocRef] = useMemo(() => {
    if (user?.email && !user.isAnonymous) {
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
    if (!accountPrefsDoc?.exists()) {
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
  const notifications: NotificationT[] = useMemo(() => {
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
  const [isMod, setIsMod] = useState(false);
  useEffect(() => {
    if (!user) {
      return;
    }
    let didCancel = false;
    async function getUserInfo() {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const res = await (await fetch(`/api/userinfo/${user?.uid}`))
        .json()
        .catch((e: unknown) => {
          console.log(e);
        });
      // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
      if (!didCancel && res) {
        const ui = parseUserInfo(res);
        setIsPatron(ui.isPatron);
        setIsMod(ui.isMod);
      }
    }
    logAsyncErrors(getUserInfo)();
    return () => {
      didCancel = true;
    };
  }, [user]);

  return {
    user: user || undefined,
    isPatron,
    isMod,
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
