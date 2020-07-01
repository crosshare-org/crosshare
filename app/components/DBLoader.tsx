import {
  useState, useEffect
} from 'react';

import { App } from '../lib/firebaseWrapper';

import { DefaultTopBar } from './TopBar';

import * as WordDB from '../lib/WordDB';

export const LoadButton = (props: { buttonText: string, onClick?: () => void, onComplete: () => void }): JSX.Element => {
  const [dlProgress, setDlProgress] = useState<number | null>(null);
  const [buildProgress, setBuildProgress] = useState<number | null>(null);
  const [error, setError] = useState('');

  const startBuild = () => {
    if (props.onClick) {
      props.onClick();
    }
    setDlProgress(0);
    const storage = App.storage();
    const wordlistRef = storage.ref('wordlist.txt');
    wordlistRef.getDownloadURL().then(function(url: string) {
      const xhr = new XMLHttpRequest();
      xhr.responseType = 'text';
      xhr.onprogress = (e) => {
        setDlProgress(e.total ? e.loaded / e.total : 50);
      };
      xhr.onload = () => {
        setDlProgress(null);
        setBuildProgress(0);
        const wordlist: string = xhr.response;
        WordDB.build(wordlist, setBuildProgress).then(() => { setBuildProgress(null); props.onComplete(); });
      };
      xhr.open('GET', url);
      xhr.send();
    }).catch(function() {
      setError('Error downloading word list, please try again');
    });
  };

  if (error) {
    return <p>Something went wrong: {error}</p>;
  } else if (dlProgress !== null || buildProgress !== null) {
    return <>
      <p><b>Downloading and building...</b></p>
      <p>Please be patient and keep this window open, this can take a while. Like, longer than you think.</p>
      <p>Maybe go make a cup of coffee.</p>
      <p>Soon there&apos;ll be a progress bar here!</p>
    </>;
  }
  return <button onClick={startBuild}>{props.buttonText}</button>;
};

export const DBLoader = (): JSX.Element => {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const [triedInit, setTriedInit] = useState(false);

  useEffect(() => {
    if (WordDB.dbStatus === WordDB.DBStatus.uninitialized) {
      WordDB.initialize(true).then(succeeded => {
        if (succeeded) {
          setReady(true);
        }
      }).catch(() => {
        setError(true);
      }).finally(() => {
        setTriedInit(true);
      });
    } else if (WordDB.dbStatus === WordDB.DBStatus.present) {
      setReady(true);
    }
  }, []);

  if (!triedInit) {  // initial loading
    return <div>Checking for / validating existing database, this can take a minute...</div>;
  }
  return <>
    <DefaultTopBar />
    <div css={{ margin: '1em' }}>
      <h2>Database Rebuilder</h2>
      {error ?
        <p>Error loading existing database.</p>
        : ''}
      {ready ?
        <p>Found an existing database.</p>
        :
        <p>No existing database found.</p>
      }
      <LoadButton buttonText={'Build Database'} onClick={() => setError(false)} onComplete={() => setReady(true)} />
    </div>
  </>;
};
