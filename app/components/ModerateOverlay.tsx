import { useState, Dispatch, memo } from 'react';
import { getDateString, prettifyDateString } from '../lib/dbtypes';
import { ServerPuzzleResult } from '../lib/types';
import { UpcomingMinisCalendar } from './UpcomingMinisCalendar';
import { PuzzleAction } from '../reducers/reducer';
import { Overlay } from './Overlay';
import { setMiniForDate } from '../lib/dailyMinis';
import { TagEditor } from './TagEditor';
import { updateDoc } from 'firebase/firestore';
import { getDocRef } from '../lib/firebaseWrapper';

export const ModeratingOverlay = memo(
  ({
    dispatch,
    puzzle,
  }: {
    puzzle: ServerPuzzleResult;
    dispatch: Dispatch<PuzzleAction>;
  }) => {
    const [date, setDate] = useState<Date | undefined>();
    const [success, setSuccess] = useState(false);

    function schedule() {
      if (!date) {
        throw new Error("shouldn't be able to schedule w/o date");
      }
      const pds = prettifyDateString(getDateString(date));
      setMiniForDate(pds, puzzle.id);
      updateDoc(getDocRef('c', puzzle.id), {
        m: true,
        c: 'dailymini',
        dmd: pds,
      }).then(() => {
        console.log('Scheduled mini');
        setSuccess(true);
      });
    }

    function markAsModerated(featured: boolean) {
      const update = { m: true, c: null, f: featured };
      updateDoc(getDocRef('c', puzzle.id), update).then(() => {
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
        <TagEditor
          userTags={puzzle.userTags || []}
          autoTags={puzzle.autoTags || []}
          save={async (newTags: string[]) =>
            updateDoc(getDocRef('c', puzzle.id), { tg_u: newTags })
          }
        />
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
