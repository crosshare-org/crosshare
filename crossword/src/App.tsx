/** @jsx jsx */
import { jsx } from '@emotion/core';
import * as React from 'react';

import { WindowLocation, Location, Router, RouteComponentProps } from "@reach/router";
import { useAuthState } from 'react-firebase-hooks/auth';
import { Helmet, HelmetProvider } from 'react-helmet-async';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.min.css';

import { ErrorBoundary } from './ErrorBoundary';
import { PuzzleLoader } from './Puzzle';
import { PuzzleStats } from './PuzzleStats';
import { Page, SquareTest, TwoColTest } from './Page';
import { AccountPage } from './AccountPage';
import { Admin } from './Admin';
import { Home } from './Home';
import { Category } from './Category';
import { PlayV, UserPlayT, UserPlaysV } from './common/dbtypes';
import { getValidatedAndDelete, setInCache, updateInCache } from './common/dbUtils';

import googlesignin from './googlesignin.png';

const BuilderDBLoader = React.lazy(() => import(/* webpackChunkName: "builder" */ "./Builder"));

declare var firebase: typeof import('firebase');

interface AuthContextValue {
  user: firebase.User | undefined,
  isAdmin: boolean,
  loadingUser: boolean,
  error: string | undefined
}
export const AuthContext = React.createContext({ user: undefined, loadingUser: false, error: "using default context" } as AuthContextValue);

type CrosshareAudioContextValue = [AudioContext | null, () => void];
export const CrosshareAudioContext = React.createContext([null, () => { }] as CrosshareAudioContextValue);

type Optionalize<T extends K, K> = Omit<T, keyof K>;

export interface AuthProps {
  isAdmin: boolean,
  user: firebase.User,
};

export const GoogleSignInButton = () => {
  function signin() {
    const provider = new firebase.auth.GoogleAuthProvider();
    firebase.auth().signInWithPopup(provider)
      .then(() => {
        firebase.analytics().logEvent("login", { method: 'google' });
      })
  }
  return (
    <button css={{ background: 'none', border: 'none' }}><img width="191" height="46" src={googlesignin} alt="Sign in with Google" onClick={signin} /></button>
  );
}

export const GoogleLinkButton = ({ user }: { user: firebase.User }) => {
  function signin() {
    const provider = new firebase.auth.GoogleAuthProvider();
    user.linkWithPopup(provider)
      .then(() => {
        console.log("linked w/o needing a merge")
        firebase.analytics().logEvent("login", { method: 'google' });
      })
      .catch(async (error: any) => {
        if (error.code !== 'auth/credential-already-in-use') {
          console.log(error);
          return;
        }
        // Get anonymous user plays
        const db = firebase.firestore();
        await db.collection('up').doc(user.uid).delete();
        const plays = await getValidatedAndDelete(db.collection('p').where('u', '==', user.uid), PlayV);
        return firebase.auth().signInWithCredential(error.credential).then(async (value: firebase.auth.UserCredential) => {
          console.log("signed in as new user " + value.user ?.uid);
          const newUser = value.user;
          if (!newUser) {
            throw new Error('missing new user after link');
          }
          await Promise.all(plays.map((play) => {
            play.u = newUser.uid;
            console.log("Updating play " + play.c + '-' + play.u)
            const userPlay: UserPlayT = [play.ua, play.t, play.ch, play.f, 'Crossword'];
            return Promise.all([
              setInCache('p', play.c + "-" + newUser.uid, play, PlayV, true),
              updateInCache('up', newUser.uid, { [play.c]: userPlay }, UserPlaysV, true)
            ]);
          }));
          user.delete();
          console.log("linked and merged plays");
        });
      });
  }
  return (
    <button css={{ background: 'none', border: 'none' }}><img width="191" height="46" src={googlesignin} alt="Sign in with Google" onClick={signin} /></button>
  );
}

/* Ensure we have at least an anonymous user */
export function ensureUser<T extends AuthProps>(WrappedComponent: React.ComponentType<T>) {
  return (props: Optionalize<T, AuthProps>) => {
    const { user, isAdmin, loadingUser, error } = React.useContext(AuthContext);
    if (loadingUser) {
      return <Page title={null}>Loading user...</Page>;
    }
    if (error) {
      return <Page title={null}>Error loading user: {error}</Page>;
    }
    if (!user) {
      firebase.auth().signInAnonymously().then(() => {
        firebase.analytics().logEvent("login", { method: 'anonymous' });
      })
      return <Page title={null}>Loading user...</Page>;
    };
    return <WrappedComponent isAdmin={isAdmin} user={user} {...(props as T)} />
  }
}

