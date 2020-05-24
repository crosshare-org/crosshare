import { useState } from 'react';

export const getDisplayName = (user?: firebase.User) => {
  return user ?.displayName || "Anonymous Crossharer";
}

export const DisplayNameForm = ({ user, onChange, onCancel }: { user: firebase.User, onChange: (newName: string) => void, onCancel?: () => void }) => {
  function sanitize(input: string) {
    return input.replace(/[^0-9a-zA-Z ]/g, '');
  }
  const [newDisplayName, setNewDisplayName] = useState(sanitize(getDisplayName(user)));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newDisplayName.trim()) {
      user.updateProfile({ displayName: newDisplayName.trim() }).then(() => {
        if (!user.displayName) {
          throw new Error("something went wrong");
        }
        onChange(user.displayName);
      });
    }
  }

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
