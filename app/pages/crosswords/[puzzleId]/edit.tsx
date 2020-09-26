import { useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { isRight } from 'fp-ts/lib/Either';
import { PathReporter } from 'io-ts/lib/PathReporter';

import { requiresAuth, AuthProps } from '../../../components/AuthContext';
import { PuzzleResult, puzzleFromDB, Direction } from '../../../lib/types';
import { DBPuzzleV, DBPuzzleT } from '../../../lib/dbtypes';
import { App } from '../../../lib/firebaseWrapper';
import { DefaultTopBar } from '../../../components/TopBar';
import { ErrorPage } from '../../../components/ErrorPage';
import { useDocument } from 'react-firebase-hooks/firestore';
import { fromCells, CluedEntry, addClues } from '../../../lib/viewableGrid';
import { sanitizeClue } from '../../../components/ClueMode';
import { Button, ButtonAsLink } from '../../../components/Buttons';

export default requiresAuth((props: AuthProps) => {
  const router = useRouter();
  const { puzzleId } = router.query;
  if (!puzzleId) {
    return <div />;
  }
  if (Array.isArray(puzzleId)) {
    return <ErrorPage title="Bad Puzzle Id" />;
  }
  return <PuzzleLoader key={puzzleId} puzzleId={puzzleId} auth={props} />;
});

// export for testing
export const PuzzleLoader = ({ puzzleId, auth }: { puzzleId: string, auth: AuthProps }) => {
  const [doc, loading, error] = useDocument(App.firestore().doc(`c/${puzzleId}`));
  const [puzzle, puzzleDecodeError] = useMemo(() => {
    if (doc === undefined) {
      return [undefined, undefined];
    }
    if (!doc.exists) {
      return [null, undefined];
    }
    const validationResult = DBPuzzleV.decode(doc.data({ serverTimestamps: 'previous' }));
    if (isRight(validationResult)) {
      const puzzle = validationResult.right;
      return [puzzle, undefined];
    } else {
      console.log(PathReporter.report(validationResult).join(','));
      return [undefined, 'failed to decode puzzle'];
    }
  }, [doc]);

  if (error || puzzleDecodeError) {
    return <ErrorPage title='Something Went Wrong'>
      <p>{error || puzzleDecodeError}</p>
    </ErrorPage >;
  }
  if (loading) {
    return <div>Loading...</div>;
  }
  if (!puzzle) {
    return <ErrorPage title='Something Went Wrong'>
      <p>Failed to load the puzzle!</p>
    </ErrorPage>;
  }

  const nicePuzzle: PuzzleResult = { ...puzzleFromDB(puzzle), id: puzzleId };

  if (!auth.isAdmin && auth.user.uid !== nicePuzzle.authorId) {
    return <ErrorPage title='Not Allowed'>
      <p>You do not have permission to view this page</p>
    </ErrorPage >;
  }

  return <PuzzleEditor key={puzzleId} puzzle={nicePuzzle} dbPuzzle={puzzle} />;
};

const ClueRow = (props: { puzzleId: string, ac: Array<string>, an: Array<number>, dc: Array<string>, dn: Array<number>, entry: CluedEntry }) => {
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [value, setValue] = useState(props.entry.clue);
  const word = props.entry.completedWord;
  if (word === null) {
    throw new Error('shouldn\'t ever get here');
  }

  function handleSubmit(e: React.FormEvent) {
    setSubmitting(true);
    e.preventDefault();
    let update: Record<string, Array<string>>;
    if (props.entry.direction === Direction.Across) {
      update = {
        'ac': props.ac.map((v, i) => {
          if (props.an[i] === props.entry.labelNumber) {
            return value.trim();
          }
          return v;
        })
      };
    } else {
      update = {
        'dc': props.dc.map((v, i) => {
          if (props.dn[i] === props.entry.labelNumber) {
            return value.trim();
          }
          return v;
        })
      };
    }
    App.firestore().doc(`c/${props.puzzleId}`).update(update).then(() => {
      setSubmitting(false);
      setEditing(false);
    });
  }

  return (
    <tr>
      <td css={{
        paddingRight: '1em',
        paddingBottom: '1em',
        textAlign: 'right',
        width: '1px',
      }}>{props.entry.labelNumber}{props.entry.direction === Direction.Down ? 'D' : 'A'}</td>
      <td css={{
        paddingRight: '1em',
        paddingBottom: '1em',
        textAlign: 'right',
        width: '1px',
      }}><label css={{ marginBottom: 0 }} htmlFor={word + '-input'}>{word}</label></td>
      <td css={{ paddingBottom: '1em' }}>{editing ?
        <form onSubmit={handleSubmit}>
          <input id={word + '-input'} type="text" css={{ margin: '0 0.5em' }} placeholder="Enter a clue" value={value} onChange={(e) => {
            setValue(sanitizeClue(e.target.value));
          }} />
          <Button type="submit" text="Save" disabled={submitting || !value.trim()} />
          <Button boring={true} css={{ marginLeft: '0.5em' }} onClick={() => { setEditing(false); setValue(props.entry.clue); }} text="Cancel" />
        </form>
        :
        <>
          <span>{props.entry.clue}</span>
          <ButtonAsLink css={{ marginLeft: '1em' }} text='edit' onClick={() => { setEditing(true); }} />
        </>
      }</td>
    </tr>
  );
};

const PuzzleEditor = ({ puzzle, dbPuzzle }: { puzzle: PuzzleResult, dbPuzzle: DBPuzzleT }) => {
  const grid = useMemo(() => {
    return addClues(fromCells({
      mapper: (e) => e,
      width: puzzle.size.cols,
      height: puzzle.size.rows,
      cells: puzzle.grid,
      allowBlockEditing: false,
      highlighted: new Set(puzzle.highlighted),
      highlight: puzzle.highlight
    }), puzzle.clues);
  }, [puzzle]);
  const clueRows = grid.entries.sort((e1, e2) => e1.direction === e2.direction ? e1.labelNumber - e2.labelNumber : e1.direction - e2.direction).map(e => <ClueRow puzzleId={puzzle.id} key={e.completedWord || ''} entry={e} ac={dbPuzzle.ac} an={dbPuzzle.an} dc={dbPuzzle.dc} dn={dbPuzzle.dn} />);

  return (
    <>
      <Head>
        <title>Editing | {puzzle.title} | Crosshare</title>
      </Head>
      <DefaultTopBar />
      <div css={{ margin: '1em', }}>
        <p>Note: changes may take up to an hour to appear on the site - we cache pages to keep Crosshare fast!</p>
        <h3>Clues</h3>
        <table css={{ width: '100%', }}>
          <tbody>
            {clueRows}
          </tbody>
        </table>
      </div>
    </>
  );
};
