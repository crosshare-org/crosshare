import { useState, Dispatch, memo } from 'react';
import { getDateString, prettifyDateString } from '../lib/dbtypes';
import { ServerPuzzleResult } from '../lib/types';
import { UpcomingMinisCalendar } from './UpcomingMinisCalendar';
import { App } from '../lib/firebaseWrapper';
import { PuzzleAction } from '../reducers/reducer';
import { Overlay } from './Overlay';

export const ModeratingOverlay = memo(
  ({
    dispatch,
    puzzle,
  }: {
    puzzle: ServerPuzzleResult;
    dispatch: Dispatch<PuzzleAction>;
  }) => {
    const db = App.firestore();
    const [date, setDate] = useState<Date | undefined>();
    const [success, setSuccess] = useState(false);

    function schedule() {
      if (!date) {
        throw new Error("shouldn't be able to schedule w/o date");
      }
      const ds = getDateString(date);
      Promise.all([
        db
          .collection('c')
          .doc(puzzle.id)
          .update({ m: true, c: 'dailymini', dmd: prettifyDateString(ds) }),
      ]).then(() => {
        console.log('Scheduled mini');
        setSuccess(true);
      });
    }

    function markAsModerated(featured: boolean) {
      const update = { m: true, c: null, f: featured };
      db.collection('c')
        .doc(puzzle.id)
        .update(update)
        .then(() => {
          setSuccess(true);
        });
    }

    if (success) {
      return (
        <Overlay closeCallback={() => dispatch({ type: 'TOGGLEMODERATING' })}>
          <h4>Moderated!</h4>
        </Overlay>
      );
    }

    return (
      <Overlay closeCallback={() => dispatch({ type: 'TOGGLEMODERATING' })}>
        <h4>Moderate this Puzzle</h4>
        {puzzle.isPrivate ? (
          <h4 css={{ color: 'var(--error)' }}>This puzzle is private</h4>
        ) : (
          ''
        )}
        {puzzle.isPrivateUntil &&
        puzzle.isPrivateUntil > new Date().getTime() ? (
          <h4 css={{ color: 'var(--error)' }}>
            This puzzle is private until{' '}
            {new Date(puzzle.isPrivateUntil).toISOString()}
          </h4>
        ) : (
          ''
        )}
        <div css={{ marginTop: '1em' }}>
          Pick a date to appear as daily mini:
        </div>
        <UpcomingMinisCalendar
          disableExisting={true}
          value={date}
          onChange={setDate}
        />
        <div css={{ marginTop: '1em' }}>
          <button
            disabled={!date || puzzle.moderated || !!puzzle.isPrivate}
            onClick={schedule}
          >
            Schedule As Daily Mini
          </button>
        </div>
        <div css={{ marginTop: '1em' }}>
          <button
            disabled={!!puzzle.isPrivate}
            onClick={() => markAsModerated(true)}
          >
            Set as Featured
          </button>
        </div>
        <div css={{ marginTop: '1em' }}>
          <button onClick={() => markAsModerated(false)}>
            Mark as Moderated
          </button>
        </div>
      </Overlay>
    );
  }
);
