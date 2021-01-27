import { useState } from 'react';
import { Markdown } from './Markdown';
import { Overlay } from './Overlay';
import { ButtonAsLink } from './Buttons';

interface MarkdownPreviewProps {
  markdown: string | null;
}

export function MarkdownPreview(props: MarkdownPreviewProps) {
  const [showing, setShowing] = useState(false);
  return (
    <>
      <ButtonAsLink
        css={{ marginRight: '1em' }}
        text="Preview"
        disabled={!props.markdown}
        onClick={() => setShowing(true)}
      />
      {showing && props.markdown ? (
        <Overlay closeCallback={() => setShowing(false)}>
          <Markdown text={props.markdown} />
        </Overlay>
      ) : (
        ''
      )}
    </>
  );
}
