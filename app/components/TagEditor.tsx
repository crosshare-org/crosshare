import { useEffect, useState } from 'react';
import { getFromSessionOrDB } from '../lib/dbUtils';
import {
  eqSet,
  fnv1a,
  normalizeTag,
  TAG_LENGTH_LIMIT,
  TAG_LENGTH_MIN,
} from '../lib/utils';
import { Button, ButtonReset } from './Buttons';
import { LengthView } from './Inputs';
import { useSnackbar } from './Snackbar';
import * as t from 'io-ts';

interface TagPropsBase {
  remove?: (t: string) => void;
  onClick?: (t: string) => void;
}

interface TagListProps extends TagPropsBase {
  tags: string[];
}

export function TagList(props: TagListProps) {
  return (
    <ul
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

interface TagProps extends TagPropsBase {
  tagName: string;
}
export function Tag({ tagName, onClick, remove }: TagProps) {
  const hash = fnv1a(tagName);
  // foreground is rightmost 17 bits as hue at 80% saturation, 50% brightness
  const hueNumBits = (1 << 17) - 1;
  const hue = (hash & hueNumBits) / hueNumBits;

  return (
    <span
      css={{
        whiteSpace: 'nowrap',
        backgroundColor: `hsl(${hue * 360}, 30%, var(--tag-l))`,
        color: 'var(--text)',
        borderRadius: 5,
        padding: '0.2em 0.5em',
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
}

interface TagEditorProps {
  userTags: Array<string>;
  autoTags: Array<string>;
  save: (newTags: Array<string>) => Promise<void>;
  cancel?: () => void;
}

export function TagEditor(props: TagEditorProps) {
  const { showSnackbar } = useSnackbar();
  const [savedTags, setSavedTags] = useState(props.userTags);
  const [tags, setTags] = useState(props.userTags);
  const [newTag, setNewTag] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [disallowed, setDisallowed] = useState<string[]>([]);

  useEffect(() => {
    let didCancel = false;

    const fetchData = async () => {
      getFromSessionOrDB({
        collection: 'settings',
        docId: 'tags',
        validator: t.type({ disallowed: t.array(t.string) }),
        ttl: 30 * 60 * 1000,
      })
        .then((s) => {
          if (didCancel) {
            return;
          }
          if (!s) {
            setError('Could not load settings');
            setLoading(false);
          } else {
            setDisallowed(s.disallowed);
            setLoading(false);
          }
        })
        .catch((e) => {
          if (didCancel) {
            return;
          }
          console.log(e);
          setError(e);
          setLoading(false);
        });
    };
    fetchData();
    return () => {
      didCancel = true;
    };
  }, []);

  function addTag(t: string) {
    if (disallowed.includes(t)) {
      showSnackbar('Sorry, that tag is reserved.');
    } else {
      setTags((prv) => (prv.includes(t) ? prv : [...prv, t]));
    }
  }

  function removeTag(t: string) {
    setTags((prv) => prv.filter((x) => x !== t));
  }

  if (loading) {
    return <p>Loading tag editor</p>;
  }
  if (error) {
    return <p>Failed to load tag editor: {error}. Please try again</p>;
  }

  return (
    <>
      <h4>Auto-tags:</h4>
      <TagList tags={props.autoTags} />

      <h4>Add or Remove Tags (max 5 per puzzle, other than auto-tags):</h4>
      <TagList
        tags={tags}
        remove={(t) => {
          removeTag(t);
        }}
      />
      {tags.length < 5 ? (
        <>
          <div css={{ marginTop: '1em' }}>
            <input
              type="text"
              placeholder={`New tag name`}
              value={newTag}
              onChange={(e) =>
                setNewTag(
                  e.target.value
                    .toLowerCase()
                    .replace(/[^a-z0-9-]/g, '')
                    .slice(0, TAG_LENGTH_LIMIT)
                )
              }
            />
            <LengthView value={newTag} maxLength={TAG_LENGTH_LIMIT} />
            <Button
              onClick={() => {
                addTag(normalizeTag(newTag));
                setNewTag('');
              }}
              text="Add tag"
              disabled={newTag.length < TAG_LENGTH_MIN}
            />
          </div>
          <h5 css={{ marginTop: '1em' }}>Example tags:</h5>
          <TagList
            tags={['themeless', 'themed', 'cryptic', 'grid-art', 'lang-es']}
            onClick={(t) => {
              addTag(t);
            }}
          />
        </>
      ) : (
        <p>You must remove an existing tag if you want to add any new ones.</p>
      )}
      <div css={{ marginTop: '1em' }}>
        <Button
          onClick={() => {
            props
              .save(
                Array.from(
                  new Set(tags.map(normalizeTag).filter((s) => s.length > 2))
                )
              )
              .then(() => {
                setSavedTags(tags);
                showSnackbar('Saved tags');
              });
          }}
          disabled={eqSet(new Set(tags), new Set(savedTags))}
          text="Save tags"
        />
        {props.cancel ? (
          <Button
            boring={true}
            css={{ marginLeft: '0.5em' }}
            onClick={props.cancel}
            text="Cancel"
          />
        ) : (
          ''
        )}
      </div>
    </>
  );
}
