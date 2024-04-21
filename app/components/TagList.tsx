import { Tag, TagPropsBase } from './Tag';

interface TagListProps extends TagPropsBase {
  tags: string[];
  className?: string;
}

export function TagList(props: TagListProps) {
  return (
    <ul
      className={props.className}
      css={{
        listStyleType: 'none',
        padding: 0,
        gap: '0.5em',
        display: 'flex',
        flexWrap: 'wrap',
      }}
    >
      {props.tags.map((t) => (
        <li
          css={{
            display: 'inline',
          }}
          key={t}
        >
          <Tag tagName={t} {...props} />
        </li>
      ))}
    </ul>
  );
}
