import { useState } from 'react';
import Head from 'next/head';

import { PuzzleInProgressT } from '../lib/types';
import { importFile } from '../lib/converter';
import { requiresAuth, AuthProps } from '../components/AuthContext';
import { DefaultTopBar } from '../components/TopBar';
import { Preview } from '../components/Preview';

export const UploadPage = (props: AuthProps) => {
  const [puzzle, setPuzzle] = useState<PuzzleInProgressT | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleFile(f: FileList | null) {
    if (!f) {
      setError('No file selected');
      return;
    }
    const fileReader = new FileReader();
    fileReader.onloadend = () => {
      if (!fileReader.result) {
        setError('No file result');
      } else if (typeof (fileReader.result) === 'string') {
        setError('Failed to read as binary');
      } else {
        try {
          const puzzle = importFile(new Uint8Array(fileReader.result));
          if (!puzzle) {
            setError('Failed to parse file');
          } else {
            setPuzzle(puzzle);
          }
        } catch (error) {
          console.error(error);
          setError(error.message || 'Could not import file');
        }
      }
    };
    fileReader.readAsArrayBuffer(f[0]);
  }

  if (puzzle) {
    return <Preview {...props} {...puzzle} />;
  }

  const description = 'Import your existing puzzle to share it on Crosshare. Crosshare gives your solvers a first-class experience on any device, and gives you access to statistics about solves.';
  return <>
    <Head>
      <title>Upload/Import Crossword Puzzles | Crosshare</title>
      <meta key="og:title" property="og:title" content='Crosshare Crossword Upload / Import' />
      <meta key="description" name="description" content={description} />
      <meta key="og:description" property="og:description" content={description} />
    </Head>
    <DefaultTopBar />
    <div css={{ margin: '1em', width: '100%' }}>
      {error ?
        <>
          <p css={{ color: 'var(--error)' }}>{error}</p>
          <p>If your puzzle isn&apos;t uploading correctly please message us on twitter or in the google group so we can help!</p>
        </>
        : ''}
      <input type='file' accept='.puz' onChange={e => handleFile(e.target.files)} />
    </div>
  </>;
};

export default requiresAuth(UploadPage);
