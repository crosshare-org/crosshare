/** @jsx jsx */
import { jsx } from '@emotion/core';
import * as React from 'react';

import { Link, navigate, RouteComponentProps } from "@reach/router";
import { FaUser, FaUserLock } from 'react-icons/fa';

import { AuthContext } from './App';
import { TopBarLink } from './TopBar';
import { Page } from './Page';
import { navToLatestMini } from './utils';
import { buttonAsLink } from './style';

declare var firebase: typeof import('firebase');

export const Home = (_: RouteComponentProps) => {
  const { isAdmin } = React.useContext(AuthContext);
  let topbar = <React.Fragment>
    {isAdmin ?
      <TopBarLink icon={<FaUserLock />} text="Admin" onClick={() => navigate('/admin')} />
      : ''}
    <TopBarLink icon={<FaUser />} text="Account" onClick={() => navigate('/account')} />
  </React.Fragment>
  const [error, setError] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  function goToDailyMini() {
    setLoading(true);
    navToLatestMini(firebase.firestore.Timestamp.now(), () => { setError(true) });
  }

  return (
    <Page title={null} topBarElements={topbar}>
      <div css={{ margin: '1em', }}>
        {error ?
          <React.Fragment>
            <p css={{ marginBottom: '1em' }}>Uh oh, something went wrong loading your puzzle. Please refresh and try again.</p>
            <p>If the error continues please let us know in the google group.</p>
          </React.Fragment>
          :
          (loading ?
            <React.Fragment>
              <p>Loading today's mini...</p>
            </React.Fragment>
            :
            <React.Fragment>
              <p css={{ marginBottom: '1em' }}>
                Crosshare is a new community for crossword constructors.
                We are just getting started so please let us know if you have any issues or suggestions.
              </p>
              <p><button css={buttonAsLink} onClick={goToDailyMini}>Play today's daily mini crossword</button></p>
              <p><Link to="/category/dailymini">Play previous daily minis</Link></p>
            </React.Fragment>
          )
        }
        <p css={{ marginTop: '1em' }}>For questions and discussion, join the <a target="_blank" rel="noopener noreferrer" href="https://groups.google.com/forum/#!forum/crosshare">Google Group</a>. Follow us on twitter <a target="_blank" rel="noopener noreferrer" href="https://twitter.com/crosshareapp">@crosshareapp</a>.</p>
      </div>
    </Page>
  );
}
