import { useState, useCallback, FormEvent, ChangeEvent } from 'react';
import NextJSRouter from 'next/router';

import { DisplayNameForm, getDisplayName } from './DisplayNameForm';
import { Overlay } from './Overlay';
import { Emoji } from './Emoji';
import { App, TimestampClass } from '../lib/firebaseWrapper';
import { DBPuzzleT, AuthoredPuzzleT, AuthoredPuzzlesV } from '../lib/dbtypes';
import { updateInCache } from '../lib/dbUtils';
import { STORAGE_KEY } from './Builder';
import { buttonAsLink } from '../lib/style';

export function PublishOverlay(props: { toPublish: DBPuzzleT, user: firebase.User, cancelPublish: () => void }) {
  const [inProgress, setInProgress] = useState(false);
  const [editingDisplayName, setEditingDisplayName] = useState(false);
  const [displayName, setDisplayName] = useState(getDisplayName(props.user));

  const [category, setCategory] = useState<string | null>(null);

  const doPublish = useCallback((event: FormEvent) => {
    event.preventDefault();

    if (inProgress) {
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
      c: category,
      p: (category ? null : TimestampClass.fromDate(hourAgo))
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
      NextJSRouter.push('/pending/' + ref.id);
    });
  }, [category, inProgress, displayName, props.toPublish, props.user.uid]);

  const defaultText = 'Your puzzle will be available immediately to anybody you share the link with. Within a few days we will moderate the puzzle which will make it eligible to appear on the Crosshare homepage (and elsewhere on the site).';
  const onChange = (e: ChangeEvent<HTMLInputElement>) => setCategory(e.currentTarget.value === 'default' ? null : 'dailymini');

  return <Overlay closeCallback={props.cancelPublish}>
    <h2>Publishing &lsquo;{props.toPublish.t}&rsquo;</h2>
    {editingDisplayName ?
      <DisplayNameForm
        user={props.user}
        onChange={(s) => { setDisplayName(s); setEditingDisplayName(false); }}
        onCancel={() => setEditingDisplayName(false)}
      />
      :
      <h3>by <i>{displayName}</i> (<button css={buttonAsLink} onClick={() => setEditingDisplayName(true)}>change name</button>)</h3>
    }
    <form onSubmit={doPublish}>
      <p>Thanks for constructing a puzzle! <Emoji symbol='😎' /></p>
      {props.toPublish.w === 5 && props.toPublish.h === 5 ?
        <>
          <p>
            <label>
              <input css={{ marginRight: '1em' }} type='radio' name='publishType' value='default' checked={category === null} onChange={onChange} />
              <b>Publish Immediately</b>: {defaultText}
            </label>
          </p>
          <p>
            <label>
              <input css={{ marginRight: '1em' }} type='radio' name='publishType' value='dailymini' checked={category === 'dailymini'} onChange={onChange} />
              <b>Submit as Daily Mini</b>: Your puzzle will be submitted as a Crosshare Daily Mini.
              It will not be visible to anybody other than yourself until it is reviewed.
              Within a few days we will review the puzzle. If selected, we will set a date for it to
              appear as the daily mini (this could take a week or two depending on
              how many submissions are queued up) - on that date it will be available
               to other solvers. If your puzzle is not selected as a daily mini
              it will be published immediately after review.
            </label>
          </p>
        </>
        :
        <p>{defaultText}</p>
      }
      <p css={{ color: 'var(--error)' }}>All puzzles are subject to removal at any time
    for any reason (e.g. if the content is deemed offensive or if it is found to be
       copyright infringement)</p>
      <input type='submit' value='Publish Puzzle' disabled={editingDisplayName} />
    </form>
  </Overlay>;
}
