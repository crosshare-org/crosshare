import { Dispatch, useState } from 'react';

import { SpinnerFinished } from './Icons';
import { BuilderEntry, SetClueAction, SetTitleAction, SetNotesAction, PuzzleAction, SetBlogPostAction } from '../reducers/reducer';
import { TopBarLink, TopBar } from './TopBar';
import { Direction } from '../lib/types';
import { ButtonAsLink } from './Buttons';
import { Overlay } from './Overlay';
import { Markdown } from './Markdown';
import { ImageCropper } from './ImageCropper';
import { COVER_PIC } from '../lib/style';

export function sanitizeClue(input: string) {
  return input.substring(0, 140);
}
export function sanitizeTitle(input: string) {
  return input.substring(0, 140);
}
export function sanitizeConstructorNotes(input: string) {
  return input.substring(0, 200);
}
export function sanitizeBlogPost(input: string) {
  return input.substring(0, 20000);
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
        const sca: SetClueAction = { type: 'SETCLUE', word: word, clue: sanitizeClue(e.target.value) };
        props.dispatch(sca);
      }} /></td>
    </tr>
  );
};

interface ClueModeProps {
  title: string | null,
  notes: string | null,
  blogPost: string | null,
  exitClueMode: () => void,
  authorId: string,
  puzzleId: string,
  completedEntries: Array<BuilderEntry>,
  clues: Record<string, string>,
  dispatch: Dispatch<PuzzleAction>,
}
export const ClueMode = (props: ClueModeProps) => {
  const [showPostPreview, setShowPostPreview] = useState(false);
  const [settingCoverPic, setSettingCoverPic] = useState(false);

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
            const sta: SetTitleAction = { type: 'SETTITLE', value: sanitizeTitle(e.target.value) };
            props.dispatch(sta);
          }} />
        </label>
        <p><ButtonAsLink onClick={() => setSettingCoverPic(true)} text="Add/edit cover pic" /></p>
        {settingCoverPic ?
          <ImageCropper targetSize={COVER_PIC} isCircle={false} storageKey={`/users/${props.authorId}/${props.puzzleId}/cover.jpg`} cancelCrop={() => setSettingCoverPic(false)} />
          : ''}
        {props.notes !== null ?
          <>
            <h2>Note</h2>
            <input type="text" css={{ width: '100%', marginBottom: '1.5em' }} placeholder="Add a note" value={props.notes} onChange={(e) => {
              const sta: SetNotesAction = { type: 'SETNOTES', value: sanitizeConstructorNotes(e.target.value) };
              props.dispatch(sta);
            }} />
            <p><ButtonAsLink text="Remove note" onClick={() => {
              const sna: SetNotesAction = { type: 'SETNOTES', value: null };
              props.dispatch(sna);
            }} /></p>
          </>
          :
          <p><ButtonAsLink text="Add a note" onClick={() => {
            const sna: SetNotesAction = { type: 'SETNOTES', value: '' };
            props.dispatch(sna);
          }} /> (notes are shown before a puzzle is started and should be used if you need a short explainer of the theme or how the puzzle works)</p>
        }
        {props.blogPost !== null ?
          <>
            <h2>Blog Post</h2>
            <p>Blog posts are shown before solvers are finished with your puzzle. If you include spoilers you can hide them <code>||like this||</code>.</p>
            <textarea css={{ width: '100%', display: 'block', marginBottom: '1em' }} placeholder='Your post text (markdown format)' value={props.blogPost} onChange={(e) => {
              const sta: SetBlogPostAction = { type: 'SETBLOGPOST', value: sanitizeBlogPost(e.target.value) };
              props.dispatch(sta);
            }} />
            <p>
              {props.blogPost ?
                <ButtonAsLink css={{ marginRight: '1em' }} text="Preview" onClick={() => setShowPostPreview(true)} />
                : ''}
              <ButtonAsLink text="Remove blog post" onClick={() => {
                const sna: SetBlogPostAction = { type: 'SETBLOGPOST', value: null };
                props.dispatch(sna);
              }} /></p>
          </>
          :
          <p><ButtonAsLink text="Add a blog post" onClick={() => {
            const sna: SetBlogPostAction = { type: 'SETBLOGPOST', value: '' };
            props.dispatch(sna);
          }} /> (blog posts are shown before and after the puzzle is solved - describe how you came up with the puzzle, talk about your day, whatever you want!)</p>
        }
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
            <p>Go back to <ButtonAsLink text="the grid" onClick={(e) => { props.exitClueMode(); e.preventDefault(); }} /> and fill in one or more words completely. Then come back here and make some clues.</p>
          </>
        }
      </div>
      {showPostPreview && props.blogPost ?
        <Overlay closeCallback={() => setShowPostPreview(false)}>
          <Markdown text={props.blogPost} />
        </Overlay>
        : ''}
    </>
  );
};
