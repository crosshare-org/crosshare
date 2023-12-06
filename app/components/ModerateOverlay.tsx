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
import { logAsyncErrors } from '../lib/utils';

export const ModeratingOverlay = memo(function ModeratingOverlay({
  dispatch,
  puzzle,
}: {
  puzzle: ServerPuzzleResult;
  dispatch: Dispatch<PuzzleAction>;
}) {
  const [date, setDate] = useState<Date | undefined>();
  const [success, setSuccess] = useState(false);

  const [forcedTagEditor, setForcedTagEditor] = useState(false);

  async function schedule() {
    if (!date) {
      throw new Error("shouldn't be able to schedule w/o date");
    }
    const pds = prettifyDateString(getDateString(date));
    setMiniForDate(pds, puzzle.id);
    await updateDoc(getDocRef('c', puzzle.id), {
      m: true,
      c: 'dailymini',
      dmd: pds,
    }).then(() => {
      console.log('Scheduled mini');
      setSuccess(true);
    });
  }

  async function markAsModerated(featured: boolean) {
    const update = { m: true, c: null, f: featured };

    // The right fix for this (and the other two places we do it) is here:
    //   https://github.com/firebase/firebase-js-sdk/pull/7310
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await updateDoc(getDocRef('c', puzzle.id), update as any).then(() => {
      setSuccess(true);
    });
  }

  if (success) {
    return (
      <Overlay
        closeCallback={() => {
          dispatch({ type: 'TOGGLEMODERATING' });
        }}
      >
        <h4>Moderated!</h4>
      </Overlay>
    );
  }

  return (
    <Overlay
      closeCallback={() => {
        dispatch({ type: 'TOGGLEMODERATING' });
      }}
    >
      <h4>Moderate this Puzzle</h4>
      {forcedTagEditor ? (
        <>
          {' '}
          <TagEditor
            forcedTags={puzzle.forcedTags || []}
            forced={true}
            save={async (newTags: string[]) =>
              updateDoc(getDocRef('c', puzzle.id), { tg_f: newTags })
            }
          />
          <button
            onClick={() => {
              setForcedTagEditor(false);
            }}
          >
            Edit normal tags
          </button>
        </>
      ) : (
        <>
          <TagEditor
            userTags={puzzle.userTags || []}
            autoTags={puzzle.autoTags || []}
            save={async (newTags: string[]) =>
              updateDoc(getDocRef('c', puzzle.id), { tg_u: newTags })
            }
          />
          <button
            onClick={() => {
              setForcedTagEditor(true);
            }}
          >
            Edit forced tags
          </button>
        </>
      )}
      {puzzle.isPrivate !== false ? (
        <h4 css={{ color: 'var(--error)' }}>This puzzle is private</h4>
      ) : (
        ''
      )}
      {puzzle.isPrivateUntil && puzzle.isPrivateUntil > new Date().getTime() ? (
        <h4 css={{ color: 'var(--error)' }}>
          This puzzle is private until{' '}
          {new Date(puzzle.isPrivateUntil).toISOString()}
        </h4>
      ) : (
        ''
      )}
      <div css={{ marginTop: '1em' }}>Pick a date to appear as daily mini:</div>
      <UpcomingMinisCalendar
        disableExisting={true}
        value={date}
        onChange={setDate}
      />
      <div css={{ marginTop: '1em' }}>
        <button
          disabled={!date || puzzle.moderated || puzzle.isPrivate !== false}
          onClick={logAsyncErrors(schedule)}
        >
          Schedule As Daily Mini
        </button>
      </div>
      <div css={{ marginTop: '1em' }}>
        <button
          disabled={puzzle.isPrivate !== false}
          onClick={() => {
            logAsyncErrors(markAsModerated)(true);
          }}
        >
          Set as Featured
        </button>
      </div>
      <div css={{ marginTop: '1em' }}>
        <button
          onClick={() => {
            logAsyncErrors(markAsModerated)(false);
          }}
        >
          Mark as Moderated
        </button>
      </div>
    </Overlay>
  );
});
