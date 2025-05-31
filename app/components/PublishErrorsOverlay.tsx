import { Dispatch } from 'react';
import { BuilderState } from '../reducers/builderReducer.js';
import { PuzzleAction } from '../reducers/commonActions.js';
import { Overlay } from './Overlay.js';
import { PublishWarningsList } from './PublishWarningsList.js';

export const PublishErrorsOverlay = ({
  state,
  dispatch,
}: {
  state: BuilderState;
  dispatch: Dispatch<PuzzleAction>;
}) => {
  return (
    <Overlay
      closeCallback={() => {
        dispatch({ type: 'CLEARPUBLISHERRORS' });
      }}
    >
      <>
        <div>Please fix the following errors and try publishing again:</div>
        <ul>
          {state.publishErrors.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ul>
      </>
      {state.publishWarnings.length ? (
        <>
          <div>Warnings:</div>
          <PublishWarningsList warnings={state.publishWarnings} />
        </>
      ) : (
        ''
      )}
    </Overlay>
  );
};
