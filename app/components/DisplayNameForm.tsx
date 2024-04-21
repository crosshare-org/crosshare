import { t } from '@lingui/macro';
import { serverTimestamp, updateDoc } from 'firebase/firestore';
import { useContext, useState } from 'react';
import { getDocRef } from '../lib/firebaseWrapper';
import { logAsyncErrors } from '../lib/utils';
import { AuthContext } from './AuthContext';
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
    return input?.replace(/[^0-9a-zA-Z'\- ]/g, '');
  }

  const [newDisplayName, setNewDisplayName] = useState(
    sanitize(ctx.displayName)
  );

  if (!user) {
    return <>Must be logged in</>;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    setSubmitting(true);
    e.preventDefault();
    const toSubmit = newDisplayName?.trim();
    if (toSubmit && ctx.updateDisplayName) {
      const updates = [ctx.updateDisplayName(toSubmit)];
      if (ctx.constructorPage) {
        updates.push(
          updateDoc(getDocRef('cp', ctx.constructorPage.id), {
            m: true,
            n: toSubmit,
            t: serverTimestamp(),
          })
        );
      }
      await Promise.all(updates).then(() => {
        setSubmitting(false);
        showSnackbar(t`Display name updated`);
        onCancel?.();
      });
    }
  };

  return (
    <form onSubmit={logAsyncErrors(handleSubmit)}>
      <label>
        {ctx.displayName ? t`Update display name:` : t`Set your display name:`}
        <input
          className="margin0-0-5em"
          type="text"
          value={newDisplayName || ''}
          onChange={(e) => {
            setNewDisplayName(sanitize(e.target.value));
          }}
        />
      </label>
      <Button
        type="submit"
        text={t`Save`}
        disabled={submitting || !newDisplayName?.trim()}
      />
      {onCancel ? (
        <Button
          boring={true}
          className="marginLeft0-5em"
          onClick={onCancel}
          text={t`Cancel`}
        />
      ) : (
        ''
      )}
    </form>
  );
};
