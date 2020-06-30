export const ProgressBar = (props: { percentDone: number }) => {
  return <div css={{
    height: '2em',
    position: 'relative',
    background: 'var(--secondary)', /* TODO handle dark mode! */
    borderRadius: '0.25em',
    padding: '0.25em',
    border: '1px solid var(--default-text)'
  }}>
    <span css={{
      width: props.percentDone + '%',
      display: 'block',
      height: '100%',
      backgroundColor: 'var(--primary)',
      position: 'relative',
      overflow: 'hidden',
    }} />
  </div>;
};
