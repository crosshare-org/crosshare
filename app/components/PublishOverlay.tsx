import { useState, useCallback, FormEvent, ReactNode } from 'react';
import NextJSRouter from 'next/router';
import type firebase from 'firebase/app';

import { DisplayNameForm, useDisplayName } from './DisplayNameForm';
import { Overlay } from './Overlay';
import { Emoji } from './Emoji';
import { App, ServerTimestamp } from '../lib/firebaseWrapper';
import { DBPuzzleT } from '../lib/dbtypes';
import { STORAGE_KEY } from '../lib/utils';
import { ButtonAsLink, Button } from './Buttons';

export function PublishOverlay(props: {
  id: string;
  toPublish: DBPuzzleT;
  warnings: Array<string>;
  user: firebase.User;
  cancelPublish: () => void;
}) {
  const [inProgress, setInProgress] = useState(false);
  const [done, setDone] = useState(false);
  const [editingDisplayName, setEditingDisplayName] = useState(false);
  const displayName = useDisplayName();

  const doPublish = useCallback(
    (event: FormEvent) => {
      event.preventDefault();

      if (inProgress || done) {
        return;
      }
      setInProgress(true);

      console.log('Uploading');
      const db = App.firestore();

      const hourAgo = new Date();
      hourAgo.setHours(hourAgo.getHours() - 1);
      const toPublish = {
        ...props.toPublish,
        n: displayName || 'Anonymous Crossharer',
        p: ServerTimestamp,
      };

      db.collection('c')
        .doc(props.id)
        .set(toPublish)
        .then(async () => {
          console.log('Uploaded', props.id);
          localStorage.removeItem(STORAGE_KEY);
          setDone(true);
          NextJSRouter.push('/crosswords/' + props.id);
        });
    },
    [props.id, inProgress, done, displayName, props.toPublish]
  );

  let contents: ReactNode;
  if (done) {
    contents = (
      <>
        <h2>Published Successfully! Redirecting...</h2>
      </>
    );
  } else if (inProgress) {
    contents = (
      <>
        <h2>Uploading your puzzle...</h2>
      </>
    );
  } else {
    contents = (
      <>
        {editingDisplayName || !displayName ? (
          <DisplayNameForm onCancel={() => setEditingDisplayName(false)} />
        ) : (
          <h3>
            {props.toPublish.gc ? (
              <>
                by <i>{props.toPublish.gc}</i>, published by{' '}
                <i>{displayName}</i>
              </>
            ) : (
              <>
                by <i>{displayName}</i>
              </>
            )}{' '}
            (
            <ButtonAsLink
              onClick={() => setEditingDisplayName(true)}
              text="change your display name"
            />
            )
          </h3>
        )}
        <p>
          Thanks for constructing a puzzle! <Emoji symbol="😎" />
        </p>
        <p css={{ color: 'var(--error)' }}>
          All puzzles are reviewed and subject to removal at any time for any
          reason (e.g. if the content is deemed offensive or if it is found to
          be copyright infringement)
        </p>
        {props.warnings.length ? (
          <>
            <p css={{ color: 'var(--error)' }}>Warnings:</p>
            <ul>
              {props.warnings.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </>
        ) : (
          ''
        )}

        <Button
          onClick={doPublish}
          disabled={editingDisplayName || !displayName}
          text="Publish Puzzle"
        />
      </>
    );
  }
  return (
    <Overlay closeCallback={props.cancelPublish}>
      <h2>Publishing &lsquo;{props.toPublish.t}&rsquo;</h2>
      {contents}
    </Overlay>
  );
}
