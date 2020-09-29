import { useState, useCallback, useContext, FormEvent, ReactNode } from 'react';
import NextJSRouter from 'next/router';

import { AuthContext } from './AuthContext';
import { DisplayNameForm, getDisplayName } from './DisplayNameForm';
import { Overlay } from './Overlay';
import { Emoji } from './Emoji';
import { ConstructorNotes } from './ConstructorNotes';
import { App, ServerTimestamp } from '../lib/firebaseWrapper';
import { DBPuzzleT } from '../lib/dbtypes';
import { STORAGE_KEY } from './Builder';
import { ButtonAsLink, Button } from './Buttons';

export function PublishOverlay(props: { id: string, toPublish: DBPuzzleT, user: firebase.User, cancelPublish: () => void }) {
  const { constructorPage } = useContext(AuthContext);
  const [inProgress, setInProgress] = useState(false);
  const [done, setDone] = useState(false);
  const [editingDisplayName, setEditingDisplayName] = useState(false);
  const [displayName, setDisplayName] = useState(getDisplayName(props.user, constructorPage));

  const doPublish = useCallback((event: FormEvent) => {
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
      n: displayName,
      p: ServerTimestamp,
    };

    db.collection('c').doc(props.id).set(toPublish).then(async () => {
      console.log('Uploaded', props.id);
      localStorage.removeItem(STORAGE_KEY);
      setDone(true);
      NextJSRouter.push('/crosswords/' + props.id);
    });
  }, [props.id, inProgress, done, displayName, props.toPublish]);

  let contents: ReactNode;
  if (done) {
    contents = <>
      <h2>Published Successfully! Redirecting...</h2>
    </>;
  } else if (inProgress) {
    contents = <>
      <h2>Uploading your puzzle...</h2>
    </>;
  } else {
    contents = <>
      {editingDisplayName ?
        <DisplayNameForm
          user={props.user}
          onChange={(s) => { setDisplayName(s); setEditingDisplayName(false); }}
          onCancel={() => setEditingDisplayName(false)}
        />
        :
        <h3>by <i>{displayName}</i> (<ButtonAsLink onClick={() => setEditingDisplayName(true)} text="change name" />)</h3>
      }
      {props.toPublish.cn ?
        <ConstructorNotes notes={props.toPublish.cn} />
        : ''}
      <p>Thanks for constructing a puzzle! <Emoji symbol='😎' /></p>
      <p css={{ color: 'var(--error)' }}>All puzzles are reviewed and subject to removal at any time
    for any reason (e.g. if the content is deemed offensive or if it is found to be
     copyright infringement)</p>
      <Button onClick={doPublish} disabled={editingDisplayName} text="Publish Puzzle" />
    </>;
  }
  return <Overlay closeCallback={props.cancelPublish}>
    <h2>Publishing &lsquo;{props.toPublish.t}&rsquo;</h2>
    {contents}
  </Overlay>;
}
