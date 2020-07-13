import { useState, useCallback, FormEvent, ReactNode } from 'react';
import NextJSRouter from 'next/router';

import { DisplayNameForm, getDisplayName } from './DisplayNameForm';
import { Overlay } from './Overlay';
import { Emoji } from './Emoji';
import { ConstructorNotes } from './ConstructorNotes';
import { App, ServerTimestamp } from '../lib/firebaseWrapper';
import { DBPuzzleT, AuthoredPuzzleT, AuthoredPuzzlesV } from '../lib/dbtypes';
import { updateInCache } from '../lib/dbUtils';
import { STORAGE_KEY } from './Builder';
import { buttonAsLink } from '../lib/style';

export function PublishOverlay(props: { toPublish: DBPuzzleT, user: firebase.User, cancelPublish: () => void }) {
  const [inProgress, setInProgress] = useState(false);
  const [done, setDone] = useState(false);
  const [editingDisplayName, setEditingDisplayName] = useState(false);
  const [displayName, setDisplayName] = useState(getDisplayName(props.user));

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

    db.collection('c').add(toPublish).then(async (ref) => {
      console.log('Uploaded', ref.id);
      const authoredPuzzle: AuthoredPuzzleT = [toPublish.ca, toPublish.t];
      await updateInCache({
        collection: 'uc',
        docId: props.user.uid,
        update: { [ref.id]: authoredPuzzle },
        validator: AuthoredPuzzlesV,
        sendToDB: true
      });

      localStorage.removeItem(STORAGE_KEY);
      setDone(true);
      NextJSRouter.push('/crosswords/' + ref.id);
    });
  }, [inProgress, done, displayName, props.toPublish, props.user.uid]);

  let contents: ReactNode;
  if (done) {
    contents = <>
      <h2>Published Successfully!</h2>
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
        <h3>by <i>{displayName}</i> (<button css={buttonAsLink} onClick={() => setEditingDisplayName(true)}>change name</button>)</h3>
      }
      {props.toPublish.cn ?
        <ConstructorNotes notes={props.toPublish.cn} />
        : ''}
      <p>Thanks for constructing a puzzle! <Emoji symbol='😎' /></p>
      <p css={{ color: 'var(--error)' }}>All puzzles are reviewed and subject to removal at any time
    for any reason (e.g. if the content is deemed offensive or if it is found to be
     copyright infringement)</p>
      <button onClick={doPublish} disabled={editingDisplayName}>Publish Puzzle</button>
    </>;
  }
  return <Overlay closeCallback={props.cancelPublish}>
    <h2>Publishing &lsquo;{props.toPublish.t}&rsquo;</h2>
    {contents}
  </Overlay>;
}