/* Ensure we have a non-anonymous user, upgrading an anonymous user if we have one. */
export function requiresAuth<T extends AuthProps>(WrappedComponent: React.ComponentType<T>) {
  return (props: Optionalize<T, AuthProps>) => {
    const { user, isAdmin, loadingUser, error } = React.useContext(AuthContext);
    if (loadingUser) {
      return <Page title={null}>Loading user...</Page>;
    }
    if (error) {
      return <Page title={null}>Error loading user: {error}</Page>;
    }
    if (!user) {
      return (
        <Page title="Sign In">
          <div css={{ margin: '1em', }}>
            <p>Please sign-in with your Google account to continue. We use your account to keep track of the puzzles you've played and your solve streaks.</p>
            <GoogleSignInButton />
          </div>
        </Page>
      );
    }
    if (user.isAnonymous) {
      return (
        <Page title="Sign In">
          <div css={{ margin: '1em', }}>
            <p>Please sign-in with your Google account to continue. We use your account to keep track of the puzzles you've played and your solve streaks.</p>
            <GoogleLinkButton user={user} />
          </div>
        </Page>
      );
    }
    return <WrappedComponent isAdmin={isAdmin} user={user} {...(props as T)} />
  }
}

/* Ensure we have an admin user, upgrading an anonymous user if we have one. */
export function requiresAdmin<T extends AuthProps>(WrappedComponent: React.ComponentType<T>) {
  return (props: Optionalize<T, AuthProps>) => {
    const { user, isAdmin, loadingUser, error } = React.useContext(AuthContext);
    if (loadingUser) {
      return <Page title={null}>Loading user...</Page>;
    }
    if (error) {
      return <Page title={null}>Error loading user: {error}</Page>;
    }
    if (user && user.email) {
      if (!isAdmin) {
        return <Page title="Error">Must be an admin to view this page.</Page>;
      }
      return <WrappedComponent isAdmin={true} user={user} {...(props as T)} />
    }
    return (
      <Page title="Sign In">
        <div css={{ margin: '1em', }}>
          <p>Please sign-in to continue. You must be an admin to view this page.</p>
          <GoogleSignInButton />
        </div>
      </Page>
    );
  }
}

const ErrorTest = requiresAdmin((_: RouteComponentProps & AuthProps) => {
  if (1)
    throw new Error("testing");
  return <div>error</div>;
});

