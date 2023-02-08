import { useState } from 'react';
import { Button, ButtonAsLink } from './Buttons';
import { Markdown } from './Markdown';
import {
  LengthView,
  LengthLimitedInput,
  LengthLimitedTextarea,
} from './Inputs';
import dynamic from 'next/dynamic';
import type { MarkdownPreview as MarkdownPreviewType } from './MarkdownPreview';
import type { Root } from 'hast';

const MarkdownPreview = dynamic(
  () => import('./MarkdownPreview').then((mod) => mod.MarkdownPreview as any) // eslint-disable-line @typescript-eslint/no-explicit-any
) as typeof MarkdownPreviewType;

interface EditableTextPropsBase {
  title: string;
  textarea?: boolean;
  handleSubmit: (value: string) => Promise<void>;
  className?: string;
  maxLength: number;
  hasError?: (value: string) => string;
}
interface EditableTextProps extends EditableTextPropsBase {
  deletable?: false;
  text: string;
  hast: Root | false;
}
interface DeletableEditableTextProps extends EditableTextPropsBase {
  deletable: true;
  text: string | null;
  hast: Root | false | null;
  handleDelete: () => Promise<void>;
}
export const EditableText = (
  props: EditableTextProps | DeletableEditableTextProps
) => {
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [value, setValue] = useState(props.text || '');

  const error = props.hasError?.(value) || '';

  if (editing) {
    return (
      <form
        className={props.className}
        css={{ display: 'flex', flexWrap: 'wrap' }}
        onSubmit={(e: React.FormEvent) => {
          e.preventDefault();
          const toSubmit = value.trim();
          if (toSubmit.length === 0) {
            return;
          }
          setSubmitting(true);
          props.handleSubmit(toSubmit).then(() => {
            setSubmitting(false);
            setEditing(false);
          });
        }}
      >
        {props.textarea ? (
          <>
            <LengthLimitedTextarea
              css={{ width: '100%', display: 'block', marginBottom: '0.5em' }}
              placeholder={`Enter ${props.title} (markdown formatted)`}
              value={value}
              maxLength={props.maxLength}
              updateValue={setValue}
            />
            <LengthView
              hideUntilWithin={30}
              value={value}
              maxLength={props.maxLength}
            />
            <MarkdownPreview markdown={value} />
          </>
        ) : (
          <>
            <LengthLimitedInput
              type="text"
              css={{ marginRight: '0.5em', flex: '1 1 auto' }}
              placeholder={`Enter ${props.title}`}
              value={value}
              maxLength={props.maxLength}
              updateValue={setValue}
            />
            <LengthView
              hideUntilWithin={30}
              value={value}
              maxLength={props.maxLength}
            />
          </>
        )}
        {error ? (
          <span css={{ color: 'var(--error)', margin: 'auto 0.5em' }}>
            {error}
          </span>
        ) : (
          ''
        )}
        <Button
          type="submit"
          text="Save"
          disabled={error !== '' || submitting || !value.trim()}
        />
        <Button
          boring={true}
          css={{ marginLeft: '0.5em' }}
          onClick={() => {
            setEditing(false);
            setValue(props.text || '');
          }}
          text="Cancel"
        />
      </form>
    );
  }

  return (
    <div className={props.className}>
      {!props.text ? (
        <Button
          text="Add"
          title={`Add ${props.title}`}
          onClick={() => {
            setEditing(true);
          }}
        />
      ) : (
        <>
          {props.textarea ? (
            <>
              <div
                css={{
                  backgroundColor: 'var(--secondary)',
                  borderRadius: '0.5em',
                  padding: '1em',
                  margin: '1em 0',
                }}
              >
                {props.hast !== null && props.hast !== false ? (
                  <Markdown hast={props.hast} />
                ) : (
                  <span>{props.text}</span>
                )}
              </div>
              <Button
                text="edit"
                title={`Edit ${props.title}`}
                onClick={() => {
                  setEditing(true);
                }}
              />
              {props.deletable ? (
                <Button
                  css={{ marginLeft: '1em' }}
                  text="delete"
                  title={`Delete ${props.title}`}
                  onClick={props.handleDelete}
                />
              ) : (
                ''
              )}
            </>
          ) : (
            <>
              {props.hast !== null && props.hast !== false ? (
                <Markdown inline hast={props.hast} />
              ) : (
                <span>{props.text}</span>
              )}
              <ButtonAsLink
                css={{ marginLeft: '1em' }}
                text="edit"
                title={`Edit ${props.title}`}
                onClick={() => {
                  setEditing(true);
                }}
              />
              {props.deletable ? (
                <ButtonAsLink
                  css={{ marginLeft: '1em' }}
                  text="delete"
                  title={`Delete ${props.title}`}
                  onClick={props.handleDelete}
                />
              ) : (
                ''
              )}
            </>
          )}
        </>
      )}
    </div>
  );
};
