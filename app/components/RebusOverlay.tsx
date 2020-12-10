import { Dispatch } from 'react';
import { Overlay } from './Overlay';
import { Button } from './Buttons';
import { KeypressAction } from '../reducers/reducer';

export const RebusOverlay = (props: {
  toggleKeyboard: boolean;
  value: string;
  dispatch: Dispatch<KeypressAction>;
}) => {
  return (
    <Overlay
      toggleKeyboard={props.toggleKeyboard}
      showKeyboard
      closeCallback={() => {
        const escape: KeypressAction = {
          type: 'KEYPRESS',
          key: 'Escape',
          shift: false,
        };
        props.dispatch(escape);
      }}
    >
      <div
        css={{
          color: props.value ? 'var(--black)' : 'var(--default-text)',
          margin: '0.5em 0',
          textAlign: 'center',
          fontSize: '2.5em',
          lineHeight: '1em',
        }}
      >
        {props.value ? props.value : 'Type to enter rebus...'}
      </div>
      <Button
        boring={true}
        onClick={() => {
          const escape: KeypressAction = {
            type: 'KEYPRESS',
            key: 'Escape',
            shift: false,
          };
          props.dispatch(escape);
        }}
        css={{ marginRight: '10%', width: '45%' }}
        text="Cancel"
      />
      <Button
        disabled={props.value.length === 0}
        onClick={() => {
          const enter: KeypressAction = {
            type: 'KEYPRESS',
            key: 'Enter',
            shift: false,
          };
          props.dispatch(enter);
        }}
        css={{ width: '45%' }}
        text="Submit Rebus"
      />
    </Overlay>
  );
};
