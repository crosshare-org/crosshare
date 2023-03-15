import {
  Dispatch,
  forwardRef,
  KeyboardEvent,
  ClipboardEvent,
  useRef,
  RefObject,
} from 'react';

import { KeypressAction, PasteAction } from '../reducers/reducer';
import { fromKeyboardEvent, Key, KeyK } from '../lib/types';
import { isSome } from 'fp-ts/lib/Option';
import useEventListener from '@use-it/event-listener';
import { useForwardRef } from '../lib/hooks';

export const useKeyboard = (): [RefObject<HTMLInputElement>, () => void] => {
  const hiddenInputRef = useRef<HTMLInputElement>(null);
  return [hiddenInputRef, () => hiddenInputRef?.current?.focus()];
};

export const HiddenInput = forwardRef<
  HTMLInputElement,
  {
    dispatch: Dispatch<KeypressAction | PasteAction>;
    handleKeypress?: (k: Key) => boolean;
    enterKeyHint?: 'next' | 'go';
  }
>((props, fwdRef) => {
  const ref = useForwardRef(fwdRef);
  /* React doesn't seem to use the native beforeinput event for onBeforeInput
   * and as a result it wasn't working on android. The event should already have
   * been swallowed by onKeyDown anytime we get that event (i.e. non android). */
  useEventListener(
    'beforeinput',
    (e: InputEvent) => {
      e.preventDefault();
      if (e.data?.length) {
        // Input of more than one char is a swipe, otherwise keypress.
        if (e.data.length > 1) {
          props.dispatch({
            type: 'KEYPRESS',
            key: { k: KeyK.SwipeEntry, t: e.data },
          });
        } else {
          const mkey = fromKeyboardEvent({ key: e.data }, false);
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
        }
      }
    },
    ref?.current
  );
  return (
    <input
      // Don't ever let this input change - the onChange handler is just to keep react from yelling at us.
      value={''}
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      onChange={() => {}}

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
    />
  );
});
