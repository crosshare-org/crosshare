import { User } from 'firebase/auth';
import { createContext } from 'react';
import { ConstructorPageT } from '../lib/constructorPage.js';
import { NotificationT } from '../lib/notificationTypes.js';
import { AccountPrefsT } from '../lib/prefs.js';

export interface AuthContextValue {
  user?: User;
  notifications?: NotificationT[];
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
