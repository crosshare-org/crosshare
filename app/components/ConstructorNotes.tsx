import { Markdown } from './Markdown';

export const ConstructorNotes = (props: { notes: string }) => (
  <Markdown
    css={{
      backgroundColor: 'var(--secondary)',
      padding: '0.5em',
      borderRadius: '0.5em',
    }}
    text={`**Constructor's Note:** ${props.notes}`}
  />
);
