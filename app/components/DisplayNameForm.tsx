import { useState, useContext } from 'react';

import { AuthContext } from './AuthContext';
import { ConstructorPageT } from '../lib/constructorPage';

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

  function sanitize(input: string) {
    return input.replace(/[^0-9a-zA-Z ]/g, '');
  }
  const [newDisplayName, setNewDisplayName] = useState(sanitize(getDisplayName(user, ctx.constructorPage)));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newDisplayName.trim()) {
      user.updateProfile({ displayName: newDisplayName.trim() }).then(() => {
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
      <input type="submit" value="Save" />
      {onCancel ?
        <button type="button" css={{ marginLeft: '0.5em' }} onClick={onCancel}>Cancel</button>
        : ''}
    </form>
  );
};
