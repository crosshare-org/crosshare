import * as React from 'react';

import { AppProps } from 'next/app';
import { useAuthState } from 'react-firebase-hooks/auth';

import { App } from '../helpers/firebase';
import { AuthContext } from '../components/AuthContext';

import '../helpers/style.css';

const MyApp = ({ Component, pageProps }: AppProps) => {
  const [user, loadingUser, error] = useAuthState(App.auth());
  const [isAdmin, setIsAdmin] = React.useState(false);

  React.useEffect(() => {
    if (user && user.email) {
      user.getIdTokenResult()
        .then((idTokenResult) => {
          if (!!idTokenResult.claims.admin) {
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

  return <AuthContext.Provider value={{ user, isAdmin, loadingUser, error: error ?.message}}>
    <Component {...pageProps} />
  </AuthContext.Provider>;
}

export default MyApp;
