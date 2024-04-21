import { updateDoc } from 'firebase/firestore';
import { Dispatch, memo, useState } from 'react';
import { setMiniForDate } from '../lib/dailyMinis';
import { getDateString, prettifyDateString } from '../lib/dbtypes';
import { getDocRef } from '../lib/firebaseWrapper';
import { ServerPuzzleResult } from '../lib/types';
import { logAsyncErrors } from '../lib/utils';
import { PuzzleAction } from '../reducers/commonActions';
import { Overlay } from './Overlay';
import { TagEditor } from './TagEditor';
import { UpcomingMinisCalendar } from './UpcomingMinisCalendar';

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
        <h4 className="colorError">This puzzle is private</h4>
      ) : (
        ''
      )}
      {puzzle.isPrivateUntil && puzzle.isPrivateUntil > new Date().getTime() ? (
        <h4 className="colorError">
          This puzzle is private until{' '}
          {new Date(puzzle.isPrivateUntil).toISOString()}
        </h4>
      ) : (
        ''
      )}
      <div className="marginTop1em">Pick a date to appear as daily mini:</div>
      <UpcomingMinisCalendar
        disableExisting={true}
        value={date}
        onChange={setDate}
      />
      <div className="marginTop1em">
        <button
          disabled={!date || puzzle.moderated || puzzle.isPrivate !== false}
          onClick={logAsyncErrors(schedule)}
        >
          Schedule As Daily Mini
        </button>
      </div>
      <div className="marginTop1em">
        <button
          disabled={puzzle.isPrivate !== false}
          onClick={() => {
            logAsyncErrors(markAsModerated)(true);
          }}
        >
          Set as Featured
        </button>
      </div>
      <div className="marginTop1em">
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
