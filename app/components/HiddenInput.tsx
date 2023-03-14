import {
  Dispatch,
  forwardRef,
  KeyboardEvent,
  ClipboardEvent,
  SyntheticEvent,
  useRef,
  RefObject,
} from 'react';

import { KeypressAction, PasteAction } from '../reducers/reducer';
import { fromKeyboardEvent, Key, KeyK } from '../lib/types';
import { isSome } from 'fp-ts/lib/Option';

interface BeforeInputEvent extends SyntheticEvent {
  data?: string;
}

export const useKeyboard = (): [RefObject<HTMLInputElement>, () => void] => {
  const hiddenInputRef = useRef<HTMLInputElement>(null);
  return [hiddenInputRef, () => hiddenInputRef?.current?.focus()];
};

export const HiddenInput = forwardRef<
  HTMLInputElement,
  {
    dispatch: Dispatch<KeypressAction|PasteAction>,
    handleKeypress?: (k: Key) => boolean,
    enterKeyHint?: 'next' | 'go',
  }
>((props, ref) => {
  return (
    <input
      autoComplete="off"
      autoCapitalize="characters"
      autoCorrect="off"
      spellCheck={false}
      css={{
        width: 1,
        height: 1,
        padding: 0,
        margin: -1,
        overflow: 'hidden',
        clip: 'rect(0, 0, 0, 0)',
        whiteSpace: 'nowrap',
        border: 0,
        position: 'absolute',
        zIndex: 99,
      }}
      enterKeyHint={props.enterKeyHint || 'next'}
      tabIndex={0}
      ref={ref}
      onKeyDown={(e: KeyboardEvent) => {
        const mkey = fromKeyboardEvent(e, false);
        if (isSome(mkey)) {
          e.preventDefault();
          if (props.handleKeypress) {
            if (props.handleKeypress(mkey.value)) {
              return;
            }
          }
          const kpa: KeypressAction = { type: 'KEYPRESS', key: mkey.value };
          props.dispatch(kpa);
        }
      }}
      onPaste={(e: ClipboardEvent) => {
        const pa: PasteAction = {
          type: 'PASTE',
          content: e.clipboardData?.getData('Text') || '',
        };
        props.dispatch(pa);
        e.preventDefault();
  
      }}
      onBeforeInput={(e: BeforeInputEvent) => {
        e.preventDefault();
        if (e.data?.length) {
          props.dispatch({
            type: 'KEYPRESS',
            key: { k: KeyK.SwipeEntry, t: e.data },
          });
        }
      }}
    />
  );
});