/** @jsx jsx */
import { jsx } from '@emotion/core';
import * as React from 'react';

import { navigate, RouteComponentProps } from "@reach/router";
import { FaUser } from 'react-icons/fa';
import { isRight } from 'fp-ts/lib/Either';
import { PathReporter } from "io-ts/lib/PathReporter";

import { AuthContext } from './App';
import { TopBarLink } from './TopBar';
import { Page } from './Page';
import { PuzzleV } from './types';

declare var firebase: typeof import('firebase');

export const Home = (_: RouteComponentProps) => {
  const {user} = React.useContext(AuthContext);
  let topbar = null;
  if (user) {
    topbar = <TopBarLink icon={<FaUser/>} text="Account" onClick={() => navigate('/account')}/>
  }
  const [error, setError] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  function goToDailyMini() {
    setLoading(true);
    const db = firebase.firestore();
    db.collection('crosswords').where("category", "==", "dailymini")
      .where("publishTime", "<=", firebase.firestore.Timestamp.now())
      .orderBy("publishTime", "desc").limit(1).get().then((value) => {
      value.forEach(doc => { // Should be only 1 - better way to do this?
        const data = doc.data();
        const validationResult = PuzzleV.decode(data);
        if (isRight(validationResult)) {
          navigate("/crosswords/" + doc.id, {state: {...validationResult.right, id: doc.id}});
        } else {
          console.error(PathReporter.report(validationResult).join(","));
          setError(true);
        }
      });
    }).catch(reason => {
      console.error(reason);
      setError(true);
    });
  }

  return (
    <Page title={null} topBarElements={topbar}>
      <div css={{ margin: '1em', }}>
      {error ?
        <React.Fragment>
        <p css={{marginBottom: '1em'}}>Uh oh, something went wrong loading your puzzle. Please refresh and try again.</p>
        <p>If the error continues please let us know in the google group.</p>
        </React.Fragment>
      :
      (loading ?
        <React.Fragment>
        <p>Loading today's mini...</p>
        </React.Fragment>
        :
        <React.Fragment>
        <p css={{marginBottom: '1em'}}>
        Crosshare is a new community for crossword constructors.
        We are just getting started so please let us know if you have any issues or suggestions.
        </p>
        <p><button  css={{
          background: 'none!important',
          border: 'none',
          padding: '0!important',
          color: '#069',
          fontWeight: 'bold',
          textDecoration: 'underline',
          cursor: 'pointer',
        }} onClick={goToDailyMini}>Play today's daily mini crossword</button></p>
        </React.Fragment>
      )
      }
        <p css={{marginTop: '1em'}}>For questions and discussion, join the <a target="_blank" rel="noopener noreferrer" href="https://groups.google.com/forum/#!forum/crosshare">Google Group</a>.</p>
      </div>
    </Page>
  );
}
