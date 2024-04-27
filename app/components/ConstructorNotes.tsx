import type { Root } from 'hast';
import styles from './ConstructorNotes.module.css';
import { Markdown } from './Markdown';

export const ConstructorNotes = (props: {
  isContest?: boolean;
  notes: Root;
}) => {
  return (
    <div className={styles.note}>
      <b>{props.isContest ? 'Meta Prompt' : "Constructor's Note"}</b>
      <Markdown hast={props.notes} />
    </div>
  );
};
