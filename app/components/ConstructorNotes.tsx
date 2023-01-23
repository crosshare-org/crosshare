import type { Root } from 'hast';
import { Markdown } from './Markdown';

export const ConstructorNotes = (props: {
  isContest?: boolean;
  notes: Root;
}) => {
  return (
    <div
      css={{
        backgroundColor: 'var(--secondary)',
        padding: '0.5em',
        margin: '1em 0 2em',
        borderRadius: '0.5em',
      }}
    >
      <b>{props.isContest ? 'Meta Prompt' : "Constructor's Note"}</b>
      <Markdown hast={props.notes} />
    </div>
  );
};
