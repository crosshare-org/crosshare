export const ConstructorNotes = (props: { notes: string }) => {
  return <p css={{
    backgroundColor: 'var(--secondary)',
    padding: '0.5em',
    borderRadius: '0.5em',
  }}><b>Constructor&apos;s Note:</b> {props.notes}</p>;
};
