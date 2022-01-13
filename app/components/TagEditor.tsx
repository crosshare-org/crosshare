import { useState } from 'react';
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

interface TagProps {
  tagName: string;
  remove?: () => void;
  onClick?: () => void;
}
export function Tag(props: TagProps) {
  const hash = fnv1a(props.tagName);
  // foreground is rightmost 17 bits as hue at 80% saturation, 50% brightness
  const hueNumBits = (1 << 17) - 1;
  const hue = (hash & hueNumBits) / hueNumBits;

  return (
    <span
      css={{
        backgroundColor: `hsl(${hue * 360}, 30%, var(--tag-l))`,
        color: 'var(--text)',
        borderRadius: 5,
        padding: '0.2em 0.5em',
      }}
    >
      {props.onClick ? (
        <ButtonReset onClick={props.onClick} text={props.tagName} />
      ) : (
        props.tagName
      )}
      {props.remove ? (
        <ButtonReset
          css={{
            marginLeft: '0.4em',
            paddingLeft: '0.4em',
            borderLeft: '1px solid var(--text)',
          }}
          onClick={props.remove}
          text="🗙"
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

  function addTag(t: string) {
    setTags((prv) => (prv.includes(t) ? prv : [...prv, t]));
  }

  function removeTag(t: string) {
    setTags((prv) => prv.filter((x) => x !== t));
  }

  return (
    <>
      <h4>Auto-tags:</h4>
      <ul css={{ listStyleType: 'none', padding: 0 }}>
        {props.autoTags.map((t) => (
          <li css={{ display: 'inline', marginRight: '1em' }} key={t}>
            <Tag tagName={t} />
          </li>
        ))}
      </ul>
      <h4>Add or Remove Tags (max 5 per puzzle, other than auto-tags):</h4>
      <ul css={{ listStyleType: 'none', padding: 0 }}>
        {tags.map((t) => (
          <li css={{ display: 'inline', marginRight: '0.5em' }} key={t}>
            <Tag
              tagName={t}
              remove={() => {
                removeTag(t);
              }}
            />
          </li>
        ))}
      </ul>
      {tags.length < 5 ? (
        <>
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
          <h5>Frequently used tags:</h5>
          <ul css={{ listStyleType: 'none', padding: 0 }}>
            {['themeless', 'themed', 'cryptic', 'grid-art'].map((t) => (
              <li css={{ display: 'inline', marginRight: '0.5em' }} key={t}>
                <Tag
                  tagName={t}
                  onClick={() => {
                    addTag(t);
                  }}
                />
              </li>
            ))}
          </ul>
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
