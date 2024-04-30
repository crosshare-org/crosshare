import type { CSSProperties } from 'react';
import { fnv1a } from '../lib/utils';
import { ButtonReset } from './Buttons';
import { Link } from './Link';
import styles from './Tag.module.css';

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
      style={
        {
          '--hue': hue * 360,
        } as CSSProperties
      }
      data-has-hover={Boolean(props.link || onClick)}
      className={styles.tag}
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
          className={styles.removeBtn}
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
      <Link className={styles.link} href={`/tags/${tagName}`}>
        {tag}
      </Link>
    );
  } else {
    return tag;
  }
}
