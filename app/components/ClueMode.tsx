import { Dispatch } from 'react';

import { SpinnerFinished } from './Icons';
import { BuilderEntry, SetClueAction, SetTitleAction, PuzzleAction } from '../reducers/reducer';
import { TopBarLink, TopBar } from './TopBar';
import { buttonAsLink } from '../lib/style';
import { Direction } from '../lib/types';

function sanitize(input: string) {
  return input.substring(0, 140);
}

const ClueRow = (props: { dispatch: Dispatch<PuzzleAction>, entry: BuilderEntry, clues: Record<string, string> }) => {
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
        width: '1px',
      }}>{props.entry.labelNumber}{props.entry.direction === Direction.Down ? 'D' : 'A'}</td>
      <td css={{
        paddingRight: '1em',
        paddingBottom: '1em',
        textAlign: 'right',
        width: '1px',
      }}><label css={{ marginBottom: 0 }} htmlFor={props.entry.completedWord + '-input'}>{props.entry.completedWord}</label></td>
      <td css={{ paddingBottom: '1em' }}><input id={props.entry.completedWord + '-input'} type="text" css={{ width: '100%' }} placeholder="Enter a clue" value={props.clues[word] || ''} onChange={(e) => {
        const sca: SetClueAction = { type: 'SETCLUE', word: word, clue: sanitize(e.target.value) };
        props.dispatch(sca);
      }} /></td>
    </tr>
  );
};

interface ClueModeProps {
  title: string | null,
  exitClueMode: () => void,
  completedEntries: Array<BuilderEntry>,
  clues: Record<string, string>,
  dispatch: Dispatch<PuzzleAction>,
}
export const ClueMode = (props: ClueModeProps) => {
  const clueRows = props.completedEntries.sort((e1, e2) => e1.direction === e2.direction ? e1.labelNumber - e2.labelNumber : e1.direction - e2.direction).map(e => <ClueRow key={e.completedWord || ''} dispatch={props.dispatch} entry={e} clues={props.clues} />);
  return (
    <>
      <TopBar>
        <TopBarLink icon={<SpinnerFinished />} text="Back to Grid" onClick={props.exitClueMode} />
      </TopBar>
      <div css={{ padding: '1em' }}>
        <label css={{ width: '100%' }}>
          <h2>Title</h2>
          <input type="text" css={{ width: '100%', marginBottom: '1.5em' }} placeholder="Give your puzzle a title" value={props.title || ''} onChange={(e) => {
            const sta: SetTitleAction = { type: 'SETTITLE', value: sanitize(e.target.value) };
            props.dispatch(sta);
          }} />
        </label>
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
