import { clsx } from '../lib/utils';
import { Tag, TagPropsBase } from './Tag';
import styles from './TagList.module.css';

interface TagListProps extends TagPropsBase {
  tags: string[];
  className?: string;
}

export function TagList(props: TagListProps) {
  return (
    <ul className={clsx(props.className, styles.taglist)}>
      {props.tags.map((t) => (
        <li className="displayInline" key={t}>
          <Tag tagName={t} {...props} />
        </li>
      ))}
    </ul>
  );
}