const NotFound = (_: RouteComponentProps) => {
  return <Page title="Not Found"> not found :(</Page>;
}

const TermsOfService = (_: RouteComponentProps) => {
  return (
    <Page title="Terms of Service">
      <h2>Crosshare Terms of Service</h2>
      <p>1. Terms</p>
      <p>By accessing the website at https://crosshare.org, you are agreeing to be bound by these terms of service, all applicable laws and regulations, and agree that you are responsible for compliance with any applicable local laws. If you do not agree with any of these terms, you are prohibited from using or accessing this site. The materials contained in this website are protected by applicable copyright and trademark law.</p>
      <p>2. Use License</p>
      <p>Permission is granted to temporarily download one copy of the materials (information or software) on Crosshare's website for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:</p>
      <p>- modify or copy the materials;</p>
      <p>- use the materials for any commercial purpose, or for any public display (commercial or non-commercial);</p>
      <p>- attempt to decompile or reverse engineer any software contained on Crosshare's website;</p>
      <p>- remove any copyright or other proprietary notations from the materials; or</p>
      <p>- transfer the materials to another person or "mirror" the materials on any other server.</p>
      <p>This license shall automatically terminate if you violate any of these restrictions and may be terminated by Crosshare at any time. Upon terminating your viewing of these materials or upon the termination of this license, you must destroy any downloaded materials in your possession whether in electronic or printed format.</p>
      <p>3. Disclaimer</p>
      <p>The materials on Crosshare's website are provided on an 'as is' basis. Crosshare makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.</p>
      <p>Further, Crosshare does not warrant or make any representations concerning the accuracy, likely results, or reliability of the use of the materials on its website or otherwise relating to such materials or on any sites linked to this site.</p>
      <p>4. Limitations</p>
      <p>In no event shall Crosshare or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on Crosshare's website, even if Crosshare or a Crosshare authorized representative has been notified orally or in writing of the possibility of such damage. Because some jurisdictions do not allow limitations on implied warranties, or limitations of liability for consequential or incidental damages, these limitations may not apply to you.</p>
      <p>5. Accuracy of materials</p>
      <p>The materials appearing on Crosshare's website could include technical, typographical, or photographic errors. Crosshare does not warrant that any of the materials on its website are accurate, complete or current. Crosshare may make changes to the materials contained on its website at any time without notice. However Crosshare does not make any commitment to update the materials.</p>
      <p>6. Links</p>
      <p>Crosshare has not reviewed all of the sites linked to its website and is not responsible for the contents of any such linked site. The inclusion of any link does not imply endorsement by Crosshare of the site. Use of any such linked website is at the user's own risk.</p>
      <p>7. Modifications</p>
      <p>Crosshare may revise these terms of service for its website at any time without notice. By using this website you are agreeing to be bound by the then current version of these terms of service.</p>
      <p>8. Governing Law</p>
      <p>These terms and conditions are governed by and construed in accordance with the laws of New York and you irrevocably submit to the exclusive jurisdiction of the courts in that State or location.</p>
    </Page>
  );
}

const PrivacyPolicy = (_: RouteComponentProps) => {
  return (
    <Page title="Privacy Policy">
      <h2>Privacy Policy</h2>
      <p>Your privacy is important to us. It is Crosshare's policy to respect your privacy regarding any information we may collect from you across our website, https://crosshare.org, and other sites we own and operate.</p>
      <p>We only ask for personal information when we truly need it to provide a service to you. We collect it by fair and lawful means, with your knowledge and consent. We also let you know why we’re collecting it and how it will be used.</p>
      <p>We only retain collected information for as long as necessary to provide you with your requested service. What data we store, we’ll protect within commercially acceptable means to prevent loss and theft, as well as unauthorized access, disclosure, copying, use or modification.</p>
      <p>We don’t share any personally identifying information publicly or with third-parties, except when required to by law.</p>
      <p>Our website may link to external sites that are not operated by us. Please be aware that we have no control over the content and practices of these sites, and cannot accept responsibility or liability for their respective privacy policies.</p>
      <p>You are free to refuse our request for your personal information, with the understanding that we may be unable to provide you with some of your desired services.</p>
      <p>Your continued use of our website will be regarded as acceptance of our practices around privacy and personal information. If you have any questions about how we handle user data and personal information, feel free to contact us.</p>
      <p>This policy is effective as of 10 March 2020.</p>
    </Page>
  );
}

const Construct = (_: RouteComponentProps) => {
  let size = 5;
  let grid = [
    " ", " ", " ", " ", " ",
    " ", " ", " ", " ", " ",
    " ", " ", " ", " ", " ",
    " ", " ", " ", " ", " ",
    " ", " ", " ", " ", " ",
  ];
  // size = 15;
  // grid = [
  //   " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ",
  //   " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ",
  //   " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ",
  //   " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ",
  //   " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ",
  //   " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ",
  //   " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ",
  //   " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ",
  //   " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ",
  //   " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ",
  //   " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ",
  //   " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ",
  //   " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ",
  //   " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ",
  //   " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ", " ",
  // ];
  // size = 15;
  // grid = [
  //   "    .    .     ",
  //   "    .    .     ",
  //   "    .    .     ",
  //   "VANBURENZOPIANO",
  //   "...   ..   ....",
  //   "WASHINGTONYHAWK",
  //   "   ..   .      ",
  //   "     .   .     ",
  //   "      .   ..   ",
  //   "ROOSEVELTONJOHN",
  //   "....   ..   ...",
  //   "JEFFERSONNYBONO",
  //   "     .    .    ",
  //   "     .    .    ",
  //   "     .    .    "
  // ];
  // grid = grid.map(s => s.split("")).flat();
  const props = {
    "size": {
      "rows": size,
      "cols": size
    },
    "grid": grid
  }

  return <BuilderDBLoader {...props} />;
};

const PageViewTracker = ({ location }: { location: WindowLocation }) => {
  React.useEffect(() => {
    try {
      firebase.analytics().logEvent("screen_view", { app_name: 'react', screen_name: location.pathname });
    } catch (e) {
      if (e instanceof TypeError) {
        console.log("Got TypeError on analytics", e);
      } else {
        throw e;
      }
    }
  }, [location]);
  return <React.Fragment></React.Fragment>;
}

const App = () => {
  const [user, loadingUser, error] = useAuthState(firebase.auth());
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
  const [audioContext, setAudioContext] = React.useState<AudioContext | null>(null);
  const initAudioContext = React.useCallback(() => {
    if (!audioContext) {
      const constructor = window.AudioContext || (window as any).webkitAudioContext;
      setAudioContext(new constructor());
    }
  }, [audioContext, setAudioContext]);
  return (
    <ErrorBoundary>
      <HelmetProvider>
        <CrosshareAudioContext.Provider value={[audioContext, initAudioContext]}>
          <AuthContext.Provider value={{ user, isAdmin, loadingUser, error: error ?.message}}>
            <Helmet defaultTitle="Crosshare" titleTemplate="%s | Crosshare" />
            <Location>
              {({ location }) => (
                <PageViewTracker location={location} />
              )}
            </Location>
            <React.Suspense fallback={<div>Loading...</div>}>
              <ToastContainer />
              <Router css={{ height: '100%', width: '100%', }}>
                <Home path="/" />
                <AccountPage path="/account" />
                <Admin path="/admin" />
                <ErrorTest path="/error" />
                <Construct path="/construct" />
                <Category path="/category/:categoryId" />
                <PuzzleLoader path="/crosswords/:crosswordId" />
                <PuzzleStats path="/crosswords/:crosswordId/stats" />
                <SquareTest path="/square" />
                <TwoColTest path="/twocol" />
                <TermsOfService path="/tos" />
                <PrivacyPolicy path="/privacy" />
                <NotFound default />
              </Router>
            </React.Suspense>
          </AuthContext.Provider>
        </CrosshareAudioContext.Provider>
      </HelmetProvider>
    </ErrorBoundary>
  );
}

export default App;
