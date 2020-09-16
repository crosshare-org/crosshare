import { useState, useContext } from 'react';

import { AuthContext } from './AuthContext';
import { ConstructorPageT } from '../lib/constructorPage';
import { App, ServerTimestamp } from '../lib/firebaseWrapper';
import { Button } from './Buttons';

export const getDisplayName = (user: firebase.User | undefined, constructorPage: ConstructorPageT | undefined) => {
  return constructorPage ?.n || user ?.displayName || 'Anonymous Crossharer';
};

interface DisplayNameFormProps {
  user: firebase.User,
  onChange: (newName: string) => void,
  onCancel?: () => void
}

export const DisplayNameForm = ({ user, onChange, onCancel }: DisplayNameFormProps) => {
  const ctx = useContext(AuthContext);
  const db = App.firestore();
  const [submitting, setSubmitting] = useState(false);

  function sanitize(input: string) {
    return input.replace(/[^0-9a-zA-Z ]/g, '');
  }
  const [newDisplayName, setNewDisplayName] = useState(sanitize(getDisplayName(user, ctx.constructorPage)));

  const handleSubmit = (e: React.FormEvent) => {
    setSubmitting(true);
    e.preventDefault();
    const toSubmit = newDisplayName.trim();
    if (toSubmit) {
      const updates = [user.updateProfile({ displayName: toSubmit })];
      if (ctx.constructorPage) {
        updates.push(db.collection('cp').doc(ctx.constructorPage.id).update({ m: true, n: toSubmit, t: ServerTimestamp }));
      }
      Promise.all(updates).then(() => {
        setSubmitting(false);
        if (!user.displayName) {
          throw new Error('something went wrong');
        }
        onChange(user.displayName);
      });
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <label>
        Update display name:
        <input css={{ margin: '0 0.5em', }} type="text" value={newDisplayName} onChange={e => setNewDisplayName(sanitize(e.target.value))} />
      </label>
      <Button type="submit" text="Save" disabled={submitting} />
      {onCancel ?
        <Button boring={true} css={{ marginLeft: '0.5em' }} onClick={onCancel} text="Cancel" />
        : ''}
    </form>
  );
};
