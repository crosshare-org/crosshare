import { useState, useEffect } from 'react';
import Head from 'next/head';
import NextJSRouter from 'next/router';

import { importFile } from '../lib/converter';
import { requiresAuth } from '../components/AuthContext';
import { STORAGE_KEY } from '../components/Builder';

export const UploadPage = () => {
  const [warning, setWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const inStorage = localStorage.getItem(STORAGE_KEY);
    if (inStorage) {
      setWarning('WARNING: you have an existing puzzle in progress at crosshare.org/construct - uploading will cause you to permanently lose all progress. Please finish and publish the current puzzle before uploading.');
    }
  }, []);

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
          }
          localStorage.setItem(STORAGE_KEY, JSON.stringify(puzzle));
          NextJSRouter.push('/construct');
        } catch (error) {
          console.error(error);
          setError(error.message || 'Could not import file');
        }
      }
    };
    fileReader.readAsArrayBuffer(f[0]);
  }

  const description = 'Import your existing puzzle to share it on Crosshare. Crosshare gives your solvers a first-class experience on any device, and gives you access to statistics about solves.';
  return <>
    <Head>
      <title>Upload and Import Puzzles | Crosshare</title>
      <meta key="og:title" property="og:title" content='Crosshare Crossword Upload / Import' />
      <meta key="description" name="description" content={description} />
      <meta key="og:description" property="og:description" content={description} />
    </Head>
    {warning ? <p css={{ color: 'var(--error)' }}>{warning}</p> : ''}
    {error ? <p css={{ color: 'var(--error)' }}>{error}</p> : ''}
    <input type='file' accept='.puz' onChange={e => handleFile(e.target.files)} />
  </>;
};

export default requiresAuth(UploadPage);
