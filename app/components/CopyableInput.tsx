import { useSnackbar } from './Snackbar';

export function CopyableInput({ text }: { text: string }) {
  const { showSnackbar } = useSnackbar();

  return (
    <input
      css={{
        cursor: 'pointer',
        width: '100%',
      }}
      type="text"
      readOnly
      value={text}
      onFocus={(e) => {
        e.target.select();
      }}
      onClick={() => {
        // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
        if (navigator.clipboard) {
          navigator.clipboard.writeText(text).then(
            function () {
              showSnackbar('Copied to clipboard');
            },
            function (err) {
              console.error('Could not copy text: ', err);
            }
          );
        } else {
          console.error('No navigator.clipboard');
        }
      }}
    />
  );
}
