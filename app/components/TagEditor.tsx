import { useEffect, useState } from 'react';
import { getFromSessionOrDB } from '../lib/dbUtils';
import {
  eqSet,
  normalizeTag,
  TAG_LENGTH_LIMIT,
  TAG_LENGTH_MIN,
} from '../lib/utils';
import { Button } from './Buttons';
import { LengthView } from './Inputs';
import { useSnackbar } from './Snackbar';
import * as t from 'io-ts';
import { TagList } from './TagList';

interface TagEditorBaseProps {
  save: (newTags: string[]) => Promise<void>;
  cancel?: () => void;
}

interface TagEditorUserProps extends TagEditorBaseProps {
  userTags: string[];
  autoTags: string[];
  forced?: false;
}

interface TagEditorForcedProps extends TagEditorBaseProps {
  forcedTags: string[];
  forced: true;
}

type TagEditorProps = TagEditorForcedProps | TagEditorUserProps;

export function TagEditor(props: TagEditorProps) {
  const { showSnackbar } = useSnackbar();
  const [savedTags, setSavedTags] = useState(
    props.forced ? props.forcedTags : props.userTags
  );
  const [tags, setTags] = useState(
    props.forced ? props.forcedTags : props.userTags
  );
  const [newTag, setNewTag] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(!props.forced);
  const [disallowed, setDisallowed] = useState<string[]>([]);

  useEffect(() => {
    if (props.forced) {
      // If we're editing forced tags then anything goes!
      return;
    }
    let didCancel = false;
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
      .catch((e: unknown) => {
        if (didCancel) {
          return;
        }
        console.log(e);
        setError(String(e));
        setLoading(false);
      });
    return () => {
      didCancel = true;
    };
  }, [props.forced]);

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
      {props.forced ? (
        <></>
      ) : (
        <>
          <h4>Auto-tags:</h4>
          <TagList tags={props.autoTags} />
        </>
      )}

      <h4>Add or Remove Tags (max 5 per puzzle, other than auto-tags):</h4>
      <TagList
        tags={tags}
        remove={(t) => {
          removeTag(t);
        }}
      />
      {tags.length < 5 ? (
        <>
          <div className="marginTop1em">
            <input
              type="text"
              placeholder={`New tag name`}
              value={newTag}
              onChange={(e) => {
                setNewTag(
                  e.target.value
                    .toLowerCase()
                    .replace(/[^a-z0-9-]/g, '')
                    .slice(0, TAG_LENGTH_LIMIT)
                );
              }}
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
          {props.forced ? (
            ''
          ) : (
            <>
              <h5 className="marginTop1em">Example tags:</h5>
              <TagList
                tags={['themeless', 'themed', 'cryptic', 'grid-art', 'lang-es']}
                onClick={(t) => {
                  addTag(t);
                }}
              />
            </>
          )}
        </>
      ) : (
        <p>You must remove an existing tag if you want to add any new ones.</p>
      )}
      <div className="marginTop1em">
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
              })
              .catch((e: unknown) => {
                console.error('error saving tags', e);
              });
          }}
          disabled={eqSet(new Set(tags), new Set(savedTags))}
          text="Save tags"
        />
        {props.cancel ? (
          <Button
            boring={true}
            className="marginLeft0-5em"
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
