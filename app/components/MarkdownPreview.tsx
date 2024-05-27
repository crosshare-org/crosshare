import { useState } from 'react';
import { markdownToHast } from '../lib/markdown/markdown.js';
import { ButtonAsLink } from './Buttons.js';
import { Markdown } from './Markdown.js';
import { Overlay } from './Overlay.js';

interface MarkdownPreviewProps {
  markdown: string | null;
}

// This component should only be imported dynamically so that markdownToHast isn't getting pulled into first-load bundles
export function MarkdownPreview(props: MarkdownPreviewProps) {
  const [showing, setShowing] = useState(false);
  return (
    <>
      <ButtonAsLink
        className="marginRight1em"
        text="Preview"
        disabled={!props.markdown}
        onClick={() => {
          setShowing(true);
        }}
      />
      {showing && props.markdown ? (
        <Overlay
          closeCallback={() => {
            setShowing(false);
          }}
        >
          <Markdown hast={markdownToHast({ text: props.markdown })} />
        </Overlay>
      ) : (
        ''
      )}
    </>
  );
}
