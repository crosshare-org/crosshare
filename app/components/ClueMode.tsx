import { Dispatch } from 'react';

import { SpinnerFinished } from './Icons';
import { BuilderEntry, SetClueAction, PuzzleAction } from '../reducers/reducer';
import { TopBarLink, TopBar } from './TopBar';
import { buttonAsLink } from '../lib/style';

function sanitizeClue(input: string) {
  return input.substring(0, 250);
}

const ClueRow = (props: { dispatch: Dispatch<PuzzleAction>, entry: BuilderEntry, clues: Map<string, string> }) => {
  const word = props.entry.completedWord;
  if (word === null) {
    throw new Error('shouldn\'t ever get here');
  }
  return (
    <tr>
      <td css={{
        paddingRight: '1em',
        paddingBottom: '1em',
        textAlign: 'right',
        width: '1px'
      }}>{props.entry.completedWord}</td>
      <td css={{ paddingBottom: '1em' }}><input css={{ width: '100%' }} placeholder="Enter a clue" value={props.clues.get(word) || ''} onChange={(e) => {
        const sca: SetClueAction = { type: 'SETCLUE', word: word, clue: sanitizeClue(e.target.value) };
        props.dispatch(sca);
      }} /></td>
    </tr>
  );
};

interface ClueModeProps {
  title: string | null,
  exitClueMode: () => void,
  completedEntries: Array<BuilderEntry>,
  clues: Map<string, string>,
  dispatch: Dispatch<PuzzleAction>,
}
export const ClueMode = (props: ClueModeProps) => {
  const clueRows = props.completedEntries.map(e => <ClueRow key={e.completedWord || ''} dispatch={props.dispatch} entry={e} clues={props.clues} />);
  return (
    <>
      <TopBar>
        <TopBarLink icon={<SpinnerFinished />} text="Back to Grid" onClick={props.exitClueMode} />
      </TopBar>
      <div css={{ padding: '1em' }}>
        <h2>Clues</h2>
        {props.completedEntries.length ?
          <table css={{ width: '100%', }}>
            <tbody>
              {clueRows}
            </tbody>
          </table>
          :
          <>
            <p>This where you come to set clues for your puzzle, but you don&apos;t have any completed fill words yet!</p>
            <p>Go back to <button css={buttonAsLink} onClick={(e) => { props.exitClueMode(); e.preventDefault(); }}>the grid</button> and fill in one or more words completely. Then come back here and make some clues.</p>
          </>
        }
      </div>
    </>
  );
};
