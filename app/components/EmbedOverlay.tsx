import { Dispatch, useMemo, useState, useCallback } from 'react';
import { Direction, ServerPuzzleResult } from '../lib/types';
import { PuzzleAction } from '../reducers/reducer';
import { Overlay } from './Overlay';
import type firebase from 'firebase/app';
import { CopyableInput } from './CopyableInput';
import { EmbedOptionsT } from '../lib/embedOptions';
import { colorTheme, PRIMARY } from '../lib/style';
import { adjustHue, parseToRgba } from 'color2k';
import { GridView } from './Grid';
import { fromCells } from '../lib/viewableGrid';
import { Button } from './Buttons';
import { App } from '../lib/firebaseWrapper';

export const EmbedOverlay = ({
  dispatch,
  puzzle,
  user,
}: {
  puzzle: ServerPuzzleResult;
  dispatch: Dispatch<PuzzleAction>;
  user: firebase.User;
}) => {
  return (
    <Overlay closeCallback={() => dispatch({ type: 'TOGGLEEMBEDOVERLAY' })}>
      <h2>Embed this Puzzle</h2>
      <p>
        Crosshare embedding is a newly launched feature - please get in touch
        via{' '}
        <a
          target="_blank"
          rel="noopener noreferrer"
          href="mailto:crosshareapp@gmail.com"
        >
          email
        </a>{' '}
        or{' '}
        <a
          target="_blank"
          rel="noopener noreferrer"
          href="https://twitter.com/crosshareapp"
        >
          twitter
        </a>{' '}
        if you have any issues, questions, or suggestions!
      </p>
      <p>
        To embed your puzzle copy and paste the following HTML into your
        site&apos;s code. You can change the width and height parameters as
        needed, but we recommend giving your puzzle at least 600px of width when
        displaying on desktop (otherwise Crosshare will transition to the mobile
        interface).
      </p>
      <CopyableInput
        text={`<iframe width="100%" height="700" src="https://crosshare.org/embed/${puzzle.id}/${user.uid}" frameborder="0" allowfullscreen="true" allowtransparency="true"></iframe>`}
      />
      <h3 css={{ marginTop: '1em' }}>Theme</h3>
      <ThemePicker userId={user.uid} />
    </Overlay>
  );
};

interface SwatchProps {
  color: string;
  selected: string;
  select: () => void;
}
const Swatch = (props: SwatchProps) => {
  const isSelected = props.color === props.selected;
  return (
    <div
      role="button"
      tabIndex={0}
      css={{
        display: 'inline-block',
        width: isSelected ? '1.5em' : '1em',
        height: isSelected ? '1.5em' : '1em',
        margin: isSelected ? 0 : '0.25em 0.25em',
        borderRadius: '0.25em',
        backgroundColor: props.color,
        cursor: 'pointer',
        '&: hover': {
          width: isSelected ? '1.5em' : '1.25em',
          height: isSelected ? '1.5em' : '1.25em',
          margin: isSelected ? 0 : '0.125em 0.125em',
        },
      }}
      onClick={props.select}
      onKeyPress={props.select}
    />
  );
};

const NUMSWATCHES = 36;

const ThemePicker = (props: EmbedOptionsT & { userId: string }) => {
  const [isDark, setIsDark] = useState(props.d || false);
  const [primary, setPrimary] = useState(props.p || PRIMARY);
  const [saving, setSaving] = useState(false);
  // Just ensure color is parseable, this'll throw if not:
  parseToRgba(primary);

  const saveTheme = useCallback(() => {
    const theme: EmbedOptionsT = {
      p: primary,
      d: isDark,
    };
    setSaving(true);
    App.firestore()
      .doc(`em/${props.userId}`)
      .set(theme)
      .then(() => {
        setSaving(false);
      });
  }, [isDark, primary, props.userId]);

  const dummyGrid = useMemo(() => {
    return fromCells({
      width: 3,
      height: 3,
      cells: ['M', 'E', 'L', ' ', ' ', '.', 'O', 'T', ' '],
      allowBlockEditing: false,
      highlighted: new Set<number>(),
      highlight: 'circle',
      mapper: (x) => x,
    });
  }, []);

  const swatches = [];
  for (let i = 0; i < NUMSWATCHES; i += 1) {
    const color = adjustHue(PRIMARY, (i * 360) / NUMSWATCHES);
    swatches.push(
      <Swatch
        key={i}
        color={color}
        select={() => setPrimary(color)}
        selected={primary}
      />
    );
  }

  return (
    <>
      <p>
        Your theme choices apply to <b>all</b> of your embeds, including
        pre-existing embeds. If you need to use a one-off theme please get in
        touch and we can help.
      </p>
      <h4>Colors</h4>
      {swatches}
      <div>
        <label>
          <input
            css={{ marginRight: '1em' }}
            type="checkbox"
            checked={isDark}
            onChange={(e) => setIsDark(e.target.checked)}
          />
          Dark Mode
        </label>
      </div>
      <Button
        onClick={saveTheme}
        disabled={saving || (primary === props.p && isDark === props.d)}
        text={saving ? 'Saving...' : 'Save Theme Choices'}
      />
      <h4>Preview</h4>
      <div css={[{ width: 200, height: 200 }, colorTheme(primary, isDark)]}>
        <GridView
          squareWidth={200}
          grid={dummyGrid}
          active={{ row: 2, col: 2, dir: Direction.Across }}
          dispatch={() => {
            /* noop */
          }}
        />
      </div>
    </>
  );
};
