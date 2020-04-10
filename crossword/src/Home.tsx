/** @jsx jsx */
import { jsx } from '@emotion/core';
import * as React from 'react';

import { navigate, Link, RouteComponentProps } from "@reach/router";
import firebase from 'firebase/app';
import 'firebase/auth';
import { FaUser } from 'react-icons/fa';
import { isRight } from 'fp-ts/lib/Either';
import { PathReporter } from "io-ts/lib/PathReporter";

import { useAuth } from './App';
import { TopBarLink } from './TopBar';
import { Page } from './Page';
import { PuzzleResult, PuzzleV } from './types';
import { MiniPuzzle } from './Icons';

export const Home = (_: RouteComponentProps) => {
  const auth_result = useAuth();
  let topbar = null;
  if (auth_result[0]) {
    topbar = <TopBarLink icon={<FaUser/>} text="Account" onClick={() => navigate('/account')}/>
  }
  const [error, setError] = React.useState(false);
  const [mini, setMini] = React.useState<PuzzleResult|null>(null);

  React.useEffect(() => {
    console.log("loading mini");
    if (error) {
      console.log("error set, skipping");
      return;
    }
    const db = firebase.firestore();
    db.collection('crosswords').where("category", "==", "dailymini")
      .where("publishTime", "<=", firebase.firestore.Timestamp.now())
      .limit(1).get().then((value) => {
      value.forEach(doc => { // Should be only 1 - better way to do this?
        const data = doc.data();
        const validationResult = PuzzleV.decode(data);
        if (isRight(validationResult)) {
          setMini({...validationResult.right, id: doc.id});
        } else {
          console.error(PathReporter.report(validationResult).join(","));
          setError(true);
        }
      });
    }).catch(reason => {
      console.error(reason);
      setError(true);
    });
  }, [error]);

  return (
    <Page title={null} topBarElements={topbar}>
      <div css={{ margin: '1em', }}>
        <p css={{marginBottom: '2em'}}>Crosshare is a new community for crossword constructors.</p>
        { mini ?
        <Link to={"/crosswords/" + mini.id} state={mini}><div css={{ width: 200, textAlign: 'center'}}><MiniPuzzle width={100} height={100}/><div css={{ color: 'black', fontWeight: 'bold', fontSize: '1.5em'}}>Daily Mini for {mini.publishTime && mini.publishTime.toDate().toLocaleDateString()}</div></div></Link>
        : ""}
        <p css={{marginTop: '2em'}}>For questions and discussion, join the <a target="_blank" rel="noopener noreferrer" href="https://groups.google.com/forum/#!forum/crosshare">Google Group</a>.</p>
      </div>
    </Page>
  );
}
