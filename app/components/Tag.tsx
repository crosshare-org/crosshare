import { fnv1a } from '../lib/utils';
import { ButtonReset } from './Buttons';
import { Link } from './Link';

export interface TagPropsBase {
  link?: boolean;
  remove?: (t: string) => void;
  onClick?: (t: string) => void;
}

interface TagProps extends TagPropsBase {
  tagName: string;
}

export function Tag({ tagName, onClick, remove, ...props }: TagProps) {
  const hash = fnv1a(tagName);
  // foreground is rightmost 17 bits as hue at 80% saturation, 50% brightness
  const hueNumBits = (1 << 17) - 1;
  const hue = (hash & hueNumBits) / hueNumBits;

  const tag = (
    <span
      css={{
        whiteSpace: 'nowrap',
        backgroundColor: `hsl(${hue * 360}, 30%, var(--tag-l))`,
        color: 'var(--text)',
        borderRadius: 5,
        padding: '0.2em 0.5em',
        ...((props.link || onClick) && {
          '&:hover': {
            backgroundColor: `hsl(${hue * 360}, 60%, var(--tag-l))`,
          },
        }),
      }}
    >
      {onClick ? (
        <ButtonReset
          onClick={() => {
            onClick(tagName);
          }}
          text={tagName}
        />
      ) : (
        tagName
      )}
      {remove ? (
        <ButtonReset
          css={{
            marginLeft: '0.4em',
            paddingLeft: '0.4em',
            borderLeft: '1px solid var(--text)',
          }}
          onClick={() => {
            remove(tagName);
          }}
          text="&#x2715;"
        />
      ) : (
        ''
      )}
    </span>
  );
  if (props.link) {
    return (
      <Link
        css={{ '&:hover': { textDecoration: 'none' } }}
        href={`/tags/${tagName}`}
      >
        {tag}
      </Link>
    );
  } else {
    return tag;
  }
}
