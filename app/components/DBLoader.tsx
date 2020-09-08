import {
  useState
} from 'react';

import { App } from '../lib/firebaseWrapper';

import { DefaultTopBar } from './TopBar';
import { ProgressBar } from './ProgressBar';

import * as WordDB from '../lib/WordDB';
import { useWordDB } from '../lib/WordDB';

// TODO this is jank but *shrug*
const FILESIZE = 22000000;

export const LoadButton = (props: { buttonText: string, onClick?: () => void, onComplete: () => void }): JSX.Element => {
  const [dlProgress, setDlProgress] = useState<number | null>(null);
  const [validating, setValidating] = useState<boolean>(false);
  const [error, setError] = useState('');

  const startBuild = () => {
    if (props.onClick) {
      props.onClick();
    }
    setDlProgress(0);
    const storage = App.storage();
    const wordlistRef = storage.ref('worddb.json');
    wordlistRef.getDownloadURL().then(function(url: string) {
      const xhr = new XMLHttpRequest();
      xhr.responseType = 'json';
      xhr.onprogress = (e) => {
        setDlProgress(e.total ? e.loaded / e.total : e.loaded / FILESIZE);
      };
      xhr.onload = async () => {
        setDlProgress(null);
        setValidating(true);
        return WordDB.validateAndSet(xhr.response).then(() => { setValidating(false); props.onComplete(); });
      };
      xhr.open('GET', url);
      xhr.send();
    }).catch(function() {
      setError('Error downloading word list, please try again');
    });
  };

  if (error) {
    return <p>Something went wrong: {error}</p>;
  } else if (dlProgress !== null || validating) {
    return <>
      {dlProgress !== null ?
        <ProgressBar percentDone={dlProgress} />
        :
        <p><b>Downloaded, validating database...</b></p>
      }
      <p>Please be patient and keep this window open, this can take a while.</p>
    </>;
  }
  return <button onClick={startBuild}>{props.buttonText}</button>;
};

export const DBLoader = (): JSX.Element => {
  const [ready, error, loading, setLoaded] = useWordDB();

  if (loading) {  // initial loading
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
      <LoadButton buttonText={'Build Database'} onComplete={() => setLoaded()} />
    </div>
  </>;
};
