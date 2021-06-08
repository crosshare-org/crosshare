import { useState, useContext } from 'react';
import { AuthContext } from './AuthContext';
import { App, ServerTimestamp } from '../lib/firebaseWrapper';
import { Button } from './Buttons';
import { useSnackbar } from './Snackbar';

export const useDisplayName = () => {
  const ctx = useContext(AuthContext);
  return ctx.displayName;
};

interface DisplayNameFormProps {
  onCancel?: () => void;
}

export const DisplayNameForm = ({ onCancel }: DisplayNameFormProps) => {
  const ctx = useContext(AuthContext);
  const [submitting, setSubmitting] = useState(false);
  const { showSnackbar } = useSnackbar();

  const user = ctx.user;

  function sanitize(input: string | null | undefined) {
    return input && input.replace(/[^0-9a-zA-Z ]/g, '');
  }

  const [newDisplayName, setNewDisplayName] = useState(
    sanitize(ctx.displayName)
  );

  if (!user) {
    return <>Must be logged in</>;
  }

  const db = App.firestore();

  const handleSubmit = (e: React.FormEvent) => {
    setSubmitting(true);
    e.preventDefault();
    const toSubmit = newDisplayName?.trim();
    if (toSubmit && ctx.updateDisplayName) {
      const updates = [ctx.updateDisplayName(toSubmit)];
      if (ctx.constructorPage) {
        updates.push(
          db
            .collection('cp')
            .doc(ctx.constructorPage.id)
            .update({ m: true, n: toSubmit, t: ServerTimestamp })
        );
      }
      Promise.all(updates).then(() => {
        setSubmitting(false);
        showSnackbar('Display name updated');
        onCancel?.();
      });
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <label>
        {ctx.displayName ? 'Update display name:' : 'Set your display name:'}
        <input
          css={{ margin: '0 0.5em' }}
          type="text"
          value={newDisplayName || ''}
          onChange={(e) => setNewDisplayName(sanitize(e.target.value))}
        />
      </label>
      <Button
        type="submit"
        text="Save"
        disabled={submitting || !newDisplayName?.trim()}
      />
      {onCancel ? (
        <Button
          boring={true}
          css={{ marginLeft: '0.5em' }}
          onClick={onCancel}
          text="Cancel"
        />
      ) : (
        ''
      )}
    </form>
  );
};
