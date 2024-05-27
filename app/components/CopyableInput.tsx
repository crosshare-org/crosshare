import { useSnackbar } from './Snackbar.js';

export function CopyableInput({ text }: { text: string }) {
  const { showSnackbar } = useSnackbar();

  return (
    <input
      className="cursorPointer width100"
      type="text"
      readOnly
      value={text}
      onFocus={(e) => {
        e.target.select();
      }}
      onClick={() => {
        // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unnecessary-condition
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
